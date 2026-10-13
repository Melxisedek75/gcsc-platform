import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

for (const nodeEnv of ['production', 'staging', 'development', undefined]) {
  test(`API refuses JSON account storage with NODE_ENV=${nodeEnv ?? 'unset'}`, () => {
    const env = { ...process.env,
      JWT_SECRET: 'local-test-signing-secret-not-for-production-123456',
      ADMIN_BOOTSTRAP_ENABLED: 'false',
    };
    delete env.DATABASE_URL;
    delete env.GCSC_ALLOW_LOCAL_JSON_DB;
    if (nodeEnv) env.NODE_ENV = nodeEnv;
    else delete env.NODE_ENV;
    const result = spawnSync(process.execPath, ['-e', "require('./services/api/v3/pure-server.js')"], {
      cwd: new URL('../', import.meta.url),
      env,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /DATABASE_URL.*required/i);
  });
}

test('local JSON storage requires an explicit development opt-in', () => {
  const env = { ...process.env,
    NODE_ENV: 'development',
    JWT_SECRET: 'local-test-signing-secret-not-for-production-123456',
    ADMIN_BOOTSTRAP_ENABLED: 'false',
    GCSC_ALLOW_LOCAL_JSON_DB: 'true',
  };
  delete env.DATABASE_URL;
  const result = spawnSync(process.execPath, ['-e', "require('./services/api/v3/pure-server.js')"], {
    cwd: new URL('../', import.meta.url),
    env,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
});
