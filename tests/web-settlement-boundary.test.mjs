import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../apps/web/src/services/xprSettlement.ts', import.meta.url), 'utf8')
  .replace(/^import .*$/m, '').replaceAll('import.meta.env', 'env');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const chainId = '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd';
function setup(change = () => {}, connectHook = () => {}, storage = new Map(), locks = new Set()) {
  const calls = [];
  const connected = { wallet: { accountName: 'alice', permission: 'active' }, session: {
    auth: { actor: 'alice', permission: 'active' }, chainId,
    transact: async (...args) => { calls.push(args); return { transaction_id: 'tx-id' }; },
  } };
  change(connected);
  const context = vm.createContext({ exports: {}, env: {}, navigator: { locks: { request: async (key, _options, callback) => {
    if (locks.has(key)) return callback(null);
    locks.add(key); try { return await callback({ name: key }); } finally { locks.delete(key); }
  } } }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, connectWebAuthSession: async () => { connectHook(); return connected; } });
  vm.runInContext(code, context);
  return { sign: context.exports.signEscrowMilestoneAction, calls, connected, context };
}
const params = () => ({ action: 'submitms', escrowId: 7, milestoneId: 9, evidenceHash: 'evidence', expectedUserId: 1, expectedActor: 'alice', expectedPermission: 'active', isSessionCurrent: () => true });
for (const [name, change] of [
  ['actor', c => { c.session.auth.actor = 'mallory'; }],
  ['permission', c => { c.session.auth.permission = 'owner'; }],
  ['chain', c => { c.session.chainId = 'wrong-chain'; }],
  ['missing chain', c => { delete c.session.chainId; }],
  ['missing auth', c => { delete c.session.auth; }],
  ['wrapper mismatch', c => { c.wallet.accountName = 'mallory'; }],
]) test(`escrow rejects ${name} before broadcast`, async () => {
  const { sign, calls } = setup(change);
  await assert.rejects(sign(params()));
  assert.equal(calls.length, 0);
});
test('escrow rejects application session change while connecting', async () => {
  let current = true;
  const { sign, calls } = setup(() => {}, () => { current = false; });
  await assert.rejects(sign({ ...params(), isSessionCurrent: () => current }));
  assert.equal(calls.length, 0);
});
test('escrow requires explicit trusted identity and session guard', async () => {
  for (const field of ['expectedUserId', 'expectedActor', 'expectedPermission', 'isSessionCurrent']) {
    const { sign, calls } = setup(() => {});
    const input = params(); delete input[field];
    await assert.rejects(sign(input)); assert.equal(calls.length, 0);
  }
});
test('valid escrow broadcasts the exact action once', async () => {
  const { sign, calls } = setup(() => {});
  const result = await sign(params());
  assert.equal(result.transactionId, 'tx-id'); assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), [{ actions: [{ account: 'gcscrow1111', name: 'submitms', authorization: [{ actor: 'alice', permission: 'active' }], data: { escrow_id: 7, milestone_id: 9, evidence_hash: 'evidence' } }] }, { broadcast: true }]);
});
test('signing failure is not automatically retried', async () => {
  const { sign, calls, connected } = setup();
  connected.session.transact = async () => { calls.push('attempt'); throw new Error('signature rejected'); };
  await assert.rejects(sign(params()), /outcome|reconcile/i);
  assert.equal(calls.length, 1);
});
test('concurrent escrow requests cannot broadcast twice', async () => {
  const { sign, calls, connected } = setup();
  let finish;
  connected.session.transact = () => { calls.push('attempt'); return new Promise(resolve => { finish = resolve; }); };
  const first = sign(params());
  await Promise.resolve();
  await assert.rejects(sign(params()), /already in progress/);
  assert.equal(calls.length, 1);
  finish({ transaction_id: 'tx-id' });
  await first;
});

test('dispute supplies actor required by contract ABI', async () => {
  const { sign, calls } = setup();
  await sign({ ...params(), action: 'disputems' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][0].actions[0].data)), { actor: 'alice', escrow_id: 7, milestone_id: 9 });
});
test('unknown outcome stays blocked across reloads', async () => {
  const storage = new Map();
  const first = setup(c => { c.session.transact = async () => { throw new Error('network timeout'); }; }, () => {}, storage);
  await assert.rejects(first.sign(params()), /outcome|reconcile/i);
  const second = setup(() => {}, () => {}, storage);
  await assert.rejects(second.sign(params()), /outcome|reconcile/i);
  assert.equal(second.calls.length, 0);
});
test('known transaction is reused after reload without rebroadcast', async () => {
  const storage = new Map();
  await setup(() => {}, () => {}, storage).sign(params());
  const retry = setup(() => {}, () => {}, storage);
  assert.equal((await retry.sign(params())).transactionId, 'tx-id');
  assert.equal(retry.calls.length, 0);
  assert.ok(![...storage.values()].join('').includes('token'));
});
test('journal write failure prevents broadcast', async () => {
  const storage = { get: () => undefined, set: () => { throw new Error('disk unavailable'); } };
  const { sign, calls } = setup(() => {}, () => {}, storage);
  await assert.rejects(sign(params())); assert.equal(calls.length, 0);
});
test('missing transaction id stays unknown and cannot be signed again', async () => {
  const { sign, calls } = setup(c => { c.session.transact = async () => { calls.push('attempt'); return {}; }; });
  await assert.rejects(sign(params()), /outcome|reconcile/i);
  await assert.rejects(sign(params()), /outcome|reconcile/i);
  assert.equal(calls.length, 1);
});

test('journal isolates users and actions without storing JWT', async () => {
  const storage = new Map();
  await setup(() => {}, () => {}, storage).sign(params());
  const secondUser = setup(() => {}, () => {}, storage);
  await secondUser.sign({ ...params(), expectedUserId: 2 });
  assert.equal(secondUser.calls.length, 1);
  const secondAction = setup(() => {}, () => {}, storage);
  await secondAction.sign({ ...params(), action: 'approvems' });
  assert.equal(secondAction.calls.length, 1);
});
test('failure to persist known hash retains unknown barrier after reload', async () => {
  const values = new Map(); let writes = 0;
  const storage = { get: key => values.get(key), set: (key, value) => { if (++writes === 2) throw new Error('quota'); values.set(key, value); } };
  await assert.rejects(setup(() => {}, () => {}, storage).sign(params()), /tx-id.*do not sign again/);
  const reload = setup(() => {}, () => {}, storage);
  await assert.rejects(reload.sign(params()), /unknown/);
  assert.equal(reload.calls.length, 0);
});

test('cross-tab lock prevents a second SDK request while first is unresolved', async () => {
  const storage = new Map(), locks = new Set();
  let finish;
  const first = setup(c => { c.session.transact = () => new Promise(resolve => { finish = resolve; }); }, () => {}, storage, locks);
  const running = first.sign(params());
  await Promise.resolve(); await Promise.resolve();
  const second = setup(() => {}, () => {}, storage, locks);
  await assert.rejects(second.sign(params()), /already in progress/);
  assert.equal(second.calls.length, 0);
  finish({ transaction_id: 'tx-id' }); await running;
});

test('browser without Web Locks is blocked before broadcast', async () => {
  const { sign, calls, context } = setup();
  delete context.navigator.locks;
  await assert.rejects(sign(params()), /Web Locks/);
  assert.equal(calls.length, 0);
});
