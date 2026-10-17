const http = require('http');
const { Pool } = require('pg');

const { validateLocalTestDatabase } = require('../../../../scripts/local-test-database.cjs');
const databaseUrl = validateLocalTestDatabase(process.env.TEST_DATABASE_URL);

process.env.DATABASE_URL = databaseUrl;
process.env.PGSSL = 'false';

const originalLegacyPosting = process.env.ENABLE_LEGACY_XPR_JOB_POSTING;
process.env.ENABLE_LEGACY_XPR_JOB_POSTING = 'true';
const mod = require('../pure-server');
if (originalLegacyPosting === undefined) delete process.env.ENABLE_LEGACY_XPR_JOB_POSTING;
else process.env.ENABLE_LEGACY_XPR_JOB_POSTING = originalLegacyPosting;
const { db, _hooks, jwtSign } = mod;

const CONTRACTOR_TOKEN = jwtSign({ userId: 2, email: 'contractor@gcsc.store', role: 'contractor' });
const OTHER_CONTRACTOR_TOKEN = jwtSign({ userId: 3, email: 'other@gcsc.store', role: 'contractor' });
const HOMEOWNER_TOKEN = jwtSign({ userId: 1, email: 'homeowner@gcsc.store', role: 'homeowner' });
const LEAD_TX = 'c'.repeat(64);
const JOB_TX = 'd'.repeat(64);

let baseUrl;
let listener;
let pool;
let originalVerifier;

function request({ path, token, txHash, body }) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const url = new URL(baseUrl + path);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(txHash ? { 'X-Payment-Tx': txHash } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: JSON.parse(responseBody),
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function countRows(table, txHash) {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE tx_hash = $1`, [txHash]);
  return result.rows[0].count;
}

beforeAll(async () => {
  expect(typeof mod.initStorage).toBe('function');
  expect(typeof mod.closeStorage).toBe('function');

  await mod.initStorage();
  pool = new Pool({ connectionString: databaseUrl });
  originalVerifier = _hooks.verifyHyperionTransfer;

  listener = mod.listen(0, '127.0.0.1');
  await new Promise(resolve => listener.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${listener.address().port}`;
}, 30000);

beforeEach(async () => {
  await pool.query(`
    TRUNCATE TABLE job_posting_payments, lead_tokens, payment_receipts, projects, users
    RESTART IDENTITY CASCADE
  `);
  // Stored bindings represent ownership already verified by the server.
  await pool.query(`
    INSERT INTO users (id, email, password_hash, role, full_name, wallet, is_verified, is_active)
    VALUES
      (1, 'homeowner@gcsc.store', 'test-hash', 'homeowner', 'Test Homeowner', '{"accountName":"homeowner1","permission":"active","verified":true}'::jsonb, TRUE, TRUE),
      (2, 'contractor@gcsc.store', 'test-hash', 'contractor', 'Test Contractor', '{"accountName":"contractor1","permission":"active","verified":true}'::jsonb, TRUE, TRUE),
      (3, 'other@gcsc.store', 'test-hash', 'contractor', 'Other Contractor', '{"accountName":"contractor2","permission":"active","verified":true}'::jsonb, TRUE, TRUE)
  `);
  await pool.query(`
    INSERT INTO projects (id, homeowner_id, title, description, category, status)
    VALUES (100, 1, 'Postgres payment project', 'test', 'general', 'open')
  `);

  db.payment_receipts.length = 0;
  db.lead_tokens.length = 0;
  db.job_posting_payments.length = 0;
  db.projects.length = 0;
  _hooks.verifyHyperionTransfer = async (input) => {
    const expectedByRole = input.expectedAmount === '50.0000 XPR' ? 'contractor1' : 'homeowner1';
    expect(input.expectedFrom).toBe(expectedByRole);
    return { ok: true, from: expectedByRole, block_num: 12345 };
  };
});

afterAll(async () => {
  _hooks.verifyHyperionTransfer = originalVerifier;
  if (listener) await new Promise(resolve => listener.close(resolve));
  if (pool) await pool.end();
  await mod.closeStorage();
});

test('lead-token receipt survives in-memory reset and same-owner replay returns its confirmed state', async () => {
  const first = await request({
    path: '/api/payment/lead-token',
    token: CONTRACTOR_TOKEN,
    txHash: LEAD_TX.toUpperCase(),
  });
  expect(first.status).toBe(200);

  db.payment_receipts.length = 0;
  db.lead_tokens.length = 0;

  const replay = await request({
    path: '/api/payment/lead-token',
    token: CONTRACTOR_TOKEN,
    txHash: LEAD_TX,
  });
  expect(replay.status).toBe(200);
  expect(replay.body).toMatchObject({ tx_hash: LEAD_TX, lead_id: first.body.lead_id,
    pending: false, lead_status: 'active' });
  expect(await countRows('payment_receipts', LEAD_TX)).toBe(1);
  expect(await countRows('lead_tokens', LEAD_TX)).toBe(1);
});

