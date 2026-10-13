const http = require('http');
const { execFileSync } = require('child_process');
const server = require('../pure-server');

const owner = { id: 992101, email: 'draft-owner@example.invalid', role: 'homeowner', is_active: true };
const otherOwner = { id: 992102, email: 'draft-other@example.invalid', role: 'homeowner', is_active: true };
const contractor = { id: 992103, email: 'draft-contractor@example.invalid', role: 'contractor', is_active: true };
const project = {
  id: 992101, homeowner_id: owner.id, title: 'Original draft', description: 'Private original details',
  category: 'Roofing', budget_min: 1000, budget_max: 2000, location: 'Private address',
  timeline_days: 30, status: 'open', published: false, published_at: null, escrow_id: null,
  created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z',
};
const replacement = {
  title: 'Revised draft', description: 'Private revised details', category: 'Roofing',
  budget_min: 1200, budget_max: 2500, location: 'New private address', timeline_days: 14,
};
const withVersion = (draft = replacement) => ({ ...draft, expected_updated_at: project.updated_at });

function request(method, route, user, body, tokenOverride) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    const token = tokenOverride || (user && server.jwtSign({ userId: user.id, role: user.role, email: user.email }));
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: route,
      method, agent: false, headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }),
      } }, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) }));
    });
    req.setTimeout(5000, () => req.destroy(new Error('Local request timed out')));
    req.on('error', reject);
    req.end(payload);
  });
}

beforeAll(async () => {
  server.db.users.push(owner, otherOwner, contractor);
  server.db.projects.push(project);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
  for (const [table, rows] of [[server.db.users, [owner, otherOwner, contractor]], [server.db.projects, [project]]]) {
    for (const row of rows) {
      const index = table.indexOf(row);
      if (index >= 0) table.splice(index, 1);
    }
  }
  for (let index = server.db.audit_events.length - 1; index >= 0; index--) {
    const event = server.db.audit_events[index];
    if (event.action === 'project.updated' && String(event.entity_id) === String(project.id)) {
      server.db.audit_events.splice(index, 1);
    }
  }
});

test('only an active owner replaces a private draft; audit omits private text', async () => {
  const route = `/api/projects/${project.id}`;
  const before = { ...project };
  const auditCount = server.db.audit_events.length;
  for (const viewer of [null, otherOwner, contractor]) {
    const denied = await request('PUT', route, viewer, withVersion());
    expect(denied.status).toBe(viewer ? 404 : 401);
    expect(denied.body).toEqual({ error: viewer ? 'Project not found' : 'Unauthorized' });
    expect(denied.headers['cache-control']).toBe('private, no-store');
  }
  expect(project).toEqual(before);
  expect(server.db.audit_events).toHaveLength(auditCount);
  const staleToken = server.jwtSign({ userId: owner.id, role: owner.role, email: owner.email });
  for (const change of [{ is_active: false }, { role: 'admin' }]) {
    const original = { is_active: owner.is_active, role: owner.role };
    Object.assign(owner, change);
    try {
      const denied = await request('PUT', route, owner, withVersion(), staleToken);
      expect(denied.status).toBe(404);
      expect(denied.body).toEqual({ error: 'Project not found' });
      expect(project).toEqual(before);
      expect(server.db.audit_events).toHaveLength(auditCount);
    } finally {
      Object.assign(owner, original);
    }
  }
  for (const invalidId of [`0${project.id}`, `${project.id}extra`, '-1']) {
    const denied = await request('PUT', `/api/projects/${invalidId}`, owner, withVersion());
    expect(denied.status).toBe(404);
    expect(denied.body).toEqual({ error: 'Project not found' });
  }
  expect(server.db.audit_events).toHaveLength(auditCount);

  const updated = await request('PUT', route, owner, withVersion());
  expect(updated.status).toBe(200);
  expect(updated.headers['cache-control']).toBe('private, no-store');
  expect(updated.body.project).toMatchObject({ ...replacement, id: project.id, homeowner_id: owner.id, published: false });
  expect(project).toMatchObject(replacement);
  expect(Date.parse(project.updated_at)).toBeGreaterThan(Date.parse(before.updated_at));
  expect(server.db.audit_events).toHaveLength(auditCount + 1);
  const audit = server.db.audit_events.at(-1);
  expect(audit.action).toBe('project.updated');
  expect(JSON.stringify(audit.metadata)).not.toMatch(/Private revised|New private address/);
});

