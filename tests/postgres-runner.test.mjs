import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { main, parseRunnerArgs, testEnvironment } from '../scripts/run-postgres-baseline.mjs';
import { resolveSourceRoot, captureProjectSources, readProjectManifest,
  readSelectedFile, copyApiSnapshot } from './postgres-project-sources.cjs';

test('PostgreSQL runner keeps baseline default and accepts only the scoped publication suite', () => {
  const args = ['--postgres-bin', path.resolve('local/postgres/bin')];
  assert.deepEqual(parseRunnerArgs(args), { binaryDir: args[1], suite: 'baseline' });
  assert.deepEqual(parseRunnerArgs([...args, '--project-publication']),
    { binaryDir: args[1], suite: 'project-publication' });
  assert.throws(() => parseRunnerArgs([...args, '--unknown']));
  assert.throws(() => parseRunnerArgs([...args, '--project-publication', '--extra']));
  assert.throws(() => parseRunnerArgs(['--postgres-bin', 'relative/bin', '--project-publication']));
});

test('browser suite requires explicit installed Playwright path and cannot combine suites', () => {
  const binaryDir = path.resolve('local/postgres/bin');
  const playwrightDir = path.resolve('local/node_modules');
  const args = ['--postgres-bin', binaryDir, '--project-browser', '--playwright-dir', playwrightDir];
  assert.deepEqual(parseRunnerArgs(args), { binaryDir, suite: 'project-browser', playwrightDir });
  for (const invalid of [[], args.slice(0, 3), [...args, '--project-publication'],
    [...args.slice(0, 4), 'relative/node_modules'], [...args.slice(0, 3), '--database-url', playwrightDir]]) {
    assert.throws(() => parseRunnerArgs(invalid));
  }
});

test('lead checkout suite requires explicit receiving API and rejects other suite options', () => {
  const binaryDir = path.resolve('local/postgres/bin');
  const apiRoot = path.resolve('local/receiver/services/api/v3');
  const args = ['--postgres-bin', binaryDir, '--lead-checkout', '--api-root', apiRoot];
  assert.deepEqual(parseRunnerArgs(args), { binaryDir, suite: 'lead-checkout', apiRoot });
  for (const invalid of [args.slice(0, 3), [...args, '--project-publication'],
    [...args, '--web-root', apiRoot], [...args, '--playwright-dir', apiRoot]]) {
    assert.throws(() => parseRunnerArgs(invalid));
  }
});

test('project source options are explicit, unambiguous and scoped to their suite', () => {
  const binaryDir = path.resolve('local/postgres/bin');
  const apiRoot = path.resolve('local/receiver/services/api/v3');
  const webRoot = path.resolve('local/receiver/apps/web');
  const playwrightDir = path.resolve('local/node_modules');
  const base = ['--postgres-bin', binaryDir];
  assert.deepEqual(parseRunnerArgs([...base, '--api-root', apiRoot, '--project-publication']),
    { binaryDir, suite: 'project-publication', apiRoot });
  assert.deepEqual(parseRunnerArgs([...base, '--project-browser', '--web-root', webRoot,
    '--api-root', apiRoot, '--playwright-dir', playwrightDir]),
  { binaryDir, suite: 'project-browser', webRoot, apiRoot, playwrightDir });
  for (const tail of [['--api-root', apiRoot], ['--project-publication', '--web-root', webRoot],
    ['--project-publication', '--api-root'], ['--project-publication', '--api-root', 'relative'],
    ['--project-publication', '--api-root', apiRoot, '--api-root', apiRoot],
    ['--project-publication', '--project-publication'], ['--project-publication', '--api-root', '//server/share'],
    ['--project-publication', '--api-root', 'file:///C:/receiver'],
    ['--project-browser', '--api-root', apiRoot]]) {
    assert.throws(() => parseRunnerArgs([...base, ...tail]));
  }
});

