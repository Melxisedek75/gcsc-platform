import { test as nodeTest } from 'node:test';
const test = (name, run) => nodeTest(name, { timeout: 1000 }, run);
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual mobile module, replacing only platform/SDK IO. No network,
// keys or signatures are used; this is not device or wallet acceptance evidence.
const source = fs.readFileSync(new URL('../apps/mobile/lib/webauth.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const CHAIN = '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd';
const args = { recipient: 'recipient111', amount: '1.0000 XPR', fromAccount: 'alice', fromPermission: 'active' };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };

function harness() {
  const timers = new Map();
  const storage = new Map();
  const sdkCalls = [];
  const sdkQueue = [];
  const calls = [];
  const api = { exports: {} };
  let timerId = 0;
  const mocks = {
    'expo-linking': {},
    'react-native': { AppState: {} },
    './storage': { safeStorage: {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); },
      removeItem: async key => { storage.delete(key); },
    } },
    '@proton/signing-request': {},
    '@proton/react-native-sdk': { __esModule: true, default: async options => {
      sdkCalls.push(options);
      if (!sdkQueue.length) throw new Error('Unexpected SDK pairing');
      return await sdkQueue.shift();
    } },
    '../../../packages/wallet-proof/request-proof.mjs': { createOwnershipProofRequester: () => { throw new Error('Unrelated ownership flow'); } },
  };
  vm.runInNewContext(compiled, {
    exports: api.exports, module: api, require: name => {
      if (!(name in mocks)) throw new Error(`Unexpected import ${name}`);
      return mocks[name];
    },
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  }, { filename: 'actual-mobile-webauth.cjs' });
  const makePair = (identity = {}, transact = async () => ({ processed: { id: 'synthetic-tx-id' } })) => ({
    link: { transact: (...input) => { calls.push(input); return transact(...input); } },
    session: {
      auth: { actor: 'alice', permission: 'active' }, chainId: { toString: () => CHAIN },
      remove: async () => {},
      transact: () => { throw new Error('Must preserve parent Link transport'); },
      ...identity,
    },
  });
  return {
    api: api.exports, calls, sdkCalls, sdkQueue, makePair,
    connect: async pair => { sdkQueue.push(pair); await api.exports.connectWallet(); },
    expire: delay => { const match = [...timers].find(([, timer]) => timer.delay === delay); assert.ok(match, `timer ${delay} exists`); timers.delete(match[0]); match[1].callback(); },
  };
}

for (const [label, identity] of [
  ['wrong actor', { auth: { actor: 'bob', permission: 'active' } }],
  ['wrong permission', { auth: { actor: 'alice', permission: 'owner' } }],
  ['wrong chain', { chainId: { toString: () => 'f'.repeat(64) } }],
  ['missing auth', { auth: undefined }],
  ['missing actor', { auth: { permission: 'active' } }],
  ['missing permission', { auth: { actor: 'alice' } }],
  ['missing chain', { chainId: undefined }],
]) {
  test(`rejects ${label} before broadcast`, async () => {
    const h = harness();
    h.sdkQueue.push(h.makePair(identity));
    const result = await h.api.signTransfer(args);
    assert.equal(result.ok, false);
    assert.equal(result.broadcastAttempted, false);
    assert.equal(h.calls.length, 0);
  });
}

test('validates actual parent transport once and binds the expected chain', async () => {
  const h = harness();
  h.sdkQueue.push(h.makePair());
  const result = await h.api.signTransfer(args);
  assert.equal(result.ok, true);
  assert.equal(result.broadcastAttempted, true);
  assert.equal(result.txHash, 'synthetic-tx-id');
  assert.equal(h.calls.length, 1);
  assert.equal(String(h.calls[0][1].chain), CHAIN);
  assert.equal(h.calls[0][1].broadcast, true);
  assert.equal(h.calls[0][0].actions[0].authorization[0].permission, 'active');
});

test('signature-like error never pairs again or repeats a broadcast', async () => {
  const h = harness();
  const pair = h.makePair({}, async () => { throw Object.assign(new Error('declares authority but does not have signatures'), { processed: { id: 'known-attempt-id' } }); });
  h.sdkQueue.push(pair, h.makePair());
  const result = await h.api.signTransfer(args);
  assert.equal(result.ok, false);
  assert.equal(result.broadcastAttempted, true);
  assert.equal(result.txHash, 'known-attempt-id');
  assert.equal(h.sdkCalls.length, 1);
  assert.equal(h.calls.length, 1);
});

test('profile metadata alone and partial explicit identity cannot authorize signing', async () => {
  for (const partial of [{}, { fromAccount: 'alice' }, { fromPermission: 'active' }]) {
    const h = harness();
    await h.api.primeSessionFromBackend('alice', 'active');
    h.sdkQueue.push(h.makePair());
    const result = await h.api.signTransfer({ recipient: args.recipient, amount: args.amount, ...partial });
    assert.equal(result.ok, false);
    assert.equal(result.broadcastAttempted, false);
    assert.equal(h.calls.length, 0);
    assert.equal(h.sdkCalls.length, 0);
  }
});

test('a current paired session supplies the complete expected identity', async () => {
  const h = harness();
  await h.connect(h.makePair());
  const result = await h.api.signTransfer({ recipient: args.recipient, amount: args.amount });
  assert.equal(result.ok, true);
  assert.equal(h.calls.length, 1);
});

