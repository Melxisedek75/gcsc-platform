const http = require('http');
if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL) {
  throw new Error('XPR project-access tests require isolated JSON test storage');
}
const server = require('../pure-server');
const { db, _hooks, jwtSign } = server;
const originalVerifier = _hooks.verifyHyperionTransfer;
const originalFetch = global.fetch;
const originalHyperionUrls = process.env.XPR_TESTNET_HYPERION_URLS;
const owner = { id: 993001, role: 'homeowner', is_active: true };
const buyer = { id: 993002, role: 'contractor', is_active: true,
  wallet: { accountName: 'testworker11', permission: 'active', verified: true } };
const other = { id: 993003, role: 'contractor', is_active: true,
  wallet: { accountName: 'testother11', permission: 'active', verified: true } };
const project = { id: 993001, homeowner_id: owner.id, title: 'Test bathroom', status: 'open',
  published: true, escrow_id: null, budget_min: 100, budget_max: 200, timeline_days: 7 };
const token = user => jwtSign({ userId: user.id, role: user.role });
const hash = 'a'.repeat(64);
const route = `/api/payment/project-access/${project.id}`;

function request(path, user, txHash, body, attemptKey = 'b'.repeat(32)) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port,
      path, method: 'POST', agent: false,
      headers: { ...(user ? { Authorization: `Bearer ${token(user)}` } : {}),
        ...(txHash ? { 'X-Payment-Tx': txHash } : {}),
        ...(path.startsWith('/api/payment/project-access/') ? { 'X-Payment-Attempt': attemptKey } : {}),
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}) },
    }, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

beforeAll(async () => new Promise(resolve => server.listen(0, '127.0.0.1', resolve)));
afterAll(async () => {
  _hooks.verifyHyperionTransfer = originalVerifier;
  global.fetch = originalFetch;
  if (originalHyperionUrls === undefined) delete process.env.XPR_TESTNET_HYPERION_URLS;
  else process.env.XPR_TESTNET_HYPERION_URLS = originalHyperionUrls;
  await new Promise(resolve => server.close(resolve));
});
beforeEach(() => {
  global.fetch = originalFetch;
  delete process.env.XPR_TESTNET_HYPERION_URLS;
  db.users = [{ ...owner }, { ...buyer, wallet: { ...buyer.wallet } },
    { ...other, wallet: { ...other.wallet } }];
  db.projects = [{ ...project }];
  db.payment_receipts = [];
  db.project_access_entitlements = [];
  db.project_access_xpr_attempts = [];
  db.bids = [];
  _hooks.verifyHyperionTransfer = originalVerifier;
});

test('quote binds one open project, Testnet recipient, amount and memo', async () => {
  const result = await request(route, buyer);
  expect(result.status).toBe(402);
  expect(result.headers['www-authenticate']).toBe(
    `Payment recipient="gcsctoken111" amount="50.0000 XPR" memo="gcsc:project:${project.id}"`);
  expect(result.body.payment.project_id).toBe(project.id);
  expect(db.project_access_xpr_attempts).toHaveLength(1);
});

test('a second device cannot obtain a separate quote for the same contractor and project', async () => {
  expect((await request(route, buyer)).status).toBe(402);
  const second = await request(route, buyer, null, null, 'c'.repeat(32));
  expect(second.status).toBe(409);
  expect(second.body.code).toBe('project_payment_reserved');
  expect((await request(route, buyer)).status).toBe(402);
});

test('missing identity, wrong role, unavailable project or wallet cannot request funds', async () => {
  expect((await request(route)).status).toBe(401);
  expect((await request(route, owner)).status).toBe(403);
  db.projects[0].status = 'closed';
  expect((await request(route, buyer)).status).toBe(409);
  db.projects[0].status = 'open';
  db.users[1].wallet.verified = false;
  expect((await request(route, buyer)).status).toBe(409);
  db.users[1].wallet = { accountName: 'gcsctoken111', permission: 'active', verified: true };
  expect((await request(route, buyer)).body.code).toBe('self_payment_not_allowed');
});