test('PostgreSQL runner strips ambient providers, DB overrides and Node injection', () => {
  const url = 'postgres://127.0.0.1:55432/gcsc_test_baseline';
  const env = testEnvironment({ Path: '/bin', SystemRoot: 'C:/Windows',
    DATABASE_URL: 'postgres://remote/production', PGHOST: 'remote', PGSERVICE: 'production',
    PGPASSWORD: 'ambient', NODE_OPTIONS: '--require=external.cjs', STRIPE_SECRET_KEY: 'ambient',
    TWILIO_AUTH_TOKEN: 'ambient', XPR_TX_VERIFIER_ENABLED: 'true', SETTLEMENT_ENABLED: 'true',
    GCSC_PLAYWRIGHT_DIR: 'ambient', GCSC_API_SOURCE: 'ambient', CORS_ALLOWED_ORIGINS: 'https://ambient.invalid',
    GCSC_PROJECT_MANIFEST_SHA256: 'ambient', GCSC_WEB_ROOT: 'ambient', GCSC_API_ROOT: 'ambient',
  }, url, '/local/fixture');
  assert.equal(env.Path, '/bin');
  assert.equal(env.DATABASE_URL, url);
  assert.equal(env.PGSSL, 'false');
  assert.equal(env.SETTLEMENT_ENABLED, 'false');
  assert.equal(env.XPR_TX_VERIFIER_ENABLED, 'false');
  for (const key of ['PGHOST', 'PGSERVICE', 'PGPASSWORD', 'NODE_OPTIONS', 'STRIPE_SECRET_KEY', 'TWILIO_AUTH_TOKEN',
    'GCSC_PLAYWRIGHT_DIR', 'GCSC_API_SOURCE', 'CORS_ALLOWED_ORIGINS',
    'GCSC_PROJECT_MANIFEST_SHA256', 'GCSC_WEB_ROOT', 'GCSC_API_ROOT']) {
    assert.equal(Object.hasOwn(env, key), false, key);
  }
});

test('PostgreSQL runner rejects existing and remote database targets', () => {
  for (const url of ['postgres://127.0.0.1/production', 'postgres://remote/gcsc_test_baseline',
    'postgres://127.0.0.1/gcsc_test_baseline?host=remote']) {
    assert.throws(() => testEnvironment({}, url, '/local/fixture'));
  }
});

function sourceFixture({ database = true } = {}) {
  const temporary = fileURLToPath(new URL('./.tmp/', import.meta.url));
  fs.mkdirSync(temporary, { recursive: true });
  assert.equal(fs.realpathSync(temporary).toLowerCase(), path.resolve(temporary).toLowerCase());
  const directory = fs.mkdtempSync(path.join(temporary, 'postgres-source-guards-'));
  const boundary = path.join(directory, '.worktrees');
  const checkout = path.join(boundary, 'receiver');
  const apiRoot = path.join(checkout, 'services/api/v3');
  const webRoot = path.join(checkout, 'apps/web');
  const write = (root, file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text, { flag: 'wx' });
  };
  write(apiRoot, 'pure-server.js', "module.exports.initStorage = () => require('./database/migrate-schema.cjs').migrateSchema();");
  for (const name of ['wallet-ownership-proof.cjs', 'wallet-challenge-store.cjs']) write(apiRoot, name, 'module.exports = {};');
  if (database) {
    write(apiRoot, 'database/migrate-schema.cjs', "const {value} = require('./schema-statements.cjs'); module.exports.migrateSchema = () => value;");
    write(apiRoot, 'database/schema-statements.cjs', "module.exports.value = 'synthetic-offline-migration';");
    write(apiRoot, 'database/unrelated.sql', 'not part of the module snapshot');
  }
  write(webRoot, 'src/pages/dashboard/ProjectsPanel.tsx', 'export const fixturePanel = true;');
  write(webRoot, 'src/services/api.ts', 'export const fixtureClient = true;');
  return { directory, boundary, checkout, apiRoot, webRoot,
    capture: () => captureProjectSources({ apiRoot, webRoot, apiExplicit: true, webExplicit: true }, boundary, [checkout]) };
}

test('source guard accepts only canonical registered sibling component roots', () => {
  const f = sourceFixture();
  assert.equal(resolveSourceRoot(f.apiRoot, 'api', f.boundary, [f.checkout]), fs.realpathSync(f.apiRoot));
  assert.equal(resolveSourceRoot(f.webRoot, 'web', f.boundary, [f.checkout]), fs.realpathSync(f.webRoot));
  assert.throws(() => resolveSourceRoot(f.apiRoot, 'api', f.boundary, []), /registered sibling/);
  for (const root of [f.checkout, path.dirname(f.apiRoot), path.join(f.apiRoot, 'pure-server.js'),
    path.join(f.boundary + '-escape', 'receiver/services/api/v3'),
    path.join(f.boundary, 'unregistered/services/api/v3'), '//server/share', '\\\\?\\C:\\outside']) {
    assert.throws(() => resolveSourceRoot(root, 'api', f.boundary, [f.checkout]));
  }
});

