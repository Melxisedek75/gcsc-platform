import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { build } = requireWeb('esbuild');
const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// Exercise actual client modules; only storage and the native wallet boundary are
// stubbed. No native SDK, credentials, device or network is used by this harness.
async function client(entry, value) {
  const result = await build({
    absWorkingDir: root, entryPoints: [entry], bundle: true, write: false,
    format: 'cjs', platform: 'neutral', logLevel: 'silent',
    define: {
      'import.meta.env.VITE_API_URL': value === undefined ? 'undefined' : JSON.stringify(value),
      'process.env.EXPO_PUBLIC_API_BASE_URL': value === undefined ? 'undefined' : JSON.stringify(value),
    },
    plugins: [{ name: 'offline-native-boundaries', setup(builder) {
      builder.onResolve({ filter: /^\.\/(storage|webauth)$/ }, args => ({ path: args.path, namespace: 'offline' }));
      builder.onLoad({ filter: /.*/, namespace: 'offline' }, args => ({
        contents: args.path === './storage'
          ? 'export const safeStorage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };'
          : 'export const signTransfer = async () => { globalThis.signCalls++; throw new Error("unexpected signature"); };',
      }));
    } }],
  });
  const context = vm.createContext({
    module: { exports: {} }, exports: {}, URL, setTimeout, clearTimeout, signCalls: 0, calls: [],
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    fetch: async (url, options) => {
      context.calls.push({ url, options });
      return { ok: true, status: 200, json: async () => ({}), text: async () => '{}' };
    },
  });
  vm.runInContext(result.outputFiles[0].text, context);
  context.exports = context.module.exports;
  return context;
}

test('web: HTTP failures expose status without clearing stored authentication', async () => {
  let cleared = false;
  const configured = await client('apps/web/src/services/api.ts', 'http://127.0.0.1:3001');
  configured.exports.api.setToken('fixture-token');
  assert.equal(configured.exports.api.getToken(), 'fixture-token');
  configured.localStorage.removeItem = () => { cleared = true; };
  for (const status of [401, 403, 500]) {
    configured.fetch = async (_url, options) => {
      assert.equal(options.headers.Authorization, `Bearer ${configured.exports.api.getToken()}`);
      return { ok: false, status, json: async () => ({ error: 'fixture failure' }) };
    };
    await assert.rejects(configured.exports.api.getProfile(), error =>
      error instanceof configured.exports.ApiError && error.status === status && error.message === 'fixture failure');
  }
  assert.equal(cleared, false);
});

test('web: missing API config imports safely and rejects before fetch', async () => {
  const c = await client('apps/web/src/services/api.ts');
  await assert.rejects(c.exports.api.login({ email: 'test@example.invalid', password: 'fixture' }), { code: 'API_CONFIGURATION' });
  assert.equal(c.calls.length, 0);
});

test('mobile: missing API config imports safely and rejects before fetch', async () => {
  const c = await client('apps/mobile/lib/api.ts');
  await assert.rejects(c.exports.apiRequest('/api/auth/profile'), { code: 'API_CONFIGURATION' });
  assert.equal(c.calls.length, 0);
});

test('mobile: payment config can render without env and payment fails before fetch/sign', async () => {
  const c = await client('apps/mobile/lib/payments.ts');
  const stages = [];
  const receipt = await c.exports.requestPayment({
    mode: 'charge', amount: '50.0000 XPR', recipient: 'testfixture',
    endpoint: c.exports.PAYMENT_CONFIG.LEAD_TOKEN_ENDPOINT,
  }, p => stages.push(p.stage));
  assert.equal(receipt.ok, false);
  assert.match(receipt.error, /EXPO_PUBLIC_API_BASE_URL/);
  assert.equal(stages.at(-1), 'failed');
  assert.equal(c.calls.length, 0);
  assert.equal(c.signCalls, 0);
});

for (const base of ['http://127.0.0.1:3001', 'http://127.0.0.1:3001/', 'http://127.0.0.1:3001/api/']) {
  test(`web/native use the same origin and exactly one /api: ${base}`, async () => {
    const web = await client('apps/web/src/services/api.ts', base);
    const mobile = await client('apps/mobile/lib/api.ts', base);
    await web.exports.api.getProfile();
    await mobile.exports.apiRequest('/api/auth/profile');
    assert.equal(web.calls[0].url, 'http://127.0.0.1:3001/api/auth/profile');
    assert.equal(mobile.calls[0].url, web.calls[0].url);
  });
}

test('invalid config cannot forward a stored web token', async () => {
  const c = await client('apps/web/src/services/api.ts', 'https://user:password@example.invalid');
  c.exports.api.setToken('offline-fixture-token');
  await assert.rejects(c.exports.api.getProfile(), { code: 'API_CONFIGURATION' });
  assert.equal(c.calls.length, 0);
});

