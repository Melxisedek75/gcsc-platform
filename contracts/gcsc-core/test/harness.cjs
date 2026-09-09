const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function localEnvironment(source = process.env) {
  const allowed = /^(path|systemroot|windir|temp|tmp|home|userprofile|comspec|pathext)$/i;
  return { ...Object.fromEntries(Object.entries(source).filter(([key]) => allowed.test(key))), NODE_ENV: 'test' };
}
function createScratchDirectory(core, suite) {
  if (!/^[a-z0-9-]+$/i.test(suite)) throw new Error('Invalid suite name');
  const base = path.join(core, '.tmp');
  fs.mkdirSync(base, { recursive: true });
  return fs.mkdtempSync(path.join(base, suite + '-'));
}
function localBinary(core, pkg, name) {
  const base = path.join(core, 'node_modules', pkg);
  const manifest = path.join(base, 'package.json');
  if (!fs.existsSync(manifest)) throw new Error('Missing local dependency: ' + pkg);
  const bin = JSON.parse(fs.readFileSync(manifest, 'utf8')).bin;
  const file = typeof bin === 'string' ? bin : bin?.[name];
  if (!file) throw new Error('Missing local dependency binary: ' + name);
  const resolved = path.resolve(base, file);
  if (!fs.existsSync(resolved)) throw new Error('Missing local dependency binary: ' + resolved);
  return resolved;
}
function compilerInvocation(core, source) {
  const scratch = path.resolve(core, '.tmp') + path.sep;
  if (!path.resolve(source).startsWith(scratch)) throw new Error('Compiler source must be in scratch directory');
  return { command: process.execPath,
    args: ['--no-experimental-strip-types', '--require', path.join(core, 'test/offline.cjs'), '--require', path.join(core, 'test/compiler-register.cjs'), localBinary(core, 'proton-asc', 'proton-asc'), source],
    options: { cwd: core, env: localEnvironment(), shell: false, windowsHide: true, timeout: 120000, stdio: 'pipe', maxBuffer: 16 * 1024 * 1024 } };
}
function runProtonAsc(source) {
  const invocation = compilerInvocation(path.resolve(__dirname, '..'), source);
  try { execFileSync(invocation.command, invocation.args, invocation.options); }
  catch (error) { throw new Error('Contract compilation failed: ' + source + '\n' + (error.stdout || '') + '\n' + (error.stderr || ''), { cause: error }); }
}
module.exports = { localEnvironment, createScratchDirectory, localBinary, compilerInvocation, runProtonAsc };
