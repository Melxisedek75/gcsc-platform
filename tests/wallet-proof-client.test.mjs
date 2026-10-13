import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createOwnershipProofRequester } from '../packages/wallet-proof/request-proof.mjs';

const require = createRequire(import.meta.url);
const { createOwnershipChallenge } = require('../services/api/v3/wallet-ownership-proof.cjs');
const now = Date.UTC(2030, 0, 1);
const context = { purpose: 'link', audience: 'https://app.example.invalid', chainId: 'c'.repeat(64),
  accountName: 'fixture11111', permission: 'active', sessionBinding: 'b'.repeat(64) };
const challenge = () => createOwnershipChallenge(context, { now });
const signature = `SIG_K1_${'1'.repeat(94)}`; // Transport shape only, not a valid cryptographic proof.
const signer = { actor: context.accountName, permission: context.permission, chainId: context.chainId };
function fixture(result, options = {}) {
  const calls = [];
  const request = createOwnershipProofRequester({
    getIdentity: () => signer, now: () => now,
    transact: async (...args) => { calls.push(args); return typeof result === 'function' ? result(...args) : result; },
    ...options,
  });
  return { request, calls };
}
function response(record) {
  return { signatures: [signature], serializedTransaction: record.serializedTransaction };
}

test('web response with explicit bytes creates a bounded server DTO and never broadcasts', async () => {
  const record = challenge();
  const { request, calls } = fixture(response(record));
  assert.deepEqual(await request(record), {
    challengeId: record.challengeId, signatures: [signature], serializedTransaction: record.serializedTransaction,
  });
  assert.deepEqual(calls, [[{ transaction: record.transaction }, { broadcast: false, noModify: true }]]);
});

test('native typed SDK result preserves exact serialized bytes and signature', async () => {
  const record = challenge();
  const { request } = fixture({
    resolved: { serializedTransaction: new Uint8Array(Buffer.from(record.serializedTransaction, 'hex')) },
    signatures: [{ toString: () => signature }], signer,
  });
  assert.equal((await request(record)).serializedTransaction, record.serializedTransaction);
});

test('wallet SDK mutation cannot alter the protected challenge snapshot', async () => {
  const record = challenge();
  const originalTransaction = structuredClone(record.transaction);
  const { request } = fixture(({ transaction }) => {
    transaction.actions[0].account = 'wallet-mutated';
    return response(record);
  });
  assert.equal((await request(record)).serializedTransaction, record.serializedTransaction);
  assert.deepEqual(record.transaction, originalTransaction);
});

for (const result of [
  { transaction_id: 'a'.repeat(64) }, { signatures: [signature] },
  { signatures: [signature], transaction: {} },
  { serializedTransaction: 'ff', signatures: [signature] },
  { serializedTransaction: '00'.repeat(8193), signatures: [signature] },
]) {
  test('missing or changed proof bytes fail closed: ' + Object.keys(result).join(','), async () => {
    const { request } = fixture(result);
    await assert.rejects(request(challenge()), /wallet_proof_/);
  });
}

test('broadcast result cannot be mistaken for a sign-only proof', async () => {
  const record = challenge();
  await assert.rejects(fixture({ ...response(record), processed: {} }).request(record), /wallet_proof_broadcast/);
});

test('wrong account, permission, or chain never reaches the wallet', async () => {
  for (const field of ['accountName', 'permission', 'chainId']) {
    const record = challenge(); record[field] = 'wrong';
    const { request, calls } = fixture({});
    await assert.rejects(request(record), /wallet_proof_/);
    assert.equal(calls.length, 0);
  }
});

test('transfer or extra action in a purported auth challenge is refused before signing', async () => {
  for (const mutation of [
    tx => { tx.actions[0].account = 'eosio.token'; tx.actions[0].name = 'transfer'; },
    tx => tx.actions.push({ ...tx.actions[0] }),
    tx => { tx.actions[0].authorization[0].actor = 'another11111'; },
    tx => { tx.actions[0].data = '00'.repeat(16); },
    tx => { tx.context_free_actions[0].authorization.push(signer); },
    tx => { tx.transaction_extensions.push([1, 'ff']); },
  ]) {
    const record = challenge(); mutation(record.transaction);
    const { request, calls } = fixture({});
    await assert.rejects(request(record), /wallet_proof_challenge_invalid/);
    assert.equal(calls.length, 0);
  }
});

test('account changed while awaiting approval invalidates the result', async () => {
  const record = challenge(); let identity = signer;
  const { request } = fixture(() => { identity = { ...signer, actor: 'another11111' }; return response(record); },
    { getIdentity: () => identity });
  await assert.rejects(request(record), /wallet_proof_session_changed/);
});

test('duplicate call cannot issue another signing request', async () => {
  const record = challenge(); let finish;
  const { request, calls } = fixture(() => new Promise(resolve => { finish = resolve; }));
  const first = request(record);
  await assert.rejects(request(record), /wallet_proof_request_pending/);
  finish(response(record));
  await first;
  assert.equal(calls.length, 1);
});

test('timeout discards late result and keeps the pending SDK request from being duplicated', async () => {
  const record = challenge(); let finish;
  const { request, calls } = fixture(() => new Promise(resolve => { finish = resolve; }), { timeoutMs: 20 });
  await assert.rejects(request(record), /wallet_proof_timeout/);
  await assert.rejects(request(record), /wallet_proof_request_pending/);
  assert.equal(calls.length, 1);
  finish(response(record));
  await new Promise(resolve => setImmediate(resolve));
});

test('cancellation rejects without signing when the signal was already aborted', async () => {
  const controller = new AbortController(); controller.abort();
  const { request, calls } = fixture({});
  await assert.rejects(request(challenge(), { signal: controller.signal }), /wallet_proof_cancelled/);
  assert.equal(calls.length, 0);
});

test('expiration before or after wallet approval cannot produce a server DTO', async () => {
  const record = challenge();
  await assert.rejects(fixture(response(record), { now: () => record.expiresAt }).request(record), /wallet_proof_expired/);
  let time = now;
  const { request } = fixture(() => { time = record.expiresAt; return response(record); }, { now: () => time });
  await assert.rejects(request(record), /wallet_proof_expired/);
});