test('job-posting receipt and project publication persist and duplicate returns 409', async () => {
  const first = await request({
    path: '/api/payment/job-posting',
    token: HOMEOWNER_TOKEN,
    txHash: JOB_TX,
    body: { project_id: 100 },
  });
  expect(first.status).toBe(200);

  db.payment_receipts.length = 0;
  db.job_posting_payments.length = 0;
  db.projects.length = 0;

  const replay = await request({
    path: '/api/payment/job-posting',
    token: HOMEOWNER_TOKEN,
    txHash: JOB_TX,
    body: { project_id: 100 },
  });
  expect(replay.status).toBe(409);
  expect(await countRows('payment_receipts', JOB_TX)).toBe(1);
  expect(await countRows('job_posting_payments', JOB_TX)).toBe(1);

  const project = await pool.query('SELECT published, published_at FROM projects WHERE id = 100');
  expect(project.rows[0].published).toBe(true);
  expect(project.rows[0].published_at).toBeTruthy();
});

test('concurrent duplicate lead-token requests create one atomic receipt', async () => {
  const results = await Promise.all([
    request({ path: '/api/payment/lead-token', token: CONTRACTOR_TOKEN, txHash: LEAD_TX }),
    request({ path: '/api/payment/lead-token', token: CONTRACTOR_TOKEN, txHash: LEAD_TX }),
  ]);

  expect(results.map(result => result.status)).toEqual([200, 200]);
  expect(results[0].body.lead_id).toBe(results[1].body.lead_id);
  for (const result of results) {
    expect(result.body).toMatchObject({ tx_hash: LEAD_TX, pending: false, lead_status: 'active' });
  }
  expect(await countRows('payment_receipts', LEAD_TX)).toBe(1);
  expect(await countRows('lead_tokens', LEAD_TX)).toBe(1);
});

test('foreign-owner lead-token replay stays 409 without revealing receipt identifiers', async () => {
  const first = await request({ path: '/api/payment/lead-token', token: CONTRACTOR_TOKEN, txHash: LEAD_TX });
  expect(first.status).toBe(200);
  _hooks.verifyHyperionTransfer = jest.fn();
  const replay = await request({ path: '/api/payment/lead-token', token: OTHER_CONTRACTOR_TOKEN, txHash: LEAD_TX });
  expect(replay.status).toBe(409);
  expect(replay.body).toEqual({ error: 'Payment already processed' });
  expect(_hooks.verifyHyperionTransfer).not.toHaveBeenCalled();
  expect(await countRows('payment_receipts', LEAD_TX)).toBe(1);
  expect(await countRows('lead_tokens', LEAD_TX)).toBe(1);
  const stored = await pool.query('SELECT user_id FROM payment_receipts WHERE tx_hash = $1', [LEAD_TX]);
  expect(stored.rows[0].user_id).toBe(2);
});

test('same-owner pending replay stays withheld until the persisted receipt is reconciled', async () => {
  _hooks.verifyHyperionTransfer = jest.fn()
    .mockResolvedValueOnce({ ok: false, pending: true, error: 'node_stale' })
    .mockResolvedValueOnce({ ok: true, from: 'contractor1', block_num: 12345 });
  const payment = { path: '/api/payment/lead-token', token: CONTRACTOR_TOKEN, txHash: LEAD_TX };
  const first = await request(payment);
  expect(first.status).toBe(200);
  expect(first.body).toMatchObject({ tx_hash: LEAD_TX, pending: true, lead_status: 'pending_verification' });
  db.payment_receipts.length = 0;
  db.lead_tokens.length = 0;
  const pending = await request(payment);
  expect(pending.status).toBe(200);
  expect(pending.body).toMatchObject({ tx_hash: LEAD_TX, lead_id: first.body.lead_id,
    pending: true, lead_status: 'pending_verification' });
  expect(_hooks.verifyHyperionTransfer).toHaveBeenCalledTimes(1);
  const before = await pool.query(`SELECT r.user_id, r.verification_status, l.status
    FROM payment_receipts r JOIN lead_tokens l ON l.tx_hash = r.tx_hash WHERE r.tx_hash = $1`, [LEAD_TX]);
  expect(before.rows[0]).toEqual({ user_id: 2, verification_status: 'pending', status: 'pending_verification' });
  await mod.reconcilePendingPayments();
  const confirmed = await request(payment);
  expect(confirmed.status).toBe(200);
  expect(confirmed.body).toMatchObject({ tx_hash: LEAD_TX, lead_id: first.body.lead_id,
    pending: false, lead_status: 'active' });
  expect(_hooks.verifyHyperionTransfer).toHaveBeenCalledTimes(2);
  expect(await countRows('payment_receipts', LEAD_TX)).toBe(1);
  expect(await countRows('lead_tokens', LEAD_TX)).toBe(1);
  const after = await pool.query(`SELECT r.user_id, r.verification_status, l.status
    FROM payment_receipts r JOIN lead_tokens l ON l.tx_hash = r.tx_hash WHERE r.tx_hash = $1`, [LEAD_TX]);
  expect(after.rows[0]).toEqual({ user_id: 2, verification_status: 'confirmed', status: 'active' });
});
