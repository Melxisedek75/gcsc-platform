import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const runner = new URL('../scripts/bundle-mobile-local.mjs', import.meta.url);
async function loadPlan() {
  assert(fs.existsSync(runner), 'guarded local native build command must exist');
  return (await import(runner.href)).createBuildPlan;
}

test('missing or external backend fails before a native build can start', async () => {
  const plan = await loadPlan();
  for (const value of [undefined, '', 'https://example.invalid', 'http://192.168.1.5:10000']) {
    assert.throws(() => plan({ EXPO_PUBLIC_API_BASE_URL: value }), /API|local/i);
  }
});

test('local plan is explicit, one-worker, offline and excludes credential env', async () => {
  const plan = await loadPlan();
  const input = {
    EXPO_PUBLIC_API_BASE_URL: 'http://127.0.0.1:10000/api/', Path: 'fixture-path',
    JWT_SECRET: 'fixture-not-a-secret', EXPO_TOKEN: 'fixture-not-a-token',
    EXPO_NO_CLIENT_ENV_VARS: '1', NODE_OPTIONS: '--require some-file',
    NODE_ENV: 'development', EXPO_OFFLINE: '0',
  };
  const result = plan(input);
  assert.equal(result.env.EXPO_PUBLIC_API_BASE_URL, 'http://127.0.0.1:10000');
  assert.equal(result.env.Path, 'fixture-path');
  for (const key of ['JWT_SECRET', 'EXPO_TOKEN', 'EXPO_NO_CLIENT_ENV_VARS', 'NODE_OPTIONS']) {
    assert.equal(result.env[key], undefined, key);
  }
  for (const key of ['EXPO_OFFLINE', 'EXPO_NO_TELEMETRY', 'EXPO_NO_DOTENV', 'CI']) assert.equal(result.env[key], '1');
  assert.equal(result.env.NODE_ENV, 'production');
  assert.equal(result.args[result.args.indexOf('--max-workers') + 1], '1');
  assert.equal(result.args[result.args.indexOf('--platform') + 1], 'android');
  assert(!result.args.includes('--dev'));
  assert(result.cwd.replaceAll('\\', '/').endsWith('/apps/mobile/'));
  assert.equal(input.EXPO_NO_CLIENT_ENV_VARS, '1', 'caller environment must not be mutated');
});

test('all supported loopback/emulator targets normalize without guessing a host', async () => {
  const plan = await loadPlan();
  for (const host of ['localhost', '127.0.0.1', '[::1]', '10.0.2.2']) {
    const result = plan({ EXPO_PUBLIC_API_BASE_URL: `http://${host}:10000` });
    assert.equal(result.env.EXPO_PUBLIC_API_BASE_URL, `http://${host}:10000`);
  }
});

test('CLI reports missing configuration without starting Metro', () => {
  assert(fs.existsSync(runner), 'guarded local native build command must exist');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(path|systemroot|windir|comspec|temp|tmp|home|userprofile)$/i.test(key)));
  const result = spawnSync(process.execPath, [fileURLToPath(runner)], { env, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXPO_PUBLIC_API_BASE_URL.*missing/);
  assert.doesNotMatch(result.stdout, /Starting Metro|Android Bundled/);
});
