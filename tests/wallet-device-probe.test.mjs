import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createProbeServer } from '../scripts/wallet-device-probe.mjs';
import { inspectProofResponse, isWalletProbeLink } from '../packages/wallet-proof/probe-support.mjs';

const require = createRequire(new URL('../services/api/v3/package.json', import.meta.url));
const { Key, Numeric, digestFromSerializedData } = require('@proton/js');
const identity = { accountName: 'fixture11111', permission: 'active' };
async function fixture(t, options = {}) {
  const server = createProbeServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, async call(route, body, headers = {}) {
    const response = await fetch(base + route, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  } };
}

test('probe health explicitly grants no authentication or payment', async t => {
  const { call } = await fixture(t);
  const { body } = await call('/probe/status');
  assert.equal(body.mode, 'diagnostic-only');
  assert.equal(body.authenticationGranted, false);
  assert.equal(body.broadcast, false);
});

test('real local fixture signature is checked without granting login; replay fails', async t => {
  const { call } = await fixture(t);
  const { body: record } = await call('/probe/challenge', identity);
  const privateKey = Key.PrivateKey.fromElliptic(Key.k1Ec.genKeyPair(), Numeric.KeyType.k1);
  const proof = { challengeId: record.challengeId, serializedTransaction: record.serializedTransaction,
    signatures: [privateKey.sign(digestFromSerializedData(record.chainId,
      Buffer.from(record.serializedTransaction, 'hex')), false).toString()] };
  const accepted = await call('/probe/proof', proof);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.exactBytes, true);
  assert.equal(accepted.body.recoveredPublicKey, privateKey.getPublicKey().toString());
  assert.equal(accepted.body.authenticationGranted, false);
  assert.equal(accepted.body.authorityChecked, false);
  assert.equal((await call('/probe/proof', proof)).status, 409);
  assert(!JSON.stringify((await call('/probe/status')).body).includes(proof.signatures[0]));
});

test('probe never accepts remote browser origins or non-JSON commands', async t => {
  const { call } = await fixture(t);
  assert.equal((await call('/probe/challenge', identity, { Origin: 'https://attacker.invalid' })).status, 403);
  assert.equal((await call('/probe/challenge', identity, { 'Content-Type': 'text/plain' })).status, 415);
});

test('challenge creation is bounded and old challenges expire', async t => {
  let now = Date.now();
  const { call } = await fixture(t, { now: () => now, maxChallenges: 2 });
  assert.equal((await call('/probe/challenge', identity)).status, 200);
  assert.equal((await call('/probe/challenge', identity)).status, 200);
  assert.equal((await call('/probe/challenge', identity)).status, 429);
  now += 120000;
  assert.equal((await call('/probe/challenge', identity)).status, 200);
});

test('probe rejects bad accounts and unknown API routes without creating app users', async t => {
  const { call } = await fixture(t);
  assert.equal((await call('/probe/challenge', { ...identity, accountName: 'not-a-name' })).status, 400);
  assert.equal((await call('/api/auth/wallet/verify', {})).status, 404);
});

test('response observations contain only shape, never signature/payload/session values', () => {
  const summary = inspectProofResponse({ signatures: ['SIG_WA_secret-signature'],
    resolved: { serializedTransaction: new Uint8Array(486) }, payload: { privateKey: 'DO_NOT_LOG' },
    session: { key: 'DO_NOT_LOG' }, processed: undefined });
  assert.deepEqual(summary, { signatureType: 'WA', signatureCount: 1, serializedBytes: 486,
    format: 'native-resolved', broadcastResult: false });
  assert(!JSON.stringify(summary).includes('DO_NOT_LOG'));
  assert(!JSON.stringify(summary).includes('secret-signature'));
});

test('only exact probe deep links bypass normal app hydration in explicit probe builds', () => {
  assert.equal(isWalletProbeLink('smartcontractor://wallet-probe', true), true);
  for (const link of [null, 'smartcontractor://webauth-callback', 'evil://wallet-probe',
    'https://example.invalid/wallet-probe', 'smartcontractor://wallet-probe.evil',
    'smartcontractor://wallet-probe/other', 'smartcontractor://user@wallet-probe']) {
    assert.equal(isWalletProbeLink(link, true), false);
  }
  assert.equal(isWalletProbeLink('smartcontractor://wallet-probe', false), false);
});

test('probe launch guard precedes any application session access', () => {
  const root = fs.readFileSync(new URL('../apps/mobile/app/_layout.tsx', import.meta.url), 'utf8');
  const guard = root.indexOf("if (isWalletProbeLink(await Linking.getInitialURL(), process.env.EXPO_PUBLIC_WALLET_PROBE === '1')) return;");
  assert(guard > 0);
  assert(guard < root.indexOf('await loadSession()'));
  assert(guard < root.indexOf('await fetchProfile()'));
  const probe = fs.readFileSync(new URL('../apps/mobile/lib/wallet-probe.ts', import.meta.url), 'utf8');
  assert.match(probe, /restoreSession: false, storagePrefix: '@gcsc\/probe\/'/);
  assert.match(probe, /storage: \{ read: async key => memory.get\(key\) \?\? null/);
  assert.match(probe, /const result = await link\.transact\(/);
  assert.doesNotMatch(probe, /const result = await session\.transact\(/);
  assert.doesNotMatch(probe, /AsyncStorage|clearSession|saveSession|primeSessionFromBackend/);
});

test('probe presents bounded messages for rejected proof responses', () => {
  const probe = fs.readFileSync(new URL('../apps/mobile/lib/wallet-probe.ts', import.meta.url), 'utf8');
  for (const code of ['session_changed', 'result_unsupported', 'broadcast', 'challenge_invalid']) {
    assert.match(probe, new RegExp(`message\\.includes\\('${code}'\\)`));
  }
});

test('probe rejects unsupported wallet signatures without exposing the proof in logs', async t => {
  const events = [];
  const { call } = await fixture(t, { onEvent: value => events.push(value) });
  const { body: record } = await call('/probe/challenge', identity);
  const proof = { challengeId: record.challengeId, serializedTransaction: record.serializedTransaction,
    signatures: ['SIG_WA_untrusted-payload'] };
  assert.equal((await call('/probe/proof', proof)).status, 400);
  assert.equal((await call('/probe/proof', proof)).status, 409);
  assert(!JSON.stringify(events).includes('untrusted-payload'));
  assert.equal((await call('/probe/status')).body.lastResult, null);
});
