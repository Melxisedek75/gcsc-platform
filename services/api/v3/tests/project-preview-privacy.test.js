const http = require('http');
const server = require('../pure-server');

const owner = { id: 991001, email: 'project-owner@example.invalid', role: 'homeowner', is_active: true };
const otherOwner = { id: 991002, email: 'other-owner@example.invalid', role: 'homeowner', is_active: true };
const contractor = { id: 991003, email: 'project-contractor@example.invalid', role: 'contractor', is_active: true };
const secretDescription = 'Call 555-0100; gate code 4321';
const secretLocation = '123 Private Street, Seattle';

const draft = {
  id: 991001,
  homeowner_id: owner.id,
  title: 'Private bathroom at 123 Private Street',
  description: secretDescription,
  location: secretLocation,
  category: 'bathroom',
  budget_min: 1000,
  budget_max: 5000,
  timeline_days: 30,
  status: 'open',
  published: false,
  created_at: '2026-09-28T00:00:00.000Z',
};
const published = {
  ...draft,
  id: 991002,
  title: 'Repair at 123 Private Street',
  published: true,
  published_at: '2026-09-28T01:00:00.000Z',
};
const acceptedProject = {
  ...published,
  id: 991003,
  status: 'in_progress',
  escrow_id: 991001,
};
const electricalProject = {
  ...published,
  id: 991004,
  category: 'Electrical',
};
const acceptedEscrow = {
  id: 991001,
  project_id: acceptedProject.id,
  homeowner_id: owner.id,
  contractor_id: contractor.id,
  status: 'pending',
};
const proposal = {
  id: 991001,
  project_id: published.id,
  contractor_id: contractor.id,
  amount: 3000,
  proposal: 'Private contractor proposal',
  status: 'pending',
};
const acceptedProposal = { ...proposal, id: 991002, project_id: acceptedProject.id, status: 'accepted' };

function request(path, token, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: server.address().port,
      path,
      method,
      agent: false,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }),
      },
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) }));
    });
    req.setTimeout(5000, () => req.destroy(new Error('Local request timed out')));
    req.on('error', reject);
    req.end(payload);
  });
}

beforeAll(async () => {
  server.db.users.push(owner, otherOwner, contractor);
  server.db.projects.push(draft, published, acceptedProject, electricalProject);
  server.db.bids.push(proposal, acceptedProposal);
  server.db.escrow_contracts.push(acceptedEscrow);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
  for (const [table, rows] of [
    [server.db.users, [owner, otherOwner, contractor]],
    [server.db.projects, [draft, published, acceptedProject, electricalProject]],
    [server.db.bids, [proposal, acceptedProposal]],
    [server.db.escrow_contracts, [acceptedEscrow]],
  ]) {
    for (const row of rows) {
      const index = table.indexOf(row);
      if (index >= 0) table.splice(index, 1);
    }
  }
});

test('public catalog includes only published, redacted project previews', async () => {
  const response = await request('/api/projects');
  expect(response.status).toBe(200);
  expect(response.body.projects).toHaveLength(2);
  expect(response.body.projects.map(project => project.id)).not.toContain(draft.id);
  expect(response.body.projects.map(project => project.id)).not.toContain(acceptedProject.id);
  expect(JSON.stringify(response.body)).not.toMatch(/123 Private Street|555-0100|4321|Private contractor proposal/);
  expect(response.body.projects[0]).not.toHaveProperty('description');
  expect(response.body.projects[0]).not.toHaveProperty('homeowner_id');
  expect(response.body.projects[0]).not.toHaveProperty('location');
  expect(response.body.projects[0]).toHaveProperty('published_at');
  expect(response.body.projects[0]).not.toHaveProperty('created_at');
});

test('public catalog cannot infer a private address through location filtering', async () => {
  const response = await request('/api/projects?location=Private%20Street');
  expect(response.status).toBe(400);
});

