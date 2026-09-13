import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const core = path.join(root, 'contracts/gcsc-core');
const helperPath = path.join(core, 'test/harness.cjs');
const require = createRequire(import.meta.url);
const helper = () => {
  assert.ok(fs.existsSync(helperPath), 'local contract harness must exist');
  return require(helperPath);
};
const suites = fs.readdirSync(path.join(core, 'test')).filter(f => f.endsWith('.test.ts'));

test('all five suites use the local harness without npx or recursive deletion', () => {
  assert.equal(suites.length, 5);
  for (const file of suites) {
    const source = fs.readFileSync(path.join(core, 'test', file), 'utf8');
    assert.doesNotMatch(source, /npx|cmd\.exe|rmSync|cleanGenerated/, file);
    assert.match(source, /require\("\.\/harness\.cjs"\)/, file);
    assert.match(source, /export \{\}/, 'suite declarations must be module-local');
  }
});

test('test entrypoints route through the guarded runner', () => {
  const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(read(path.join(root, 'package.json')).scripts['test:contracts'], 'node scripts/run-contract-tests.mjs');
  assert.equal(read(path.join(core, 'package.json')).scripts.test, 'node ../../scripts/run-contract-tests.mjs');
});

test('scratch directories are unique and preserve previous artifacts', () => {
  const h = helper();
  const first = h.createScratchDirectory(core, 'runner');
  fs.writeFileSync(path.join(first, 'sentinel.txt'), 'keep');
  const second = h.createScratchDirectory(core, 'runner');
  assert.notEqual(first, second);
  assert.equal(fs.readFileSync(path.join(first, 'sentinel.txt'), 'utf8'), 'keep');
  assert.ok(first.startsWith(path.join(core, '.tmp') + path.sep));
  assert.throws(() => h.createScratchDirectory(core, '../escape'), /suite/i);
});

test('child environment excludes secrets, endpoints and runtime injection', () => {
  const env = helper().localEnvironment({Path: 'local-bin', SystemRoot: 'C:/Windows',
    JWT_SECRET: 'canary', API_URL: 'https://example.invalid', NODE_OPTIONS: '--inspect',
    NODE_PATH: 'outside', TS_NODE_TRANSPILE_ONLY: '1', HTTP_PROXY: 'http://example.invalid'});
  assert.equal(env.Path, 'local-bin');
  for (const key of ['JWT_SECRET', 'API_URL', 'NODE_OPTIONS', 'NODE_PATH', 'HTTP_PROXY', 'TS_NODE_TRANSPILE_ONLY']) {
    assert.equal(env[key], undefined, key);
  }
  assert.equal(env.NODE_ENV, 'test');
});

test('missing local dependencies fail closed without global fallback', () => {
  const h = helper();
  const emptyCore = h.createScratchDirectory(core, 'missing');
  assert.throws(() => h.localBinary(emptyCore, 'proton-tsc', 'proton-asc'), /local dependency/i);
});

test('compiler receives a single space-containing path, without a shell', () => {
  const h = helper();
  const scratch = h.createScratchDirectory(core, 'spaces');
  const source = path.join(scratch, 'with spaces.contract.ts');
  fs.writeFileSync(source, '// fixture');
  const invocation = h.compilerInvocation(core, source);
  assert.equal(invocation.command, process.execPath);
  assert.ok(invocation.args.includes(source));
  assert.equal(invocation.options.shell, false);
  assert.equal(invocation.options.windowsHide, true);
  assert.ok(invocation.options.timeout > 0);
  assert.throws(() => h.compilerInvocation(core, path.join(core, 'gcsctoken111.contract.ts')), /scratch/i);
});

test('escrow preparation budgets both bounded compilations without changing test deadlines', () => {
  const h = helper();
  const requireCore = createRequire(path.join(core, 'package.json'));
  const ts = requireCore('typescript');
  const file = path.join(core, 'test/gcscrow1111.test.ts');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const hooks = [];
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'before') {
      hooks.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(hooks.length, 1);
  const compilerTimeout = h.compilerInvocation(core, path.join(core, '.tmp/budget.contract.ts')).options.timeout;
  assert.equal(compilerTimeout, 120000, 'individual compiler limit stays unchanged');
  let hookTimeout = 120000;
  let builds = 0;
  const hook = vm.runInNewContext(`(${hooks[0].getText(source)})`, {
    COMPILER_TIMEOUT_MS: h.COMPILER_TIMEOUT_MS,
    buildArtifacts() { builds++; },
  });
  hook.call({ timeout(value) { hookTimeout = value; } });
  assert.equal(builds, 1, 'artifact preparation still executes');
  assert.equal(hookTimeout, 2 * compilerTimeout + 30000);
  assert.match(source.text, /this\.timeout\(120000\)/, 'suite test deadline stays unchanged');
});

test('network preloader blocks fetch, TCP, TLS and UDP', () => {
  const guard = path.join(core, 'test/offline.cjs');
  assert.ok(fs.existsSync(guard), 'offline preloader must exist');
  const probe = `const assert=require('node:assert/strict');
    for(const fn of [()=>fetch('https://example.invalid'),
      ()=>require('node:net').connect(1,'127.0.0.1'),
      ()=>require('node:tls').connect(443,'example.invalid'),
      ()=>require('node:dgram').createSocket('udp4').send('x',1,'127.0.0.1')])
      assert.throws(fn,/Network disabled/);`;
  const r = spawnSync(process.execPath, ['--require', guard, '-e', probe], {
    env: helper().localEnvironment(), encoding: 'utf8', windowsHide: true, timeout: 10000,
  });
  assert.equal(r.status, 0, r.stderr);
});

test('compiler registration leaves JavaScript dependencies on the native loader', () => {
  const probe = `const assert=require('node:assert/strict');
    require(${JSON.stringify(path.join(core, 'test/compiler-register.cjs'))});
    const service=process[Symbol.for('ts-node.register.instance')];
    assert.equal(service.ignored(require.resolve('binaryen')), true);
    assert.equal(service.ignored(require.resolve('proton-asc')), false);
    assert.equal(typeof require.extensions['.ts'], 'function');`;
  const r = spawnSync(process.execPath, ['--no-experimental-strip-types', '-e', probe], {
    cwd: core, env: helper().localEnvironment(), encoding: 'utf8',
    windowsHide: true, timeout: 10000,
  });
  assert.equal(r.status, 0, r.stderr);
});
