const {
  createJsonChallengeStore,
  createPostgresChallengeStore,
} = require('../wallet-challenge-store.cjs');

const context = {
  purpose: 'link',
  audience: 'https://app.example.invalid',
  chainId: '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd',
  accountName: 'fixture11111',
  permission: 'active',
  sessionBinding: 'b'.repeat(64),
};

function record(overrides = {}) {
  return {
    version: 1,
    challengeId: 'a'.repeat(64),
    issuedAt: 1893456000000,
    expiresAt: 1893456120000,
    serializedTransaction: '00aa',
    transaction: { actions: [] },
    signingOptions: { broadcast: false, noModify: true },
    ...context,
    ...overrides,
  };
}

test('JSON store survives adapter recreation and consumes a challenge once', async () => {
  const database = { wallet_challenges: [] };
  const save = jest.fn();
  await createJsonChallengeStore({ database, save }).put(record());

  const restarted = createJsonChallengeStore({ database, save });
  await expect(restarted.take('a'.repeat(64), context)).resolves.toMatchObject({
    challengeId: 'a'.repeat(64),
    sessionBinding: context.sessionBinding,
  });
  await expect(restarted.take('a'.repeat(64), context)).resolves.toBeNull();
  expect(save).toHaveBeenCalledTimes(2);
});

test('wrong JSON context neither returns nor consumes another session challenge', async () => {
  const database = { wallet_challenges: [] };
  const store = createJsonChallengeStore({ database, save: () => {} });
  await store.put(record());

  await expect(store.take('a'.repeat(64), {
    ...context,
    sessionBinding: 'c'.repeat(64),
  })).resolves.toBeNull();
  await expect(store.take('a'.repeat(64), context)).resolves.toHaveProperty('challengeId');
});

test('concurrent JSON takes produce exactly one winner', async () => {
  const database = { wallet_challenges: [] };
  const store = createJsonChallengeStore({ database, save: () => {} });
  await store.put(record());
  const results = await Promise.all([
    store.take('a'.repeat(64), context),
    store.take('a'.repeat(64), context),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
});

test('PostgreSQL take is one atomic delete bound to the complete context', async () => {
  const query = jest.fn(async (sql, params) => ({
    rows: [{ challenge_record: record() }],
    sql,
    params,
  }));
  const store = createPostgresChallengeStore({ query });
  const result = await store.take('a'.repeat(64), context);

  expect(result).toMatchObject({ challengeId: 'a'.repeat(64) });
  const [sql, params] = query.mock.calls[0];
  expect(sql).toMatch(/DELETE FROM wallet_challenges/i);
  expect(sql).toMatch(/RETURNING challenge_record/i);
  expect(params).toEqual([
    'a'.repeat(64), context.purpose, context.audience, context.chainId,
    context.accountName, context.permission, context.sessionBinding,
  ]);
});

test('stores reject malformed or mismatched challenge records', async () => {
  const store = createJsonChallengeStore({ database: { wallet_challenges: [] }, save: () => {} });
  await expect(store.put(record({ challengeId: 'short' }))).rejects.toThrow('wallet_proof_store_invalid');
  await expect(store.take('short', context)).rejects.toThrow('wallet_proof_store_invalid');
});
