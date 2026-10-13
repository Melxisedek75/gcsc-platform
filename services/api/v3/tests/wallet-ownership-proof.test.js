const { Key, Numeric, digestFromSerializedData } = require('@proton/js');
const {
  createOwnershipChallenge, verifyOwnershipProof, createOwnershipVerifier,
} = require('../wallet-ownership-proof.cjs');

const now = Date.UTC(2030, 0, 1);
const context = {
  purpose: 'link', audience: 'https://app.example.invalid',
  chainId: '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd',
  accountName: 'fixture11111', permission: 'active', sessionBinding: 'b'.repeat(64),
};
// Generated, ephemeral test keys never leave this process or sign a broadcast.
function key(type = Numeric.KeyType.k1) {
  return Key.PrivateKey.fromElliptic(Key.constructElliptic(type).genKeyPair(), type);
}
function challenge(overrides = {}, options = {}) {
  return createOwnershipChallenge({ ...context, ...overrides }, { now, ...options });
}
function proofFor(record, privateKey = key(), overrides = {}) {
  const bytes = Buffer.from(record.serializedTransaction, 'hex');
  const digest = digestFromSerializedData(record.chainId, bytes);
  return {
    proof: { challengeId: record.challengeId, serializedTransaction: bytes.toString('hex'),
      signatures: [privateKey.sign(digest, false).toString()], ...overrides },
    publicKey: privateKey.getPublicKey().toString(),
  };
}
function check(record, proof, expected = context, instant = now) {
  return verifyOwnershipProof(record, proof, { context: expected, now: instant });
}

test('challenge is canonical, unpredictable, and contains no payment actions', () => {
  const first = challenge();
  expect(first.challengeId).toMatch(/^[a-f0-9]{64}$/);
  expect(challenge().challengeId).not.toBe(first.challengeId);
  expect(first.transaction.actions).toEqual([{
    account: '', name: 'identity',
    authorization: [{ actor: context.accountName, permission: context.permission }],
    data: expect.stringMatching(/^01[a-f0-9]{32}$/),
  }]);
  const nonceAction = first.transaction.context_free_actions[0];
  expect(nonceAction).toMatchObject({ account: 'eosio.null', name: 'nonce', authorization: [] });
  expect(JSON.parse(Buffer.from(nonceAction.data, 'hex').toString())).toEqual({
    version: 1, ...context, nonce: first.challengeId, issuedAt: first.issuedAt, expiresAt: first.expiresAt,
  });
  expect(first.transaction.transaction_extensions).toEqual([]);
  expect(first.signingOptions).toEqual({ broadcast: false, noModify: true });
});

test.each([Numeric.KeyType.k1, Numeric.KeyType.r1])('recovers the real signed key for curve %s', type => {
  const record = challenge();
  const { proof, publicKey } = proofFor(record, key(type));
  expect(check(record, proof)).toEqual({
    publicKey, chainId: context.chainId, accountName: context.accountName, permission: context.permission,
  });
});

test.each([
  ['purpose', 'login'], ['audience', 'https://other.example.invalid'],
  ['chainId', 'c'.repeat(64)], ['accountName', 'other1111111'],
  ['permission', 'owner'], ['sessionBinding', 'c'.repeat(64)],
])('rejects a valid signature for a different %s', (field, value) => {
  const record = challenge();
  expect(() => check(record, proofFor(record).proof, { ...context, [field]: value }))
    .toThrow('wallet_proof_context_mismatch');
});

test.each([
  ['purpose', 'login'], ['audience', 'https://other.example.invalid'],
  ['chainId', 'c'.repeat(64)], ['accountName', 'other1111111'],
  ['permission', 'owner'], ['sessionBinding', 'c'.repeat(64)],
])('the signed transaction changes when %s changes', (field, value) => {
  const randomBytes = () => Buffer.alloc(32, 11);
  const a = challenge({}, { randomBytes });
  const b = challenge({ [field]: value }, { randomBytes });
  expect(b.serializedTransaction).not.toBe(a.serializedTransaction);
});

test.each([now + 120000, now + 120001, now - 1])('rejects expired or future challenge at %s', instant => {
  const record = challenge();
  expect(() => check(record, proofFor(record).proof, context, instant)).toThrow('wallet_proof_expired');
});

test.each([
  {}, { signatures: [] }, { signatures: ['not-a-signature'] },
  { signatures: ['x'.repeat(300)] }, { signatures: ['a', 'b'] },
  { serializedTransaction: 'a' }, { serializedTransaction: 'ff'.repeat(8193) },
  { challengeId: 'wrong' }, { processed: { id: 'not-sign-only' } },
  { serializedContextFreeData: '01' },
])('rejects incomplete, unsupported, or broadcast proof case %#', override => {
  const record = challenge();
  const proof = Object.keys(override).length ? proofFor(record, key(), override).proof : {};
  expect(() => check(record, proof)).toThrow();
});

test('rejects even a correctly signed, modified transaction before signature verification', () => {
  const record = challenge();
  const changed = { ...record, serializedTransaction: `${record.serializedTransaction}00` };
  expect(() => check(record, proofFor(changed).proof)).toThrow('wallet_proof_transaction_mismatch');
});

