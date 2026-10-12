import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('production API refuses ephemeral JSON account storage', () => {
  const env = { ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'local-test-signing-secret-not-for-production-123456',
    ADMIN_BOOTSTRAP_ENABLED: 'false',
  };
  delete env.DATABASE_URL;
  const result = spawnSync(process.execPath, ['-e', "require('./services/api/v3/pure-server.js')"], {
    cwd: new URL('../', import.meta.url),
    env,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /DATABASE_URL.*required.*production/i);
});
