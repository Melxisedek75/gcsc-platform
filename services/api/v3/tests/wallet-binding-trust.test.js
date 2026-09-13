const http = require('http');
const fs = require('fs');
const path = require('path');

// Exercise HTTP handlers without reading or writing even the local JSON database.
const exists = fs.existsSync;
const write = fs.writeFileSync;
jest.spyOn(fs, 'existsSync').mockImplementation(file =>
  path.basename(String(file)) === 'gcsc.db' ? false : exists(file));
jest.spyOn(fs, 'writeFileSync').mockImplementation((file, ...args) => {
  if (path.basename(String(file)) !== 'gcsc.db') return write(file, ...args);
});

const server = require('../pure-server');
const { db, _hooks, jwtSign } = server;
const originalTransfer = _hooks.verifyHyperionTransfer;
let port;

const cases = [
  { role: 'contractor', endpoint: 'lead-token', body: {} },
  { role: 'homeowner', endpoint: 'job-posting', body: { project_id: 100 } },
];

function request(route, body = {}, method = 'POST', payment = true) {
  const payload = JSON.stringify(body);
  const token = jwtSign({ userId: 17, email: 'fixture@example.invalid', role: db.users[0].role });
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path: route, method, agent: false,
      headers: {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload),
        Connection: 'close', Authorization: `Bearer ${token}`,
        ...(payment ? { 'X-Payment-Tx': 'f'.repeat(64) } : {}),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('error', reject);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch (error) { reject(error); }
      });
    });
    req.setTimeout(5000, () => req.destroy(new Error('Local fixture request timed out')));
    req.on('error', reject);
    req.end(payload);
  });
}

beforeAll(done => {
  server.listen(0, '127.0.0.1', () => {
    port = server.address().port;
    done();
  });
});
afterAll(done => {
  _hooks.verifyHyperionTransfer = originalTransfer;
  server.close(() => { jest.restoreAllMocks(); done(); });
});
beforeEach(() => {
  for (const value of Object.values(db)) if (Array.isArray(value)) value.length = 0;
  db.users.push({
    id: 17, email: 'fixture@example.invalid', full_name: 'Fixture', role: 'contractor',
    is_active: 1, profile: {}, wallet: {
      accountName: 'fixture11111', permission: 'active', verified: true,
      publicKey: 'server-proof-fixture-not-a-real-key', verifiedAt: '2026-09-01T00:00:00.000Z',
      connectedAt: '2026-09-01T00:00:00.000Z',
    },
  });
  db.projects.push({ id: 100, homeowner_id: 17, published: false, status: 'open' });
  _hooks.verifyHyperionTransfer = jest.fn(async () => ({
    ok: true, from: db.users[0].wallet.accountName, block_num: 1,
  }));
});

function expectNoPaymentEffects() {
  expect(_hooks.verifyHyperionTransfer).not.toHaveBeenCalled();
  expect(db.payment_receipts).toHaveLength(0);
  expect(db.lead_tokens).toHaveLength(0);
  expect(db.job_posting_payments).toHaveLength(0);
  expect(db.projects[0].published).toBe(false);
}

describe.each(cases)('$endpoint ownership boundary', ({ role, endpoint, body }) => {
  test.each([undefined, false, 'true', 1])('does not offer payment for verified=%p', async verified => {
    db.users[0].role = role;
    db.users[0].wallet.verified = verified;
    const result = await request(`/api/payment/${endpoint}`, body, 'POST', false);
    expect(result.status).toBe(409);
    expect(result.body.code).toBe('wallet_proof_required');
    expect(result.headers['www-authenticate']).toBeUndefined();
    expectNoPaymentEffects();
  });

  test('does not offer payment without a wallet', async () => {
    db.users[0].role = role;
    db.users[0].wallet = null;
    const result = await request(`/api/payment/${endpoint}`, body, 'POST', false);
    expect(result.status).toBe(409);
    expect(result.body.code).toBe('wallet_required');
    expect(result.headers['www-authenticate']).toBeUndefined();
    expectNoPaymentEffects();
  });

  test('offers payment to a verified binding without broadcasting', async () => {
    db.users[0].role = role;
    const result = await request(`/api/payment/${endpoint}`, body, 'POST', false);
    expect(result.status).toBe(402);
    expect(result.headers['www-authenticate']).toMatch(/^Payment /);
    expectNoPaymentEffects();
  });
  test.each([undefined, false, 'true', 1])('rejects stored verified=%p before lookup', async verified => {
    db.users[0].role = role;
    db.users[0].wallet.verified = verified;
    const result = await request(`/api/payment/${endpoint}`, body);
    expect(result.status).toBe(409);
    expect(result.body.code).toBe('wallet_proof_required');
    expectNoPaymentEffects();
  });

  test('profile claim cannot turn another account into a verified payment sender', async () => {
    db.users[0].role = role;
    db.users[0].wallet = null;
    const profile = await request('/api/auth/profile', { wallet: {
      account: 'victim111111', permission: 'active', verified: true,
      publicKey: 'client-forged-proof', verifiedAt: '2026-09-01T00:00:00.000Z',
    } }, 'PUT');
    expect(profile.status).toBe(200);
    expect(profile.body.user.wallet.verified).toBe(false);
    expect(profile.body.user.wallet.publicKey).toBeUndefined();
    expect(profile.body.user.wallet.verifiedAt).toBeUndefined();
    const payment = await request(`/api/payment/${endpoint}`, body);
    expect(payment.status).toBe(409);
    expect(payment.body.code).toBe('wallet_proof_required');
    expectNoPaymentEffects();
  });
});

