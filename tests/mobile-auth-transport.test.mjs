import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function loadApi(fetch, storageOverride) {
  const source = fs.readFileSync(new URL('../apps/mobile/lib/api.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const storage = storageOverride ?? { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, removeItemRequired: async () => {} };
  vm.runInNewContext(code, {
    exports,
    require: name => name === './storage' ? { safeStorage: storage } : { getApiUrl: path => `http://127.0.0.1:10000${path}` },
    fetch,
  });
  return exports;
}

test('app session clear requires confirmed native removal of saved credentials', async () => {
  const removed = [];
  const api = loadApi(async () => {}, {
    removeItemRequired: async key => {
      removed.push(key);
      if (key === '@gcsc/auth/token') throw new Error('storage_timeout');
    },
  });
  await assert.rejects(api.clearSession(), /storage_timeout/);
  assert.deepEqual(removed.sort(), ['@gcsc/auth/token', '@gcsc/auth/user'].sort());
  assert.equal(api.getToken(), null);
});

function loadStorage(native, timeout = setTimeout) {
  const source = fs.readFileSync(new URL('../apps/mobile/lib/storage.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: () => ({ default: native }),
    setTimeout: timeout,
    clearTimeout,
    console,
    Error,
  });
  return exports;
}

test('auth storage removal must not report success when native deletion stalls', async () => {
  const storage = loadStorage({ removeItem: async () => new Promise(() => {}) }, cb => setTimeout(cb, 5));
  await assert.rejects(storage.removeItemRequired('@gcsc/auth/token'), /storage_timeout/);
});

test('auth storage removal confirms native deletion', async () => {
  const removed = [];
  const storage = loadStorage({ removeItem: async key => { removed.push(key); } });
  await storage.removeItemRequired('@gcsc/auth/token');
  assert.deepEqual(removed, ['@gcsc/auth/token']);
});

test('mobile auth distinguishes unavailable transport from account rejection', async () => {
  const api = loadApi(async () => { throw new TypeError('Network request failed'); });
  await assert.rejects(api.apiRequest('/api/auth/register', { method: 'POST', auth: false }), error => {
    assert.equal(error.status, 0);
    assert.equal(error.code, 'NETWORK_UNAVAILABLE');
    assert.match(error.message, /server/i);
    assert.doesNotMatch(error.message, /account.*not.*exist/i);
    return true;
  });
});

test('server account rejection retains its HTTP status', async () => {
  const api = loadApi(async () => ({
    ok: false,
    status: 409,
    text: async () => JSON.stringify({ error: 'Account already exists' }),
  }));
  await assert.rejects(api.apiRequest('/api/auth/register', { method: 'POST', auth: false }), error => {
    assert.equal(error.status, 409);
    assert.equal(error.code, undefined);
    assert.equal(error.message, 'Account already exists');
    return true;
  });
});

test('successful email registration enters the selected role without mandatory wallet binding', () => {
  const source = fs.readFileSync(new URL('../apps/mobile/app/(auth)/sign-up.tsx', import.meta.url), 'utf8');
  assert.match(source, /router\.replace\(res\.user\.role === 'contractor' \? '\/\(contractor\)\/jobs' : '\/\(homeowner\)\/jobs'\)/);
  assert.match(source, /apiErr\.code === 'NETWORK_UNAVAILABLE'/);
});