test('source guard rejects junctions for worktrees and database modules', () => {
  const f = sourceFixture({ database: false });
  const alias = path.join(f.boundary, 'alias');
  fs.symlinkSync(f.checkout, alias, 'junction');
  assert.throws(() => resolveSourceRoot(path.join(alias, 'services/api/v3'), 'api', f.boundary, [alias]), /links/);
  const outside = path.join(f.directory, 'outside-database');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(f.apiRoot, 'database'), 'junction');
  assert.throws(f.capture, /links/);
});

test('API snapshot copies and hashes canonical migration modules without executing selected application code', () => {
  const f = sourceFixture();
  const selected = f.capture();
  assert.equal(selected.api.root, fs.realpathSync(f.apiRoot));
  assert.equal(selected.web.root, fs.realpathSync(f.webRoot));
  assert.equal(Object.keys(selected.api.files).length, 5);
  const run = path.join(f.directory, 'snapshot');
  fs.mkdirSync(run);
  const appFile = copyApiSnapshot(selected, run);
  const copied = JSON.parse(fs.readFileSync(path.join(run, 'api-files.sha256.json')));
  assert.equal(copied['database/migrate-schema.cjs'], selected.api.files['database/migrate-schema.cjs']);
  assert.equal(copied['database/schema-statements.cjs'], selected.api.files['database/schema-statements.cjs']);
  assert.equal(copied['pure-server.cjs'], selected.api.files['pure-server.js']);
  assert.equal(fs.existsSync(path.join(run, 'api/database/unrelated.sql')), false);
  // Only this test's generated constant-returning fixture is executed, never a real API or SQL.
  assert.equal(createRequire(import.meta.url)(appFile).initStorage(), 'synthetic-offline-migration');
  assert.throws(() => copyApiSnapshot(selected, run), /EEXIST/);
  assert.equal(Object.keys(sourceFixture({ database: false }).capture().api.files).length, 3);
});

test('source digest and manifest drift fail before snapshot execution', () => {
  const f = sourceFixture();
  const selected = f.capture();
  const run = path.join(f.directory, 'snapshot');
  fs.mkdirSync(run);
  const manifest = JSON.stringify(selected);
  const manifestFile = path.join(run, 'project-sources.json');
  fs.writeFileSync(manifestFile, manifest);
  const env = { GCSC_API_ROOT: selected.api.root, GCSC_WEB_ROOT: selected.web.root,
    GCSC_API_SOURCE: path.join(selected.api.root, 'pure-server.js'),
    GCSC_API_SOURCE_SHA256: selected.api.files['pure-server.js'],
    GCSC_PROJECT_MANIFEST_SHA256: createHash('sha256').update(manifest).digest('hex') };
  assert.deepEqual(readProjectManifest(run, env), selected);
  assert.throws(() => readProjectManifest(run, { ...env, GCSC_API_ROOT: f.directory }));
  fs.appendFileSync(manifestFile, '\n');
  assert.throws(() => readProjectManifest(run, env), /manifest changed/);
  fs.appendFileSync(path.join(f.apiRoot, 'database/schema-statements.cjs'), '\n// changed');
  assert.throws(() => copyApiSnapshot(selected, run), /Selected source changed/);
  assert.equal(fs.existsSync(path.join(run, 'api')), false);
  fs.appendFileSync(path.join(f.webRoot, 'src/services/api.ts'), '\n// changed');
  assert.throws(() => readSelectedFile(selected.web, 'src/services/api.ts'), /Selected source changed/);
});

test('invalid receiving root is rejected before PostgreSQL binaries or fixture creation', { timeout: 15000 }, async () => {
  await assert.rejects(main(['--postgres-bin', path.resolve('nonexistent-postgres-bin'),
    '--project-publication', '--api-root', path.resolve('tests/not-a-worktree/services/api/v3')]), /registered sibling/);
});
