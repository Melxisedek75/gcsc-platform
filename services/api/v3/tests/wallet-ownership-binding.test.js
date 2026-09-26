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
const { db, _hooks, jwtSign } = server;
let port;

function request(route, token, body = {}) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path: route, method: 'POST', agent: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${token}`,
        Connection: 'close',
      },
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
    id: 41,
    email: 'binding-user@example.invalid',
    password_hash: 'unused',
    role: 'contractor',
    full_name: 'Binding User',
    is_active: 1,
    profile: {},
    wallet: null,
  });
  db.wallet_challenges = [];
  _hooks.verifyOwnershipAuthority = jest.fn(async () => true);
});

test('authenticated canonical proof binds a verified wallet and cannot be replayed', async () => {
  const token = jwtSign({ userId: 41, email: 'binding-user@example.invalid', role: 'contractor' });
  const key = privateKey();
  const challengeResult = await request('/api/wallet/ownership/challenge', token, {
    accountName: 'fixture11111', permission: 'active',
  });
  expect(challengeResult.status).toBe(200);
  expect(challengeResult.body).toMatchObject({
    purpose: 'link', accountName: 'fixture11111', permission: 'active',
    signingOptions: { broadcast: false, noModify: true },
  });

  const body = {
    accountName: challengeResult.body.accountName,
    permission: challengeResult.body.permission,
    proof: signedProof(challengeResult.body, key),
  };
  const verified = await request('/api/wallet/ownership/verify', token, body);
  expect(verified.status).toBe(200);
  expect(verified.body.user.wallet).toMatchObject({
    accountName: 'fixture11111', permission: 'active', verified: true,
    publicKey: key.getPublicKey().toString(),
  });
  expect(_hooks.verifyOwnershipAuthority).toHaveBeenCalledTimes(1);

  const replay = await request('/api/wallet/ownership/verify', token, body);
  expect(replay.status).toBe(400);
  expect(replay.body.code).toBe('wallet_proof_not_found');
});

test('a challenge is bound to the application session that requested it', async () => {
  db.users.push({
    id: 42, email: 'other@example.invalid', password_hash: 'unused', role: 'homeowner',
    full_name: 'Other User', is_active: 1, profile: {}, wallet: null,
  });
  const first = jwtSign({ userId: 41, email: 'binding-user@example.invalid', role: 'contractor' });
  const second = jwtSign({ userId: 42, email: 'other@example.invalid', role: 'homeowner' });
  const key = privateKey();
  const challenge = (await request('/api/wallet/ownership/challenge', first, {
    accountName: 'fixture11111', permission: 'active',
  })).body;
  const proof = signedProof(challenge, key);

  const wrongSession = await request('/api/wallet/ownership/verify', second, {
    accountName: challenge.accountName, permission: challenge.permission, proof,
  });
  expect(wrongSession.status).toBe(400);
  expect(wrongSession.body.code).toBe('wallet_proof_not_found');

  const originalSession = await request('/api/wallet/ownership/verify', first, {
    accountName: challenge.accountName, permission: challenge.permission, proof,
  });
  expect(originalSession.status).toBe(200);
  expect(db.users[0].wallet.verified).toBe(true);
  expect(db.users[1].wallet).toBeNull();
});