for (const change of ['disconnect', 'account switch', 'new pairing']) {
  test(`rejects ${change} while native restore is pending`, async () => {
    const h = harness();
    const restore = deferred();
    h.sdkQueue.push(restore.promise);
    const signing = h.api.signTransfer(args);
    await flush();
    assert.equal(h.sdkCalls.length, 1);
    if (change === 'disconnect') await h.api.clearSession();
    if (change === 'account switch') await h.api.primeSessionFromBackend('bob', 'active');
    if (change === 'new pairing') await h.connect(h.makePair({ auth: { actor: 'bob', permission: 'active' } }));
    restore.resolve(h.makePair());
    const result = await signing;
    assert.equal(result.ok, false);
    assert.equal(result.broadcastAttempted, false);
    assert.equal(h.calls.length, 0);
    assert.equal(h.api.getSession()?.account ?? null, change === 'disconnect' ? null : 'bob');
  });
}

test('disconnect during final debug callback prevents transact', async () => {
  const h = harness();
  await h.connect(h.makePair());
  const result = await h.api.signTransfer({ ...args, onDebug: message => {
    if (message === 'Opening Proton Link transaction request') void h.api.clearSession();
  } });
  assert.equal(result.ok, false);
  assert.equal(result.broadcastAttempted, false);
  assert.equal(h.calls.length, 0);
});

test('concurrent requests and unresolved broadcast timeout stay locked until SDK settles', async () => {
  const h = harness();
  const transaction = deferred();
  await h.connect(h.makePair({}, () => transaction.promise));
  const signing = h.api.signTransfer(args);
  await flush();
  assert.equal(h.calls.length, 1);
  const concurrentRequest = h.api.signTransfer(args);
  await flush();
  assert.equal(h.calls.length, 1);
  const concurrent = await concurrentRequest;
  assert.equal(concurrent.ok, false);
  h.expire(180_000);
  const timeout = await signing;
  assert.equal(timeout.ok, false);
  assert.equal(timeout.broadcastAttempted, true);
  assert.match(timeout.error, /unknown/i);
  const repeated = await h.api.signTransfer(args);
  assert.equal(repeated.ok, false);
  assert.equal(h.calls.length, 1);
  transaction.resolve({ processed: { id: 'late-tx-id' } });
  await flush();
  const later = await h.api.signTransfer(args);
  assert.equal(later.ok, true);
  assert.equal(h.calls.length, 2);
});

for (const disconnect of [false, true]) {
  test(`unresolved restore timeout stays locked and rejects late signer (disconnect=${disconnect})`, async () => {
    const h = harness();
    const restore = deferred();
    h.sdkQueue.push(restore.promise, h.makePair());
    const signing = h.api.signTransfer(args);
    await flush();
    h.expire(90_000);
    const timeout = await signing;
    assert.equal(timeout.ok, false);
    assert.equal(timeout.broadcastAttempted, false);
    assert.equal(h.sdkCalls.length, 1);
    const repeated = await h.api.signTransfer(args);
    assert.equal(repeated.ok, false);
    assert.equal(h.sdkCalls.length, 1);
    if (disconnect) await h.api.clearSession();
    restore.resolve(h.makePair());
    await flush();
    assert.equal(h.calls.length, 0);
    const metadataOnly = await h.api.signTransfer({ recipient: args.recipient, amount: args.amount });
    assert.equal(metadataOnly.ok, false);
    assert.equal(h.calls.length, 0);
  });
}

test('missing transaction id after an attempt remains an unknown result', async () => {
  const h = harness();
  h.sdkQueue.push(h.makePair({}, async () => ({})));
  const result = await h.api.signTransfer(args);
  assert.equal(result.ok, false);
  assert.equal(result.broadcastAttempted, true);
  assert.match(result.error, /unknown/i);
  assert.equal(h.calls.length, 1);
});

test('app session change during async SDK restore prevents any broadcast', async () => {
  const h = harness();
  const restore = deferred();
  let sessionCurrent = true;
  h.sdkQueue.push(restore.promise);
  const signing = h.api.signTransfer({ ...args, isSessionCurrent: () => sessionCurrent });
  await flush();
  assert.equal(h.sdkCalls.length, 1);
  sessionCurrent = false;
  restore.resolve(h.makePair());
  const result = await signing;
  assert.equal(result.ok, false);
  assert.equal(result.broadcastAttempted, false);
  assert.equal(h.calls.length, 0);
});

test('stale app session prevents SDK restore from starting', async () => {
  const h = harness();
  h.sdkQueue.push(h.makePair());
  const result = await h.api.signTransfer({ ...args, isSessionCurrent: () => false });
  assert.equal(result.ok, false);
  assert.equal(result.broadcastAttempted, false);
  assert.equal(h.sdkCalls.length, 0);
  assert.equal(h.calls.length, 0);
});

test('app session change in final debug callback prevents transact', async () => {
  const h = harness();
  await h.connect(h.makePair());
  let sessionCurrent = true;
  const result = await h.api.signTransfer({ ...args, isSessionCurrent: () => sessionCurrent, onDebug: message => {
    if (message === 'Opening Proton Link transaction request') sessionCurrent = false;
  } });
  assert.equal(result.ok, false);
  assert.equal(result.broadcastAttempted, false);
  assert.equal(h.calls.length, 0);
});
