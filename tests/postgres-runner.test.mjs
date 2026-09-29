import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { parseRunnerArgs, testEnvironment } from '../scripts/run-postgres-baseline.mjs';

test('PostgreSQL runner keeps baseline default and accepts only the scoped publication suite', () => {
  const args = ['--postgres-bin', path.resolve('local/postgres/bin')];
  assert.deepEqual(parseRunnerArgs(args), { binaryDir: args[1], suite: 'baseline' });
  assert.deepEqual(parseRunnerArgs([...args, '--project-publication']),
    { binaryDir: args[1], suite: 'project-publication' });
  assert.throws(() => parseRunnerArgs([...args, '--unknown']));
  assert.throws(() => parseRunnerArgs([...args, '--project-publication', '--extra']));
  assert.throws(() => parseRunnerArgs(['--postgres-bin', 'relative/bin', '--project-publication']));
});

test('PostgreSQL runner strips ambient providers, DB overrides and Node injection', () => {
  const url = 'postgres://127.0.0.1:55432/gcsc_test_baseline';
  const env = testEnvironment({ Path: '/bin', SystemRoot: 'C:/Windows',
    DATABASE_URL: 'postgres://remote/production', PGHOST: 'remote', PGSERVICE: 'production',
    PGPASSWORD: 'ambient', NODE_OPTIONS: '--require=external.cjs', STRIPE_SECRET_KEY: 'ambient',
    TWILIO_AUTH_TOKEN: 'ambient', XPR_TX_VERIFIER_ENABLED: 'true', SETTLEMENT_ENABLED: 'true',
  }, url, '/local/fixture');
  assert.equal(env.Path, '/bin');
  assert.equal(env.DATABASE_URL, url);
  assert.equal(env.PGSSL, 'false');
  assert.equal(env.SETTLEMENT_ENABLED, 'false');
  assert.equal(env.XPR_TX_VERIFIER_ENABLED, 'false');
  for (const key of ['PGHOST', 'PGSERVICE', 'PGPASSWORD', 'NODE_OPTIONS', 'STRIPE_SECRET_KEY', 'TWILIO_AUTH_TOKEN']) {
    assert.equal(Object.hasOwn(env, key), false, key);
  }
});

test('PostgreSQL runner rejects existing and remote database targets', () => {
  for (const url of ['postgres://127.0.0.1/production', 'postgres://remote/gcsc_test_baseline',
    'postgres://127.0.0.1/gcsc_test_baseline?host=remote']) {
    assert.throws(() => testEnvironment({}, url, '/local/fixture'));
  }
});
