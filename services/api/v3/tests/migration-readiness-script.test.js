const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const v3Root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(v3Root, 'package.json'), 'utf8'));
assert.equal(pkg.scripts['db:migrations:check'], 'node scripts/check-migration-readiness.mjs');
assert.equal(pkg.scripts['test:migration-readiness-script'], 'node tests/migration-readiness-script.test.js');
assert.equal(pkg.scripts['db:migrate'], 'node scripts/migrate-postgres.mjs');

const result = spawnSync(process.execPath, [path.join(v3Root, 'scripts/check-migration-readiness.mjs')], {
  cwd: v3Root, encoding: 'utf8', windowsHide: true, timeout: 10000,
});
const output = result.stdout + result.stderr;
assert.equal(result.status, 0, output);
assert.match(output, /migration readiness ready/);
assert.match(output, /schema-statements\.cjs/);
assert.match(output, /Production readiness is NOT established/);
assert.match(output, /do not run the old v2\/Express sequence/);
assert.doesNotMatch(output, /postgres(?:ql)?:\/\/|PASSWORD=|DATABASE_URL=/i);
console.log('migration readiness script validation passed (static only)');
