import test from 'node:test';
import assert from 'node:assert/strict';

import { createWalletBinding } from '../packages/wallet-proof/binding-client.mjs';

const challenge = {
  version: 1,
  purpose: 'link',
  audience: 'http://127.0.0.1:10000',
  chainId: '7'.repeat(64),
  accountName: 'fixture11111',
  permission: 'active',
  sessionBinding: '8'.repeat(64),
  challengeId: '9'.repeat(64),
  issuedAt: 1,
  expiresAt: 2,
  transaction: {},
  serializedTransaction: '00',
};
const proof = {
  challengeId: challenge.challengeId,
  signatures: ['SIG_K1_fixture'],
  serializedTransaction: challenge.serializedTransaction,
};

test('wallet binding forwards one canonical sign-only proof to the authenticated verifier', async () => {
  const calls = [];
  const bind = createWalletBinding({
    connect: async () => ({ account: 'fixture11111', permission: 'active' }),
    issueChallenge: async body => { calls.push(['challenge', body]); return challenge; },
    sign: async (value, signal) => { calls.push(['sign', value, signal]); return proof; },
    verify: async body => {
      calls.push(['verify', body]);
      return { user: { id: 41, wallet: { accountName: 'fixture11111', verified: true } } };
    },
  });
  const signal = new AbortController().signal;
  const user = await bind({ signal });
  assert.equal(user.id, 41);
  assert.deepEqual(calls, [
    ['challenge', { accountName: 'fixture11111', permission: 'active' }],
    ['sign', challenge, signal],
    ['verify', { accountName: 'fixture11111', permission: 'active', proof }],
  ]);
});

test('wallet binding rejects incomplete verification and concurrent requests', async () => {
  let release;
  let verifyCount = 0;
  const bind = createWalletBinding({
    connect: async () => ({ account: 'fixture11111', permission: 'active' }),
    issueChallenge: async () => challenge,
    sign: async () => new Promise(resolve => { release = () => resolve(proof); }),
    verify: async () => { verifyCount += 1; return {}; },
  });
  const first = bind();
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(bind(), /wallet_binding_request_pending/);
  release();
  await assert.rejects(first, /wallet_binding_response_invalid/);
  assert.equal(verifyCount, 1);
});

test('wallet binding aborts before server verification', async () => {
  const controller = new AbortController();
  let verified = false;
  const bind = createWalletBinding({
    connect: async () => ({ account: 'fixture11111', permission: 'active' }),
    issueChallenge: async () => challenge,
    sign: async () => { controller.abort(); return proof; },
    verify: async () => { verified = true; return { user: {} }; },
  });
  await assert.rejects(bind({ signal: controller.signal }), /wallet_binding_cancelled/);
  assert.equal(verified, false);
});