test('a raw text challenge signature cannot authenticate the expected transaction', () => {
  const record = challenge();
  const privateKey = key();
  const proof = proofFor(record, privateKey).proof;
  proof.signatures = [privateKey.sign('GCSC wallet ownership proof').toString()];
  // Recovery yields a different key, so a current-account authority check must reject it.
  expect(check(record, proof).publicKey).not.toBe(privateKey.getPublicKey().toString());
});

test.each([
  { audience: 'http://remote.example.invalid' }, { audience: 'https://app.example.invalid/path' },
  { audience: 'https://user:pass@example.invalid' }, { purpose: 'payment' },
  { chainId: 'testnet' }, { sessionBinding: '' }, { accountName: 'bad-name' },
  { accountName: 'fixture11111.' }, { permission: '' },
  { chainId: { toString: () => 'c'.repeat(64) } },
])('rejects ambiguous or missing server context %p', override => {
  expect(() => challenge(override)).toThrow('wallet_proof_config_invalid');
});

test.each([0, -1, 300001, Infinity])('rejects unbounded TTL %p', ttlMs => {
  expect(() => challenge({}, { ttlMs })).toThrow('wallet_proof_config_invalid');
});

function verifierFixture(authorityResult = true) {
  const record = challenge();
  const { proof, publicKey } = proofFor(record);
  let stored = record;
  const store = {
    take: jest.fn(async (id, expected) => {
      if (!stored || stored.challengeId !== id || expected.sessionBinding !== stored.sessionBinding) return null;
      const result = stored; stored = null; return result;
    }),
  };
  const verifyAuthority = jest.fn(async identity => authorityResult && identity.publicKey === publicKey);
  const verify = createOwnershipVerifier({ store, verifyAuthority, now: () => now });
  return { record, proof, publicKey, store, verifyAuthority, verify };
}

test('redemption checks current chain/account authority and consumes proof exactly once', async () => {
  const fixture = verifierFixture();
  const results = await Promise.allSettled([
    fixture.verify(fixture.proof, context), fixture.verify(fixture.proof, context),
  ]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.find(result => result.status === 'rejected').reason.message).toBe('wallet_proof_not_found');
  expect(fixture.verifyAuthority).toHaveBeenCalledTimes(1);
  expect(fixture.verifyAuthority).toHaveBeenCalledWith({
    chainId: context.chainId, accountName: context.accountName, permission: context.permission,
    publicKey: fixture.publicKey,
  }, expect.any(AbortSignal));
});

test('failed authority never becomes a verified binding or reusable challenge', async () => {
  const fixture = verifierFixture(false);
  await expect(fixture.verify(fixture.proof, context)).rejects.toThrow('wallet_proof_unauthorized');
  await expect(fixture.verify(fixture.proof, context)).rejects.toThrow('wallet_proof_not_found');
});

test('an unrelated requesting session cannot consume the original challenge', async () => {
  const fixture = verifierFixture();
  await expect(fixture.verify(fixture.proof, { ...context, sessionBinding: 'c'.repeat(64) }))
    .rejects.toThrow('wallet_proof_not_found');
  await expect(fixture.verify(fixture.proof, context)).resolves.toHaveProperty('publicKey');
});

test('authority timeout is bounded and does not leave a reusable proof', async () => {
  const fixture = verifierFixture();
  const verify = createOwnershipVerifier({
    store: fixture.store, now: () => now, authorityTimeoutMs: 20,
    verifyAuthority: () => new Promise(() => {}),
  });
  await expect(verify(fixture.proof, context)).rejects.toThrow('wallet_proof_authority_timeout');
  await expect(verify(fixture.proof, context)).rejects.toThrow('wallet_proof_not_found');
});

test('missing persistent-store or current-authority adapter fails closed', () => {
  expect(() => createOwnershipVerifier({})).toThrow('wallet_proof_config_invalid');
});

test('slow current-authority lookup cannot redeem an expired challenge', async () => {
  const fixture = verifierFixture(); let time = now;
  const verify = createOwnershipVerifier({ store: fixture.store, now: () => time,
    verifyAuthority: async () => { time += 120000; return true; } });
  await expect(verify(fixture.proof, context)).rejects.toThrow('wallet_proof_expired');
});

test('a stalled store is bounded and never reaches authority lookup', async () => {
  const verifyAuthority = jest.fn();
  const verify = createOwnershipVerifier({ store: { take: () => new Promise(() => {}) },
    verifyAuthority, storeTimeoutMs: 20 });
  await expect(verify(proofFor(challenge()).proof, context)).rejects.toThrow('wallet_proof_store_timeout');
  expect(verifyAuthority).not.toHaveBeenCalled();
});

test('an authority adapter must return literal true, not a truthy error object', async () => {
  const fixture = verifierFixture();
  const verify = createOwnershipVerifier({ store: fixture.store, now: () => now,
    verifyAuthority: async () => ({ ok: false }) });
  await expect(verify(fixture.proof, context)).rejects.toThrow('wallet_proof_unauthorized');
});