test('creating a private project does not copy free text into the audit event', async () => {
  const token = server.jwtSign({ userId: owner.id, role: 'homeowner' });
  const beforeProjects = server.db.projects.length;
  const beforeAudits = server.db.audit_events.length;
  try {
    const response = await request('/api/projects', token, 'POST', {
      title: 'Private title 555-0100',
      description: 'Private description 555-0100',
      category: 'Private category 555-0100',
      location: 'Private address 555-0100',
      budget_min: 1000,
    });
    expect(response.status).toBe(201);
    expect(response.body.project.location).toBe('Private address 555-0100');
    const audit = server.db.audit_events.find(event => event.action === 'project.created'
      && event.entity_id === response.body.project.id);
    expect(audit).toBeDefined();
    expect(audit.metadata.project_id).toBe(response.body.project.id);
    expect(JSON.stringify(audit.metadata)).not.toMatch(/Private|555-0100/);
  } finally {
    server.db.projects.splice(beforeProjects);
    server.db.audit_events.splice(beforeAudits);
  }
});

test('unpublished project is hidden from everyone except its active owner', async () => {
  const strangerToken = server.jwtSign({ userId: otherOwner.id, role: 'homeowner' });
  expect((await request(`/api/projects/${draft.id}`)).status).toBe(404);
  expect((await request(`/api/projects/${draft.id}`, strangerToken)).status).toBe(404);
  const ownerToken = server.jwtSign({ userId: owner.id, role: 'homeowner' });
  const response = await request(`/api/projects/${draft.id}`, ownerToken);
  expect(response.status).toBe(200);
  expect(response.body.project.description).toBe(secretDescription);
  expect(response.body.project.location).toBe(secretLocation);
});

test('personal project responses cannot be shared or stored by caches', async () => {
  const ownerToken = server.jwtSign({ userId: owner.id, role: 'homeowner' });
  const contractorToken = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  for (const [path, token] of [
    [`/api/projects/${draft.id}`, ownerToken],
    ['/api/projects/my/projects', ownerToken],
    [`/api/projects/${acceptedProject.id}`, contractorToken],
    ['/api/projects/my/projects', contractorToken],
  ]) {
    const response = await request(path, token);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers.vary.split(/,\s*/)).toEqual(expect.arrayContaining(['Origin', 'Authorization']));
  }
});

test('a contractor bid list cannot be shared or stored by caches', async () => {
  const contractorToken = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  const response = await request('/api/bids/my/bids', contractorToken);
  expect(response.status).toBe(200);
  expect(response.body.bids.some(bid => bid.proposal === proposal.proposal)).toBe(true);
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect(response.headers.vary.split(/,\s*/)).toEqual(expect.arrayContaining(['Origin', 'Authorization']));
});

test.each([owner, contractor])('personal projects are empty if user $id is disabled during the read', async user => {
  const token = server.jwtSign({ userId: user.id, role: user.role });
  const originalActive = Object.getOwnPropertyDescriptor(user, 'is_active');
  let active = true;
  let signalRoleCheck;
  const roleChecked = new Promise(resolve => { signalRoleCheck = resolve; });
  Object.defineProperty(user, 'is_active', {
    configurable: true,
    get() {
      signalRoleCheck();
      return active;
    },
    set(value) { active = value; },
  });
  try {
    const pending = request('/api/projects/my/projects', token);
    await roleChecked;
    user.is_active = false;
    const response = await pending;
    expect(response.status).toBe(200);
    expect(response.body.projects).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain(secretDescription);
  } finally {
    Object.defineProperty(user, 'is_active', originalActive);
  }
});

test('a disabled or demoted contractor cannot read proposals with an old token', async () => {
  const token = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  try {
    contractor.is_active = false;
    expect((await request('/api/bids/my/bids', token)).status).toBe(403);
    contractor.is_active = true;
    contractor.role = 'homeowner';
    expect((await request('/api/bids/my/bids', token)).status).toBe(403);
  } finally {
    contractor.is_active = true;
    contractor.role = 'contractor';
  }
});