describe('bid readiness ownership boundary', () => {
  function completeContractorProfile() {
    db.users[0].phone = '+12025550123';
    db.users[0].profile = {
      companyName: 'Fixture', ein: '12-3456789', licenseNumber: 'fixture-license',
      serviceArea: 'Fixture City', specialties: ['plumbing'],
    };
    for (const document_type of ['contractor_license', 'insurance_certificate', 'business_ein']) {
      db.user_documents.push({ id: db.user_documents.length + 1, user_id: 17, document_type, status: 'approved' });
    }
  }

  test.each([undefined, false, 'true', 1])('metadata verified=%p cannot satisfy compliance', async verified => {
    completeContractorProfile();
    db.users[0].wallet.verified = verified;
    const result = await request('/api/auth/compliance', {}, 'GET');
    expect(result.status).toBe(200);
    expect(result.body.profile_completion.completed).toBe(true);
    expect(result.body.documents_approved).toBe(true);
    expect(result.body.wallet_connected).toBe(false);
    expect(result.body.ready_for_bids).toBe(false);
  });

  test('verified binding with approved documents satisfies compliance', async () => {
    completeContractorProfile();
    const result = await request('/api/auth/compliance', {}, 'GET');
    expect(result.body.ready_for_bids).toBe(true);
  });

  test('homeowner cannot accept a bid from metadata-only contractor', async () => {
    completeContractorProfile();
    db.users[0].wallet.verified = false;
    const contractor = { ...db.users[0], id: 18 };
    db.users.push(contractor);
    for (const doc of db.user_documents) doc.user_id = 18;
    db.users[0].role = 'homeowner';
    db.bids.push({ id: 9, contractor_id: 18, project_id: 100, status: 'pending', amount: 100 });
    const result = await request('/api/bids/9/accept');
    expect(result.status).toBe(400);
    expect(result.body.contractor_verification.ready_for_bids).toBe(false);
    expect(db.bids[0].status).toBe('pending');
    expect(db.projects[0].status).toBe('open');
    expect(db.escrow_contracts).toHaveLength(0);
  });
});

describe('profile proof scope', () => {
  test.each([
    { account: 'fixture11111', permission: 'owner' },
    { account: 'different111', permission: 'active' },
  ])('changing identity to %p invalidates and removes prior proof', async wallet => {
    const result = await request('/api/auth/profile', { wallet }, 'PUT');
    expect(result.status).toBe(200);
    expect(result.body.user.wallet.verified).toBe(false);
    expect(result.body.user.wallet.publicKey).toBeUndefined();
    expect(result.body.user.wallet.verifiedAt).toBeUndefined();
    const payment = await request('/api/payment/lead-token');
    expect(payment.status).toBe(409);
    expectNoPaymentEffects();
  });

  test('unchanged account and permission preserve server proof, not client proof fields', async () => {
    const original = { ...db.users[0].wallet };
    const result = await request('/api/auth/profile', { wallet: {
      account: original.accountName, permission: original.permission,
      publicKey: 'client-forged-proof', verifiedAt: 'client-date', verified: true,
    } }, 'PUT');
    expect(result.status).toBe(200);
    expect(result.body.user.wallet).toMatchObject(original);
    const payment = await request('/api/payment/lead-token');
    expect(payment.status).toBe(200);
    expect(_hooks.verifyHyperionTransfer).toHaveBeenCalledTimes(1);
    expect(db.lead_tokens).toHaveLength(1);
  });

  test('ordinary profile edits leave wallet proof unchanged', async () => {
    const original = { ...db.users[0].wallet };
    const result = await request('/api/auth/profile', { fullName: 'Changed Fixture' }, 'PUT');
    expect(result.status).toBe(200);
    expect(result.body.user.wallet).toEqual(original);
  });

  test('disconnect removes the binding and blocks payment', async () => {
    const result = await request('/api/auth/profile', { wallet: null }, 'PUT');
    expect(result.status).toBe(200);
    expect(result.body.user.wallet).toBeNull();
    const payment = await request('/api/payment/lead-token');
    expect(payment.status).toBe(409);
    expect(payment.body.code).toBe('wallet_required');
    expectNoPaymentEffects();
  });
});
