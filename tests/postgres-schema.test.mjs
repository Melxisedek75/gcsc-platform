import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { migrateSchema, renderSchemaSql, migrationStatements, schemaDigest } from '../services/api/v3/database/migrate-schema.cjs';

function fakePool(failAt, rollbackFails = false) {
  const log = [];
  const failure = new Error('fixture failure');
  let released;
  return {
    log, failure, get released() { return released; },
    async connect() {
      return {
        async query(sql) {
          log.push(sql);
          if (sql === failAt || (rollbackFails && sql === 'ROLLBACK')) throw failure;
          return { rows: [] };
        },
        release(error) { released = error || 'released'; },
      };
    },
  };
}

test('migration uses one connection, one transaction and a lock before DDL', async () => {
  const pool = fakePool();
  assert.deepEqual(await migrateSchema(pool), { schemaDigest, statementCount: migrationStatements.length });
  assert.deepEqual(pool.log, ['BEGIN', ...migrationStatements, 'COMMIT']);
  assert.match(migrationStatements[2], /pg_advisory_xact_lock/);
  assert.equal(pool.released, 'released');
});

test('SQL export is exactly the runtime transaction including preflight and locking', () => {
  const body = ['BEGIN', ...migrationStatements, 'COMMIT'].map(sql => `${sql};`).join('\n\n');
  assert.ok(renderSchemaSql().endsWith(body + '\n'));
  assert.match(renderSchemaSql(), new RegExp(schemaDigest));
  assert.ok(Object.isFrozen(migrationStatements));
  const drop = migrationStatements.findIndex(sql => sql.startsWith('ALTER TABLE milestone_chain_txs DROP CONSTRAINT'));
  const update = migrationStatements.findIndex(sql => sql.startsWith('UPDATE milestone_chain_txs'));
  const add = migrationStatements.findIndex(sql => sql.includes('ADD CONSTRAINT milestone_chain_txs_action_check'));
  assert.ok(drop >= 0 && drop < update && update < add);
});

test('failed DDL rolls back, never commits and releases the failed connection', async () => {
  const pool = fakePool(migrationStatements[5]);
  await assert.rejects(migrateSchema(pool), error => error === pool.failure);
  assert.equal(pool.log.at(-1), 'ROLLBACK');
  assert.ok(!pool.log.includes('COMMIT'));
  assert.equal(pool.released, pool.failure);
});

test('a failed rollback preserves the original error and discards the connection', async () => {
  const pool = fakePool(migrationStatements[5], true);
  await assert.rejects(migrateSchema(pool), error => error === pool.failure);
  assert.equal(pool.released, pool.failure);
});

test('CLI refuses implicit execution and exports without connecting or exposing ambient secrets', () => {
  const script = fileURLToPath(new URL('../services/api/v3/scripts/migrate-postgres.mjs', import.meta.url));
  const env = { ...process.env, DATABASE_URL: 'postgres://must-not-connect:sentinel-password@remote.invalid/live' };
  for (const args of [[], ['--apply'], ['--print-sql', '--apply']]) {
    const result = spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8', windowsHide: true, timeout: 10000 });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /No database was changed/);
    assert.doesNotMatch(result.stdout + result.stderr, /sentinel-password|remote\.invalid/);
  }
  const result = spawnSync(process.execPath, [script, '--print-sql'], { env, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, renderSchemaSql());
  assert.doesNotMatch(result.stdout + result.stderr, /sentinel-password|remote\.invalid/);
});
