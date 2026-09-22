const http = require('http');
const fs = require('fs');
const path = require('path');
const { Key, Numeric, digestFromSerializedData } = require('@proton/js');

const exists = fs.existsSync;
const write = fs.writeFileSync;
jest.spyOn(fs, 'existsSync').mockImplementation(file =>
  path.basename(String(file)) === 'gcsc.db' ? false : exists(file));
jest.spyOn(fs, 'writeFileSync').mockImplementation((file, ...args) => {
  if (path.basename(String(file)) !== 'gcsc.db') return write(file, ...args);
});

const server = require('../pure-server');
const { db, _hooks } = server;
let port;

function request(route, body = {}) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path: route, method: 'POST', agent: false,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), Connection: 'close' },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end(payload);
  });
}

function privateKey() {
  return Key.PrivateKey.fromElliptic(
    Key.constructElliptic(Numeric.KeyType.k1).genKeyPair(),
    Numeric.KeyType.k1,
  );
}

function signedProof(challenge, key) {
  const bytes = Buffer.from(challenge.serializedTransaction, 'hex');
  const digest = digestFromSerializedData(challenge.chainId, bytes);
  return {
    challengeId: challenge.challengeId,
    serializedTransaction: challenge.serializedTransaction,
    signatures: [key.sign(digest, false).toString()],
  };
}

beforeAll(done => {
  server.listen(0, '127.0.0.1', () => { port = server.address().port; done(); });
});

afterAll(done => {
  server.close(() => { jest.restoreAllMocks(); done(); });
});

beforeEach(() => {
  for (const value of Object.values(db)) if (Array.isArray(value)) value.length = 0;
  db.users.push({
    id: 31,
    email: 'wallet-user@example.invalid',
    password_hash: 'unused',
    role: 'contractor',
    full_name: 'Wallet User',
    is_active: 1,
    profile: {},
    wallet: {
      accountName: 'fixture11111', permission: 'active', verified: true,
      publicKey: 'server-verified-key', verifiedAt: '2026-09-01T00:00:00.000Z',
    },
  });
  db.wallet_challenges = [];
  _hooks.verifyOwnershipAuthority = jest.fn(async () => true);
});

test('wallet-first challenge returns a bounded sign-only transaction', async () => {
  const result = await request('/api/auth/wallet/challenge', {
    accountName: 'fixture11111', permission: 'active',
  });
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({
    version: 1,
    purpose: 'login',
    accountName: 'fixture11111',
    permission: 'active',
    signingOptions: { broadcast: false, noModify: true },
  });
  expect(result.body.sessionBinding).toMatch(/^[0-9a-f]{64}$/);
  expect(db.wallet_challenges).toHaveLength(1);
});

test('valid proof issues an application token and cannot be replayed', async () => {
  const key = privateKey();
  const challenge = (await request('/api/auth/wallet/challenge', {
    accountName: 'fixture11111', permission: 'active',
  })).body;
  const body = {
    accountName: challenge.accountName,
    permission: challenge.permission,
    sessionBinding: challenge.sessionBinding,
    proof: signedProof(challenge, key),
  };

  const verified = await request('/api/auth/wallet/verify', body);
  expect(verified.status).toBe(200);
  expect(verified.body.token).toEqual(expect.any(String));
  expect(verified.body.user).toMatchObject({ id: 31, email: 'wallet-user@example.invalid' });
  expect(_hooks.verifyOwnershipAuthority).toHaveBeenCalledWith(expect.objectContaining({
    accountName: 'fixture11111', permission: 'active',
    publicKey: key.getPublicKey().toString(),
  }), expect.any(AbortSignal));

  const replay = await request('/api/auth/wallet/verify', body);
  expect(replay.status).toBe(400);
  expect(replay.body.code).toBe('wallet_proof_not_found');
});

test('wrong session cannot consume the valid challenge', async () => {
  const key = privateKey();
  const challenge = (await request('/api/auth/wallet/challenge', {
    accountName: 'fixture11111', permission: 'active',
  })).body;
  const proof = signedProof(challenge, key);

  const wrong = await request('/api/auth/wallet/verify', {
    accountName: challenge.accountName,
    permission: challenge.permission,
    sessionBinding: 'c'.repeat(64),
    proof,
  });
  expect(wrong.status).toBe(400);
  expect(wrong.body.code).toBe('wallet_proof_not_found');

  const correct = await request('/api/auth/wallet/verify', {
    accountName: challenge.accountName,
    permission: challenge.permission,
    sessionBinding: challenge.sessionBinding,
    proof,
  });
  expect(correct.status).toBe(200);
});

test('a valid signature cannot log in an unbound application user', async () => {
  const key = privateKey();
  const challenge = (await request('/api/auth/wallet/challenge', {
    accountName: 'unbound11111', permission: 'active',
  })).body;
  const result = await request('/api/auth/wallet/verify', {
    accountName: challenge.accountName,
    permission: challenge.permission,
    sessionBinding: challenge.sessionBinding,
    proof: signedProof(challenge, key),
  });
  expect(result.status).toBe(401);
  expect(result.body.code).toBe('wallet_login_unavailable');
  expect(result.body.token).toBeUndefined();
});