test('a contractor bid list cannot disclose proposals after role revocation during the read', async () => {
  const token = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  const originalActive = Object.getOwnPropertyDescriptor(contractor, 'is_active');
  let active = true;
  let signalRoleCheck;
  const roleChecked = new Promise(resolve => { signalRoleCheck = resolve; });
  Object.defineProperty(contractor, 'is_active', {
    configurable: true,
    get() {
      signalRoleCheck();
      return active;
    },
    set(value) { active = value; },
  });
  try {
    const pending = request('/api/bids/my/bids', token);
    await roleChecked;
    contractor.is_active = false;
    const response = await pending;
    expect(response.status).toBe(200);
    expect(response.body.bids).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain(proposal.proposal);
  } finally {
    Object.defineProperty(contractor, 'is_active', originalActive);
  }
});

test('a disabled contractor is not exposed by the public profile endpoint', async () => {
  const path = `/api/contractors/${contractor.id}/public`;
  expect((await request(path)).status).toBe(200);
  try {
    contractor.is_active = false;
    const response = await request(path);
    expect(response.status).toBe(404);
    expect(response.body).not.toHaveProperty('contractor');
  } finally {
    contractor.is_active = true;
  }
});

test('public contractor profiles require an exact numeric ID', async () => {
  expect((await request(`/api/contractors/${contractor.id}/public`)).status).toBe(200);
  for (const id of [`${contractor.id}garbage`, `0${contractor.id}`, '0', '2147483648']) {
    const response = await request(`/api/contractors/${id}/public`);
    expect(response.status).toBe(404);
    expect(response.body).not.toHaveProperty('contractor');
  }
});

test('project details and bids require an exact numeric project ID', async () => {
  const ownerToken = server.jwtSign({ userId: owner.id, role: 'homeowner' });
  const contractorToken = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  for (const [path, token] of [
    [`/api/projects/${draft.id}garbage`, ownerToken],
    [`/api/projects/${published.id}garbage`, ownerToken],
    [`/api/projects/${acceptedProject.id}garbage`, contractorToken],
    [`/api/projects/0${published.id}`, ownerToken],
  ]) {
    const response = await request(path, token);
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toMatch(/123 Private Street|555-0100|4321|Private contractor proposal/);
  }
});

test('a malformed project ID cannot publish an owner draft', async () => {
  const ownerToken = server.jwtSign({ userId: owner.id, role: 'homeowner' });
  for (const id of [`${draft.id}garbage`, `0${draft.id}`]) {
    const response = await request(`/api/projects/${id}/publish`, ownerToken, 'POST');
    expect(response.status).toBe(404);
    expect(draft.published).toBe(false);
    expect(draft.published_at).toBeUndefined();
  }
});

test('published project exposes only preview without bids to non-owner', async () => {
  const contractorToken = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  for (const token of [undefined, contractorToken]) {
    const response = await request(`/api/projects/${published.id}`, token);
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('bids');
    expect(JSON.stringify(response.body)).not.toMatch(/123 Private Street|555-0100|4321|Private contractor proposal/);
  }
  const ownerToken = server.jwtSign({ userId: owner.id, role: 'homeowner' });
  const ownerResponse = await request(`/api/projects/${published.id}`, ownerToken);
  expect(ownerResponse.status).toBe(200);
  expect(ownerResponse.body.project.description).toBe(secretDescription);
  expect(ownerResponse.body.bids).toHaveLength(1);
});

test('contractor my-projects cannot bypass preview via a pre-existing bid', async () => {
  const token = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  const response = await request('/api/projects/my/projects', token);
  expect(response.status).toBe(200);
  const unpaid = response.body.projects.find(project => project.id === published.id);
  expect(unpaid).not.toHaveProperty('description');
  expect(JSON.stringify(unpaid)).not.toMatch(/123 Private Street|555-0100|4321/);
});

