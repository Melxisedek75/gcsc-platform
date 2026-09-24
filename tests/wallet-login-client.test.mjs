import test from 'node:test';
import assert from 'node:assert/strict';

import { createWalletFirstLogin } from '../packages/wallet-proof/login-client.mjs';

const challenge = {
  version: 1,
  purpose: 'login',
  audience: 'smartcontractor',
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

test('wallet-first client forwards the frozen challenge and verify contract', async () => {
  const calls = [];
  const login = createWalletFirstLogin({
    connect: async () => ({ account: 'fixture11111', permission: 'active' }),
    issueChallenge: async body => { calls.push(['challenge', body]); return challenge; },
    sign: async (value, signal) => { calls.push(['sign', value, signal]); return proof; },
    verify: async body => {
      calls.push(['verify', body]);
      return { token: 'jwt', user: { id: 31, role: 'contractor' } };
    },
    save: async (token, user) => { calls.push(['save', token, user]); },
  });

  const signal = new AbortController().signal;
  const user = await login({ signal });

  assert.equal(user.id, 31);
  assert.deepEqual(calls, [
    ['challenge', { accountName: 'fixture11111', permission: 'active' }],
    ['sign', challenge, signal],
    ['verify', {
      accountName: 'fixture11111',
      permission: 'active',
      sessionBinding: challenge.sessionBinding,
      proof,
    }],
    ['save', 'jwt', { id: 31, role: 'contractor' }],
  ]);
});

test('wallet-first client fails closed when WebAuth returns no account', async () => {
  let requested = false;
  const login = createWalletFirstLogin({
    connect: async () => null,
    issueChallenge: async () => { requested = true; },
    sign: async () => proof,
    verify: async () => ({ token: 'jwt', user: {} }),
    save: async () => {},
  });

  await assert.rejects(login(), /wallet_login_cancelled/);
  assert.equal(requested, false);
});

test('wallet-first client never saves an incomplete verification response', async () => {
  let saved = false;
  const login = createWalletFirstLogin({
    connect: async () => ({ account: 'fixture11111', permission: 'active' }),
    issueChallenge: async () => challenge,
    sign: async () => proof,
    verify: async () => ({ message: 'missing token' }),
    save: async () => { saved = true; },
  });

  await assert.rejects(login(), /wallet_login_response_invalid/);
  assert.equal(saved, false);
});

test('wallet-first client rejects a concurrent login before a second verify or save', async () => {
  let releaseSign;
  let verifyCount = 0;
  let saveCount = 0;
  const login = createWalletFirstLogin({
    connect: async () => ({ account: 'fixture11111', permission: 'active' }),
    issueChallenge: async () => challenge,
    sign: async () => new Promise(resolve => { releaseSign = () => resolve(proof); }),
    verify: async () => { verifyCount += 1; return { token: 'jwt', user: { id: 31 } }; },
    save: async () => { saveCount += 1; },
  });

  const first = login();
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(login(), /wallet_login_request_pending/);
  releaseSign();
  await first;

  assert.equal(verifyCount, 1);
  assert.equal(saveCount, 1);
});

test('abort after signing prevents verify and session persistence', async () => {
  const controller = new AbortController();
  let verifyCount = 0;
  let saveCount = 0;
  const login = createWalletFirstLogin({
    connect: async () => ({ account: 'fixture11111', permission: 'active' }),
    issueChallenge: async () => challenge,
    sign: async () => { controller.abort(); return proof; },
    verify: async () => { verifyCount += 1; return { token: 'jwt', user: { id: 31 } }; },
    save: async () => { saveCount += 1; },
  });

  await assert.rejects(login({ signal: controller.signal }), /wallet_login_cancelled/);
  assert.equal(verifyCount, 0);
  assert.equal(saveCount, 0);
});