test('invalid edits and published projects do not change the stored project', async () => {
  const route = `/api/projects/${project.id}`;
  const before = { ...project };
  const auditCount = server.db.audit_events.length;
  for (const invalid of [null, {}, { ...withVersion(), status: 'completed' },
    withVersion({ ...replacement, title: ' ' }), withVersion({ ...replacement, budget_min: 3000 }),
    withVersion({ ...replacement, timeline_days: 0 })]) {
    const denied = await request('PUT', route, owner, invalid);
    expect(denied.status).toBe(400);
    expect(denied.body).toEqual({ error: 'Invalid project draft' });
  }
  expect(project).toEqual(before);
  expect(server.db.audit_events).toHaveLength(auditCount);
  project.published = true;
  try {
    const denied = await request('PUT', route, owner, withVersion());
    expect(denied.status).toBe(409);
    expect(denied.body).toEqual({ error: 'Only an open private draft can be edited' });
    expect(project).toEqual({ ...before, published: true });
  } finally {
    project.published = false;
  }
});

test('a stale tab cannot overwrite a newer draft', async () => {
  const route = `/api/projects/${project.id}`;
  const oldVersion = project.updated_at;
  const first = await request('PUT', route, owner, withVersion({ ...replacement, title: 'First tab edit' }));
  expect(first.status).toBe(200);
  const afterFirst = { ...project };
  const auditCount = server.db.audit_events.length;
  const stale = await request('PUT', route, owner,
    { ...replacement, title: 'Stale tab edit', expected_updated_at: oldVersion });
  expect(stale.status).toBe(409);
  expect(stale.body).toEqual({ error: 'Project changed; refresh and retry' });
  expect(project).toEqual(afterFirst);
  expect(server.db.audit_events).toHaveLength(auditCount);
});

test('failed audit leaves neither an edited draft nor an audit event', async () => {
  const before = { ...project };
  const auditCount = server.db.audit_events.length;
  const originalPush = server.db.audit_events.push;
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  server.db.audit_events.push = () => { throw new Error('fixture audit failure'); };
  try {
    const failed = await request('PUT', `/api/projects/${project.id}`, owner,
      withVersion({ ...replacement, title: 'Uncommitted private edit' }));
    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ error: 'Internal server error' });
    expect(project).toEqual(before);
    expect(server.db.audit_events).toHaveLength(auditCount);
  } finally {
    server.db.audit_events.push = originalPush;
    errorLog.mockRestore();
  }
});

test('a newly created JSON draft includes a version and can be edited immediately', async () => {
  const created = await request('POST', '/api/projects', owner, replacement);
  expect(created.status).toBe(201);
  const stored = server.db.projects.find(item => item.id === created.body.project.id);
  try {
    expect(created.body.project.updated_at).toBe(created.body.project.created_at);
    const edited = await request('PUT', `/api/projects/${stored.id}`, owner, {
      ...replacement, title: 'Edited after creation', expected_updated_at: created.body.project.updated_at,
    });
    expect(edited.status).toBe(200);
    expect(edited.body.project.title).toBe('Edited after creation');
  } finally {
    const index = server.db.projects.indexOf(stored);
    if (index >= 0) server.db.projects.splice(index, 1);
    for (let index = server.db.audit_events.length - 1; index >= 0; index--) {
      if (String(server.db.audit_events[index].entity_id) === String(stored?.id)) {
        server.db.audit_events.splice(index, 1);
      }
    }
  }
});

test('legacy JSON projects acquire their original creation version on load', () => {
  const modulePath = require.resolve('../pure-server');
  const createdAt = '2026-09-01T12:30:00.000Z';
  const child = `
    const fs = require('fs');
    const path = require('path');
    const dbFile = path.join(path.dirname(${JSON.stringify(modulePath)}), 'gcsc.db');
    const realExists = fs.existsSync;
    const realRead = fs.readFileSync;
    const realWrite = fs.writeFileSync;
    fs.existsSync = file => file === dbFile ? true : realExists(file);
    fs.readFileSync = (file, ...args) => file === dbFile
      ? JSON.stringify({ projects: [{ id: 901, created_at: ${JSON.stringify(createdAt)} }] })
      : realRead(file, ...args);
    fs.writeFileSync = (file, ...args) => {
      if (file === dbFile) throw new Error('Fixture must not write gcsc.db');
      return realWrite(file, ...args);
    };
    const db = require(${JSON.stringify(modulePath)}).db;
    process.stdout.write(JSON.stringify(db.projects[0]));
  `;
  const env = { ...process.env, NODE_ENV: 'development', GCSC_ALLOW_LOCAL_JSON_DB: 'true' };
  delete env.DATABASE_URL;
  const loaded = JSON.parse(execFileSync(process.execPath, ['-e', child], {
    env, encoding: 'utf8', timeout: 5000,
  }));
  expect(loaded).toEqual({ id: 901, created_at: createdAt, updated_at: createdAt });
});
