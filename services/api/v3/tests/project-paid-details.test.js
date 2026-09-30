const http = require('http');
if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL) {
  throw new Error('Project-details JSON tests require NODE_ENV=test and an unset DATABASE_URL');
}
const server = require('../pure-server');

const owner = { id: 992001, role: 'homeowner', is_active: true };
const buyer = { id: 992002, role: 'contractor', is_active: true };
const other = { id: 992003, role: 'contractor', is_active: true };
const project = {
  id: 992001, homeowner_id: owner.id, title: 'Bathroom scope',
  description: 'Replace the existing bath with a shower.', category: 'Bathroom',
  budget_min: 2000, budget_max: 8000, timeline_days: 21, status: 'open',
  published: true, published_at: '2026-09-30T00:00:00.000Z', escrow_id: null,
  location: 'Private address', contact_email: 'owner@example.invalid',
  attachments: ['private-document'], future_private_field: 'not-in-contract',
};
const grant = {
  project_id: project.id, contractor_id: buyer.id, status: 'paid',
  provider_payment_id: 'synthetic-verified-payment', verified_at: '2026-09-30T00:00:00.000Z',
};
const detailKeys = [
  'id', 'title', 'description', 'category', 'budget_min', 'budget_max',
  'timeline_days', 'status', 'published_at',
].sort();
const token = user => server.jwtSign({ userId: user.id, role: user.role });
const pathFor = id => `/api/projects/${id}/details`;

function request(path, authorization) {
  return new Promise((resolve, reject) => {
    const req = http.get({
      hostname: '127.0.0.1', port: server.address().port, path, agent: false,
      headers: authorization ? { Authorization: `Bearer ${authorization}` } : {},
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) }));
    });
    req.setTimeout(5000, () => req.destroy(new Error('Local request timed out')));
    req.on('error', reject);
  });
}

beforeAll(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
});
beforeEach(() => {
  server.db.users = [owner, buyer, other].map(user => ({ ...user }));
  server.db.projects = [{ ...project }];
  server.db.project_access_entitlements = [{ ...grant }];
});
afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

function expectPrivate(response) {
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect(response.headers.vary.split(/,\s*/)).toEqual(expect.arrayContaining(['Origin', 'Authorization']));
}
function expectUnavailable(response) {
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: 'Project details unavailable', code: 'project_details_unavailable' });
  expectPrivate(response);
}

test.each([undefined, 'invalid-token'])('details reject missing or invalid JWT (%s)', async credential => {
  const response = await request(pathFor(project.id), credential);
  expect(response.status).toBe(401);
  expect(response.body).not.toHaveProperty('project');
  expectPrivate(response);
});

test('paid buyer receives exactly the approved brief fields, never contact, address, attachments or bids', async () => {
  server.db.bids = [{ project_id: project.id, contractor_id: other.id, message: 'Private competitor bid' }];
  const response = await request(pathFor(project.id), token(buyer));
  expect(response.status).toBe(200);
  expect(Object.keys(response.body)).toEqual(['project']);
  expect(Object.keys(response.body.project).sort()).toEqual(detailKeys);
  expect(response.body.project.title).toBe(project.title);
  expect(response.body.project.description).toBe(project.description);
  expect(JSON.stringify(response.body)).not.toMatch(/Private address|owner@example|private-document|not-in-contract|Private competitor bid/);
  expectPrivate(response);
});

test('active owner reads own draft without an entitlement', async () => {
  server.db.projects[0].published = false;
  server.db.project_access_entitlements = [];
  const response = await request(pathFor(project.id), token(owner));
  expect(response.status).toBe(200);
  expect(response.body.project.location).toBe(project.location);
  expectPrivate(response);
});

test('grant is bound to both buyer and project; generic lead token is insufficient', async () => {
  expectUnavailable(await request(pathFor(project.id), token(other)));
  server.db.project_access_entitlements[0].project_id += 1;
  server.db.lead_tokens = [{ contractor_id: buyer.id, tx_hash: 'synthetic', status: 'confirmed' }];
  expectUnavailable(await request(pathFor(project.id), token(buyer)));
});

test.each(['unpaid', 'pending', 'refunded', 'revoked', 'failed', 'expired'])('%s entitlement cannot disclose details', async status => {
  server.db.project_access_entitlements[0].status = status;
  expectUnavailable(await request(pathFor(project.id), token(buyer)));
});

test.each([
  ['provider_payment_id', ''], ['provider_payment_id', null], ['verified_at', null],
])('paid label without %s=%s proof is insufficient', async (field, value) => {
  server.db.project_access_entitlements[0][field] = value;
  expectUnavailable(await request(pathFor(project.id), token(buyer)));
});

test('revocation takes effect on the next read using the same JWT', async () => {
  const credential = token(buyer);
  expect((await request(pathFor(project.id), credential)).status).toBe(200);
  server.db.project_access_entitlements[0].status = 'revoked';
  expectUnavailable(await request(pathFor(project.id), credential));
});

test.each([owner, buyer])('current activation and role checked for user $id, not only JWT', async user => {
  const credential = token(user);
  const current = server.db.users.find(row => row.id === user.id);
  current.is_active = false;
  expectUnavailable(await request(pathFor(project.id), credential));
  current.is_active = true;
  current.role = user.role === 'homeowner' ? 'contractor' : 'homeowner';
  expectUnavailable(await request(pathFor(project.id), credential));
});

test('another homeowner and an admin claim cannot read the owner project', async () => {
  server.db.users[2].role = 'homeowner';
  expectUnavailable(await request(pathFor(project.id), token(server.db.users[2])));
  expectUnavailable(await request(pathFor(project.id), server.jwtSign({ userId: owner.id, role: 'admin' })));
});

test.each([
  ['published', false], ['status', 'closed'], ['status', 'in_progress'], ['escrow_id', 123],
])('paid buyer cannot read a non-open offer (%s=%s)', async (field, value) => {
  server.db.projects[0][field] = value;
  expectUnavailable(await request(pathFor(project.id), token(buyer)));
});

test.each(['0', '-1', '992001garbage', '1e3', '01', '2147483648', '9007199254740992', '992009'])('invalid or missing project %s has the same private denial', async id => {
  expectUnavailable(await request(pathFor(id), token(buyer)));
});

test('paid entitlement does not change the public preview response', async () => {
  const response = await request(`/api/projects/${project.id}`, token(buyer));
  expect(response.status).toBe(200);
  expect(response.body.project).not.toHaveProperty('description');
  expect(response.body.project.title).toBe('Bathroom project');
});