test('accepted contractor retains full project and escrow access, but strangers do not', async () => {
  const contractorToken = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  const otherToken = server.jwtSign({ userId: otherOwner.id, role: 'homeowner' });
  const accepted = await request(`/api/projects/${acceptedProject.id}`, contractorToken);
  expect(accepted.status).toBe(200);
  expect(accepted.body.project.description).toBe(secretDescription);
  expect(accepted.body.project.escrow_id).toBe(acceptedEscrow.id);
  const mine = await request('/api/projects/my/projects', contractorToken);
  expect(mine.body.projects.find(project => project.id === acceptedProject.id)?.escrow_id).toBe(acceptedEscrow.id);
  const stranger = await request(`/api/projects/${acceptedProject.id}`, otherToken);
  expect(stranger.status).toBe(404);
});

test('a contractor cannot probe or bid on an unpublished project ID', async () => {
  const token = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  const before = server.db.bids.length;
  const response = await request('/api/bids', token, 'POST', {
    project_id: draft.id,
    amount: 1000,
  });
  expect(response.status).toBe(404);
  expect(server.db.bids).toHaveLength(before);
});

test('a public preview does not permit an unpaid contractor to bid', async () => {
  const token = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  const before = server.db.bids.length;
  const response = await request('/api/bids', token, 'POST', {
    project_id: published.id,
    amount: 1000,
  });
  expect(response.status).toBe(403);
  expect(response.body.code).toBe('project_access_required');
  expect(server.db.bids).toHaveLength(before);
});

test('a verified entitlement applies only to its project and is revoked immediately', async () => {
  const token = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  const grant = {
    project_id: electricalProject.id,
    contractor_id: contractor.id,
    status: 'paid',
    provider_payment_id: 'local-fixture-payment',
    verified_at: '2026-09-29T00:00:00.000Z',
  };
  server.db.project_access_entitlements.push(grant);
  const before = server.db.bids.length;
  try {
    const otherProject = await request('/api/bids', token, 'POST', {
      project_id: published.id, amount: 1000,
    });
    expect(otherProject.status).toBe(403);

    const allowed = await request('/api/bids', token, 'POST', {
      project_id: electricalProject.id, amount: 1000,
    });
    expect(allowed.status).toBe(201);
    grant.status = 'revoked';
    const revoked = await request('/api/bids', token, 'POST', {
      project_id: electricalProject.id, amount: 1000,
    });
    expect(revoked.status).toBe(403);
  } finally {
    server.db.project_access_entitlements.splice(server.db.project_access_entitlements.indexOf(grant), 1);
    server.db.bids.splice(before);
  }
});

test('bid creation rejects a stale contractor role and invalid amounts', async () => {
  const token = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  const grant = {
    project_id: published.id,
    contractor_id: contractor.id,
    status: 'paid',
    provider_payment_id: 'local-fixture-amount',
    verified_at: '2026-09-29T00:00:00.000Z',
  };
  server.db.project_access_entitlements.push(grant);
  const before = server.db.bids.length;
  try {
    for (const amount of [0, -1, '1e3', '1.5', true]) {
      const response = await request('/api/bids', token, 'POST', { project_id: published.id, amount });
      expect(response.status).toBe(400);
    }
    contractor.role = 'homeowner';
    const staleRole = await request('/api/bids', token, 'POST', { project_id: published.id, amount: 1000 });
    expect(staleRole.status).toBe(403);
    expect(server.db.bids).toHaveLength(before);
  } finally {
    contractor.role = 'contractor';
    server.db.project_access_entitlements.splice(server.db.project_access_entitlements.indexOf(grant), 1);
  }
});

