const fs = require('fs');
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
    for (const value of ['', 'short', 'gcsc-dev-secret-256-bits-minimum-length']) {
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

test('wallet challenge migration is versioned and idempotent', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'wallet-auth-migration.sql'), 'utf8');
  expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS wallet_challenges/i);
  expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_wallet_challenges_expiry/i);
  expect(sql).toMatch(/DELETE FROM wallet_challenges WHERE expires_at <= NOW\(\)/i);
});