test('mobile API has no import dependency on payments or WebAuth', () => {
  assert.doesNotMatch(read('apps/mobile/lib/api.ts'), /from ['"]\.\/(payments|webauth)['"]/);
});

test('configured mobile payment uses the same normalized API as authentication', async () => {
  const c = await client('apps/mobile/lib/payments.ts', 'http://127.0.0.1:3001/api/');
  await c.exports.requestPayment({
    mode: 'charge', amount: '50.0000 XPR', recipient: 'testfixture',
    endpoint: c.exports.PAYMENT_CONFIG.LEAD_TOKEN_ENDPOINT,
  }, () => {});
  assert.equal(c.calls.length, 1);
  assert.equal(c.calls[0].url, 'http://127.0.0.1:3001/api/payment/lead-token');
  assert.equal(c.signCalls, 0);
});

test('mobile token cannot be sent to an arbitrary absolute payment endpoint', async () => {
  const c = await client('apps/mobile/lib/payments.ts', 'http://127.0.0.1:3001');
  const receipt = await c.exports.requestPayment({
    mode: 'charge', amount: '50.0000 XPR', recipient: 'testfixture',
    endpoint: 'https://elsewhere.example.invalid/api/payment/lead-token',
  }, () => {});
  assert.equal(receipt.ok, false);
  assert.equal(c.calls.length, 0);
  assert.equal(c.signCalls, 0);
});

test('Metro preserves defaults and makes the pure shared package visible', () => {
  const path = requireWeb('node:path');
  const mobileRoot = path.join(root, 'apps/mobile');
  const context = vm.createContext({
    __dirname: mobileRoot, module: { exports: {} },
    require: id => {
      if (id === 'path') return path;
      assert.equal(id, 'expo/metro-config');
      return { getDefaultConfig: projectRoot => {
        assert.equal(projectRoot, mobileRoot);
        return { watchFolders: ['existing'], resolver: { sourceExts: ['js', 'ts'] } };
      } };
    },
  });
  vm.runInContext(read('apps/mobile/metro.config.js'), context);
  const config = context.module.exports;
  assert.deepEqual([...config.watchFolders], ['existing', path.join(root, 'packages')]);
  assert.deepEqual([...config.resolver.sourceExts], ['js', 'ts', 'mjs']);
});

test('Expo API env uses statically inlineable direct dot notation', () => {
  const source = read('apps/mobile/lib/api-config.ts');
  assert.match(source, /process\.env\.EXPO_PUBLIC_API_BASE_URL/);
  assert.doesNotMatch(source, /process\.env\?\.|process\.env\[/);
});

test('EAS profiles do not preselect a remote application backend', () => {
  const eas = JSON.parse(read('apps/mobile/eas.json'));
  for (const [name, profile] of Object.entries(eas.build)) {
    assert.equal(profile.env?.EXPO_PUBLIC_API_BASE_URL, undefined, name);
  }
});

test('shared origin contract handles supported URLs and rejects unsafe inputs', async () => {
  const moduleUrl = new URL('../packages/api-config/index.mjs', import.meta.url);
  assert(fs.existsSync(moduleUrl), 'shared API origin resolver must exist');
  const { resolveApiOrigin, resolveApiUrl } = await import(moduleUrl.href);
  const valid = [
    [' http://localhost:3001/ ', 'http://localhost:3001'],
    ['http://127.0.0.1:3001', 'http://127.0.0.1:3001'],
    ['http://[::1]:3001/api', 'http://[::1]:3001'],
    ['http://10.0.2.2:3001/api/', 'http://10.0.2.2:3001'],
    ['http://192.168.1.12:3001', 'http://192.168.1.12:3001'],
    ['http://172.16.0.1:3001', 'http://172.16.0.1:3001'],
    ['https://preview.example.invalid/api', 'https://preview.example.invalid'],
  ];
  for (const [input, output] of valid) assert.equal(resolveApiOrigin(input, 'TEST_URL'), output);
  for (const value of [undefined, '', ' ', '/api', '//example.invalid', 'not-a-url',
    'ftp://example.invalid', 'https://user:pass@example.invalid', 'https://example.invalid?token=secret',
    'https://example.invalid#fragment', 'https://example.invalid/other',
    'http://example.invalid', 'http://127.0.0.1.example.invalid', 'http://172.32.0.1',
    'https:example.invalid', 'https://example.invalid\\api', 'https://exa\nmple.invalid']) {
    assert.throws(() => resolveApiOrigin(value, 'TEST_URL'), err => err.code === 'API_CONFIGURATION' && !err.message.includes('secret'));
  }
  assert.equal(resolveApiUrl('http://localhost:3001/api', '/api/auth/login', 'TEST_URL'), 'http://localhost:3001/api/auth/login');
  for (const path of ['https://elsewhere.invalid/api', '//elsewhere.invalid', '/api/../auth', '/api\\auth']) {
    assert.throws(() => resolveApiUrl('http://localhost:3001', path, 'TEST_URL'), { code: 'API_CONFIGURATION' });
  }
});