test('verified transfer grants only the buyer and project, allowing a normal bid', async () => {
  expect((await request(route, buyer)).status).toBe(402);
  _hooks.verifyHyperionTransfer = jest.fn().mockResolvedValue({ ok: true, from: 'testworker11', block_num: 99 });
  const paid = await request(route, buyer, hash);
  expect(paid.status).toBe(200);
  expect(paid.body).toMatchObject({ project_id: project.id, tx_hash: hash, access_status: 'paid', pending: false });
  expect(_hooks.verifyHyperionTransfer).toHaveBeenCalledWith(expect.objectContaining({
    txHash: hash, expectedRecipient: 'gcsctoken111', expectedAmount: '50.0000 XPR',
    expectedMemo: `gcsc:project:${project.id}`, expectedFrom: 'testworker11',
  }));
  expect(db.project_access_entitlements).toHaveLength(1);
  expect(db.project_access_entitlements[0]).toMatchObject({ project_id: project.id,
    contractor_id: buyer.id, status: 'paid', provider_payment_id: hash });
  expect((await request('/api/bids', other, null, { project_id: project.id, amount: 190 })).status).toBe(403);
  expect((await request('/api/bids', buyer, null, { project_id: project.id, amount: 190,
    proposed_timeline_days: 21 })).status).toBe(201);
});

test('pending or invalid transfer never grants access; same hash cannot buy another project', async () => {
  expect((await request(route, buyer)).status).toBe(402);
  _hooks.verifyHyperionTransfer = jest.fn().mockResolvedValue({ ok: false, pending: true,
    error: 'no_authoritative_node' });
  const pending = await request(route, buyer, hash);
  expect(pending.status).toBe(200);
  expect(pending.body.pending).toBe(true);
  expect(db.project_access_entitlements).toHaveLength(0);
  expect((await request('/api/bids', buyer, null, { project_id: project.id, amount: 190 })).status).toBe(403);
  db.projects.push({ ...project, id: project.id + 1 });
  expect((await request(`/api/payment/project-access/${project.id + 1}`, buyer, hash)).status).toBe(409);
});

test('definitively invalid transfer and previously paid access cannot trigger a new payment', async () => {
  expect((await request(route, buyer)).status).toBe(402);
  _hooks.verifyHyperionTransfer = jest.fn().mockResolvedValue({ ok: false, error: 'bad_memo' });
  expect((await request(route, buyer, hash)).status).toBe(400);
  expect(db.payment_receipts).toHaveLength(0);
  db.project_access_entitlements.push({ project_id: project.id, contractor_id: buyer.id,
    status: 'paid', provider_payment_id: 'verified-previous-payment', verified_at: new Date().toISOString() });
  expect((await request(route, buyer)).status).toBe(409);
});

test('confirmed payment after project closure is recorded for review, never silently grants access', async () => {
  expect((await request(route, buyer)).status).toBe(402);
  _hooks.verifyHyperionTransfer = jest.fn().mockImplementation(async () => {
    db.projects[0].status = 'closed';
    return { ok: true, from: 'testworker11', block_num: 99 };
  });
  const result = await request(route, buyer, hash);
  expect(result.body.access_status).toBe('review_required');
  expect(db.payment_receipts).toHaveLength(1);
  expect(db.project_access_entitlements).toHaveLength(0);
});

