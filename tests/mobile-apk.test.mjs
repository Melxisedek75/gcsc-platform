import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const runner = new URL('../scripts/build-mobile-apk.mjs', import.meta.url);
const load = async () => {
  assert(fs.existsSync(runner), 'standalone APK build runner is required');
  return import(runner.href);
};
const env = {
  EXPO_PUBLIC_API_BASE_URL: 'http://127.0.0.1:10000/api/',
  JAVA_HOME: 'C:/fixture/jdk', ANDROID_HOME: 'C:/fixture/sdk',
  GRADLE_USER_HOME: 'C:/fixture/gradle', Path: 'fixture-path',
};

test('APK preflight rejects missing or remote API before running native tools', async () => {
  const { createApkPlan } = await load();
  for (const value of [undefined, '', 'https://example.invalid', 'http://192.168.1.2:10000']) {
    assert.throws(() => createApkPlan({ ...env, EXPO_PUBLIC_API_BASE_URL: value }), /API|local/i);
  }
});

test('APK plan embeds production JS, uses arm64 and does not inherit secrets', async () => {
  const { createApkPlan } = await load();
  const plan = createApkPlan({ ...env, ANDROID_SDK_ROOT: 'C:/unrelated/sdk', JWT_SECRET: 'fixture', EXPO_TOKEN: 'fixture',
    NODE_OPTIONS: '--require unsafe.js', EXPO_NO_CLIENT_ENV_VARS: '1' });
  assert.equal(plan.env.EXPO_PUBLIC_API_BASE_URL, 'http://127.0.0.1:10000');
  assert.equal(plan.env.NODE_ENV, 'production');
  assert.equal(plan.env.EXPO_NO_DOTENV, '1');
  assert.equal(plan.env.GCSC_LOCAL_ANDROID_BUILD, '1');
  for (const key of ['JWT_SECRET', 'EXPO_TOKEN', 'NODE_OPTIONS', 'EXPO_NO_CLIENT_ENV_VARS']) {
    assert.equal(plan.env[key], undefined);
  }
  assert(plan.prebuildArgs.includes('--no-install'));
  assert(plan.gradleArgs.includes(':app:assembleRelease'));
  assert(plan.gradleArgs.includes('--offline'));
  assert(plan.gradleArgs.includes('--max-workers=1'));
  assert(plan.gradleArgs.includes('-PreactNativeArchitectures=arm64-v8a'));
  assert.equal(plan.env.JAVA_HOME, env.JAVA_HOME);
  assert.equal(plan.env.ANDROID_HOME, env.ANDROID_HOME);
  assert.equal(plan.env.ANDROID_SDK_ROOT, env.ANDROID_HOME);
  assert.equal(plan.env.GRADLE_USER_HOME, env.GRADLE_USER_HOME);
});

test('low disk fails closed before Gradle', async () => {
  const { assertDiskBudget, MIN_FREE_BYTES } = await load();
  assert.throws(() => assertDiskBudget(2.5 * 1024 ** 3), /disk/i);
  assert.throws(() => assertDiskBudget(NaN), /disk/i);
  assert.doesNotThrow(() => assertDiskBudget(MIN_FREE_BYTES));
});

test('Android version can update installed code 4 and USB mode is explicit', () => {
  const require = createRequire(import.meta.url);
  const app = require('../apps/mobile/app.json').expo;
  assert(app.android.versionCode > 4);
  assert.notEqual(app.version, '0.1.2');
  const configFile = new URL('../apps/mobile/app.config.js', import.meta.url);
  assert(fs.existsSync(configFile), 'USB build configuration is required');
  const config = require(fileURLToPath(configFile));
  const previous = process.env.GCSC_LOCAL_ANDROID_BUILD;
  try {
    delete process.env.GCSC_LOCAL_ANDROID_BUILD;
    assert.equal(config({ config: app }).name, 'SmartContractor');
    process.env.GCSC_LOCAL_ANDROID_BUILD = '1';
    const local = config({ config: app });
    assert.equal(local.name, 'SmartContractor USB');
    assert(local.plugins.some(p => Array.isArray(p) && p[1].enabled === true));
  } finally {
    if (previous === undefined) delete process.env.GCSC_LOCAL_ANDROID_BUILD;
    else process.env.GCSC_LOCAL_ANDROID_BUILD = previous;
  }
});

test('USB network policy is scoped, idempotent, and removed from normal builds', async () => {
  let manifestMod;
  let fileMod;
  let written;
  const module = { exports: {} };
  const require = createRequire(import.meta.url);
  vm.runInNewContext(fs.readFileSync(new URL('../apps/mobile/plugins/with-usb-api.cjs', import.meta.url), 'utf8'), {
    module, require(name) {
      if (name === 'expo/config-plugins') return {
        withAndroidManifest(config, fn) { manifestMod = fn; return config; },
        withDangerousMod(config, [, fn]) { fileMod = fn; return config; },
      };
      if (name === 'node:fs/promises') return {
        mkdir: async () => {}, writeFile: async (file, contents) => { written = { file, contents }; },
      };
      return require(name);
    },
  });
  const manifest = { modResults: { manifest: { application: [{ $: {} }] } } };
  module.exports({}, { enabled: true });
  manifestMod(manifest);
  manifestMod(manifest);
  const attributes = manifest.modResults.manifest.application[0].$;
  assert.equal(attributes['android:networkSecurityConfig'], '@xml/gcsc_usb_network_security');
  assert.equal(attributes['android:usesCleartextTraffic'], undefined, 'do not allow all HTTP');
  await fileMod({ modRequest: { platformProjectRoot: 'C:/fixture/android' } });
  assert.match(written.contents, /base-config cleartextTrafficPermitted="false"/);
  assert.deepEqual([...written.contents.matchAll(/<domain>([^<]+)<\/domain>/g)].map(m => m[1]),
    ['localhost', '127.0.0.1', '10.0.2.2', '::1']);
  module.exports({}, { enabled: false });
  manifestMod(manifest);
  assert.equal(attributes['android:networkSecurityConfig'], undefined);
  attributes['android:networkSecurityConfig'] = '@xml/existing_policy';
  manifestMod(manifest);
  assert.equal(attributes['android:networkSecurityConfig'], '@xml/existing_policy');
  module.exports({}, { enabled: true });
  assert.throws(() => manifestMod(manifest), /must be reconciled/);
});