test('bid creation rejects a contractor disabled while the request body is pending', async () => {
  const token = server.jwtSign({ userId: contractor.id, role: 'contractor' });
  const grant = {
    project_id: published.id,
    contractor_id: contractor.id,
    status: 'paid',
    provider_payment_id: 'local-fixture-role-race',
    verified_at: '2026-09-29T00:00:00.000Z',
  };
  const payload = JSON.stringify({ project_id: published.id, amount: 1000 });
  server.db.project_access_entitlements.push(grant);
  const before = server.db.bids.length;
  const originalActive = Object.getOwnPropertyDescriptor(contractor, 'is_active');
  let active = true;
  let signalRoleCheck;
  const roleChecked = new Promise(resolve => { signalRoleCheck = resolve; });
  Object.defineProperty(contractor, 'is_active', {
    configurable: true,
    get() {
      signalRoleCheck();
      return active;
    },
    set(value) { active = value; },
  });
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: server.address().port,
        path: '/api/bids',
        method: 'POST',
        agent: false,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      req.setTimeout(5000, () => req.destroy(new Error('Local request timed out')));
      req.on('error', reject);
      req.flushHeaders();
      roleChecked.then(() => {
        contractor.is_active = false;
        req.end(payload);
      });
    });
    expect(response.status).toBe(403);
    expect(server.db.bids).toHaveLength(before);
  } finally {
    Object.defineProperty(contractor, 'is_active', originalActive);
    server.db.project_access_entitlements.splice(server.db.project_access_entitlements.indexOf(grant), 1);
    server.db.bids.splice(before);
  }
});

test('category filtering uses an allowed public category without losing Electrical projects', async () => {
  const response = await request('/api/projects?category=Electrical');
  expect(response.status).toBe(200);
  expect(response.body.projects.map(project => project.id)).toContain(electricalProject.id);
  expect(response.body.projects[0].title).toBe('Electrical project');
});

test('only the owner can explicitly publish a draft without wallet payment', async () => {
  const project = { ...draft, id: 991005 };
  server.db.projects.push(project);
  const path = `/api/projects/${project.id}/publish`;
  try {
    expect((await request(path, undefined, 'POST')).status).toBe(401);
    const otherToken = server.jwtSign({ userId: otherOwner.id, role: 'homeowner' });
    expect((await request(path, otherToken, 'POST')).status).toBe(404);
    expect(project.published).toBe(false);

    const ownerToken = server.jwtSign({ userId: owner.id, role: 'homeowner' });
    const publishedResponse = await request(path, ownerToken, 'POST');
    expect(publishedResponse.status).toBe(200);
    expect(publishedResponse.body.project.published).toBe(true);
    expect(project.published_at).toBeTruthy();
    expect((await request(path, ownerToken, 'POST')).status).toBe(200);
    const publicResponse = await request(`/api/projects/${project.id}`);
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.project).not.toHaveProperty('description');
  } finally {
    server.db.projects.splice(server.db.projects.indexOf(project), 1);
  }
});

test('a stale homeowner token cannot create a new private draft', async () => {
  const token = server.jwtSign({ userId: owner.id, role: 'homeowner' });
  const body = { title: 'Stale role draft', description: 'Must not be saved' };
  const before = server.db.projects.length;
  owner.is_active = false;
  try {
    expect((await request('/api/projects', token, 'POST', body)).status).toBe(403);
    owner.is_active = true;
    owner.role = 'contractor';
    expect((await request('/api/projects', token, 'POST', body)).status).toBe(403);
    expect(server.db.projects).toHaveLength(before);
  } finally {
    owner.is_active = true;
    owner.role = 'homeowner';
  }
});

test('a legacy proposal cannot be accepted while its project is still private', async () => {
  const legacyBid = { ...proposal, id: 991006, project_id: draft.id };
  server.db.bids.push(legacyBid);
  const escrowCount = server.db.escrow_contracts.length;
  try {
    const ownerToken = server.jwtSign({ userId: owner.id, role: 'homeowner' });
    const response = await request(`/api/bids/${legacyBid.id}/accept`, ownerToken, 'POST');
    expect(response.status).toBe(409);
    expect(server.db.escrow_contracts).toHaveLength(escrowCount);
    expect(draft.published).toBe(false);
  } finally {
    server.db.bids.splice(server.db.bids.indexOf(legacyBid), 1);
  }
});