test('the real verifier binds Testnet chain, sender permission, timestamp and project memo', async () => {
  process.env.XPR_TESTNET_HYPERION_URLS = 'https://test-node.invalid';
  const chainId = '71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd';
  const transfer = { timestamp: new Date().toISOString(), block_num: 100,
    act: { account: 'eosio.token', name: 'transfer',
      authorization: [{ actor: buyer.wallet.accountName, permission: 'active' }],
      data: { from: buyer.wallet.accountName, to: 'gcsctoken111',
        quantity: '50.0000 XPR', memo: `gcsc:project:${project.id}` } } };
  let nodeChainId = chainId;
  global.fetch = jest.fn(async url => ({ ok: true, status: 200,
    json: async () => String(url).includes('/get_info')
      ? { chain_id: nodeChainId } : { executed: true, actions: [transfer] } }));
  const terms = { txHash: hash, expectedRecipient: 'gcsctoken111',
    expectedAmount: '50.0000 XPR', expectedMemo: `gcsc:project:${project.id}`,
    expectedFrom: buyer.wallet.accountName, expectedPermission: 'active', requireTestnet: true };
  expect((await originalVerifier(terms)).ok).toBe(true);
  transfer.act.authorization[0].permission = 'owner';
  expect((await originalVerifier(terms)).error).toBe('bad_permission');
  transfer.act.authorization[0].permission = 'active';
  delete transfer.timestamp;
  expect((await originalVerifier(terms)).error).toBe('missing_tx_timestamp');
  transfer.timestamp = new Date().toISOString();
  transfer.act.data.memo = 'gcsc:project:999';
  expect((await originalVerifier(terms)).error).toBe('bad_memo');
  transfer.act.data.memo = `gcsc:project:${project.id}`;
  nodeChainId = 'mainnet-chain-id';
  expect((await originalVerifier(terms)).ok).toBe(false);
});

test('pending receipt blocks a second quote and reconciliation grants access only after verification', async () => {
  expect((await request(route, buyer)).status).toBe(402);
  _hooks.verifyHyperionTransfer = jest.fn()
    .mockResolvedValueOnce({ ok: false, pending: true })
    .mockResolvedValueOnce({ ok: true, from: buyer.wallet.accountName, block_num: 105 });
  expect((await request(route, buyer, hash)).body.pending).toBe(true);
  expect((await request(route, buyer)).body.code).toBe('project_payment_unresolved');
  await server.reconcilePendingPayments();
  expect(db.project_access_entitlements).toHaveLength(1);
  expect((await request(route, buyer, hash)).body.access_status).toBe('paid');
  expect(_hooks.verifyHyperionTransfer).toHaveBeenLastCalledWith(expect.objectContaining({
    expectedMemo: `gcsc:project:${project.id}`, expectedPermission: 'active', requireTestnet: true,
  }));
});

test('pending transfer is reconciled against the wallet permission captured before an account switch', async () => {
  expect((await request(route, buyer)).status).toBe(402);
  _hooks.verifyHyperionTransfer = jest.fn()
    .mockResolvedValueOnce({ ok: false, pending: true })
    .mockResolvedValueOnce({ ok: true, from: buyer.wallet.accountName });
  expect((await request(route, buyer, hash)).body.pending).toBe(true);
  db.users[1].wallet = { accountName: 'newwallet111', permission: 'owner', verified: true };
  await server.reconcilePendingPayments();
  expect(db.project_access_entitlements[0].status).toBe('paid');
  expect(_hooks.verifyHyperionTransfer).toHaveBeenLastCalledWith(expect.objectContaining({
    expectedFrom: buyer.wallet.accountName, expectedPermission: 'active', requireTestnet: true,
  }));
});

test('an existing revoked provider entitlement is not overwritten by a new XPR receipt', async () => {
  expect((await request(route, buyer)).status).toBe(402);
  db.project_access_entitlements.push({ project_id: project.id, contractor_id: buyer.id,
    status: 'revoked', provider_payment_id: 'stripe-existing', verified_at: new Date().toISOString() });
  _hooks.verifyHyperionTransfer = jest.fn().mockResolvedValue({ ok: true, from: buyer.wallet.accountName });
  expect((await request(route, buyer, hash)).body.access_status).toBe('review_required');
  expect(db.project_access_entitlements[0].provider_payment_id).toBe('stripe-existing');
  expect((await request(route, buyer)).body.code).toBe('project_access_exists');
});
