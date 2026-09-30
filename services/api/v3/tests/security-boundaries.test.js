const fs = require('fs');
const http = require('http');
const path = require('path');

const exists = fs.existsSync;
const write = fs.writeFileSync;
jest.spyOn(fs, 'existsSync').mockImplementation(file =>
  path.basename(String(file)) === 'gcsc.db' ? false : exists(file));
jest.spyOn(fs, 'writeFileSync').mockImplementation((file, ...args) => {
  if (path.basename(String(file)) !== 'gcsc.db') return write(file, ...args);
});

const server = require('../pure-server');

afterAll(() => jest.restoreAllMocks());

test('production rejects missing, short, and known JWT secrets', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'production';
  try {
    for (const value of ['', 'short', 'gcsc-dev-secret-256-bits-minimum-length',
      'your-super-secret-jwt-key-min-256-bits']) {
      if (value) process.env.JWT_SECRET = value;
      else delete process.env.JWT_SECRET;
      expect(() => server.resolveJwtSecret()).toThrow('Unsafe JWT_SECRET configuration');
    }
    process.env.JWT_SECRET = 'a'.repeat(64);
    expect(server.resolveJwtSecret()).toBe('a'.repeat(64));
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test('development refuses a missing or known JWT signing secret', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'development';
  try {
    for (const value of ['', 'short', 'gcsc-dev-secret-256-bits-minimum-length',
      'your-super-secret-jwt-key-min-256-bits']) {
      if (value) process.env.JWT_SECRET = value;
      else delete process.env.JWT_SECRET;
      expect(() => server.resolveJwtSecret()).toThrow('Unsafe JWT_SECRET configuration');
    }
    process.env.JWT_SECRET = 'local-development-secret-for-test-only-0123456789';
    expect(server.resolveJwtSecret()).toBe(process.env.JWT_SECRET);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test('direct clients cannot rotate rate-limit identity with X-Forwarded-For', () => {
  const first = server.clientIdentity({
    headers: { 'x-forwarded-for': '198.51.100.1' },
    socket: { remoteAddress: '127.0.0.1' },
  });
  const second = server.clientIdentity({
    headers: { 'x-forwarded-for': '203.0.113.9' },
    socket: { remoteAddress: '127.0.0.1' },
  });
  expect(first).toBe('127.0.0.1');
  expect(second).toBe(first);
});

test('unauthenticated bearer values cannot rotate login rate-limit identity', () => {
  const request = authorization => ({
    headers: { authorization },
    socket: { remoteAddress: '127.0.0.1' },
  });
  expect(server.clientIdentity(request('Bearer invalid-one'), 'POST /api/auth/login')).toBe('127.0.0.1');
  expect(server.clientIdentity(request('Bearer invalid-two'), 'POST /api/auth/login')).toBe('127.0.0.1');
  expect(server.clientIdentity(request('Bearer invalid-one'), 'POST /api/wallet/connect')).toBe('127.0.0.1');
});

test('authenticated rate-limit identity is stable across tokens for one user', () => {
  const tokenOne = server.jwtSign({ userId: 41, role: 'contractor', nonce: 'one' });
  const tokenTwo = server.jwtSign({ userId: 41, role: 'contractor', nonce: 'two' });
  const request = token => ({
    headers: { authorization: `Bearer ${token}` },
    socket: { remoteAddress: '127.0.0.1' },
  });
  expect(server.clientIdentity(request(tokenOne), 'POST /api/auth/login')).toBe('127.0.0.1');
  expect(server.clientIdentity(request(tokenOne), 'POST /api/wallet/connect')).toBe('127.0.0.1:user:41');
  expect(server.clientIdentity(request(tokenTwo), 'POST /api/wallet/connect')).toBe('127.0.0.1:user:41');
});

test('a demoted or disabled admin token cannot review documents', async () => {
  const { db, jwtSign } = server;
  const user = { id: 987654, email: 'admin-fixture@example.invalid', role: 'admin', is_active: true };
  const document = { id: 987654, user_id: user.id, document_type: 'contractor_license', status: 'pending' };
  db.users.push(user);
  db.user_documents.push(document);
  const token = jwtSign({ userId: user.id, email: user.email, role: 'admin' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  async function review() {
    const payload = JSON.stringify({ status: 'approved' });
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port, path: `/api/admin/documents/${document.id}/review`,
        method: 'PUT', agent: false,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, res => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.setTimeout(5000, () => req.destroy(new Error('Local fixture request timed out')));
      req.on('error', reject);
      req.end(payload);
    });
  }

  try {
    user.role = 'contractor';
    expect(await review()).toBe(403);
    expect(document.status).toBe('pending');
    user.role = 'admin';
    user.is_active = false;
    expect(await review()).toBe(403);
    expect(document.status).toBe('pending');
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.users.splice(db.users.indexOf(user), 1);
    db.user_documents.splice(db.user_documents.indexOf(document), 1);
  }
});

test('development helpers do not expose OTPs or mutate accounts by default', async () => {
  const { db } = server;
  const user = { id: 987655, email: 'dev-fixture@example.invalid', role: 'contractor', is_active: true };
  const otp = { email: user.email, otp: '123456', created_at: new Date().toISOString() };
  db.users.push(user);
  db.otp_verifications.push(otp);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  function request(pathname, method = 'GET', body) {
    const payload = body === undefined ? '' : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port, path: pathname, method, agent: false,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, res => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.setTimeout(5000, () => req.destroy(new Error('Local fixture request timed out')));
      req.on('error', reject);
      req.end(payload);
    });
  }

  try {
    expect(await request(`/api/dev/otp?email=${encodeURIComponent(user.email)}`)).toBe(404);
    expect(await request('/api/dev/verify-contractor', 'POST', { email: user.email })).toBe(404);
    expect(user.wallet).toBeUndefined();
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.users.splice(db.users.indexOf(user), 1);
    db.otp_verifications.splice(db.otp_verifications.indexOf(otp), 1);
  }
});

test('wallet challenge migration is versioned and idempotent', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'wallet-auth-migration.sql'), 'utf8');
  expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS wallet_challenges/i);
  expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_wallet_challenges_expiry/i);
  expect(sql).toMatch(/DELETE FROM wallet_challenges WHERE expires_at <= NOW\(\)/i);
});
