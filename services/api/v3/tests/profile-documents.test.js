const fs = require('fs');
const path = require('path');

// Exercise the JSON fallback without touching any checkout's account database.
const exists = fs.existsSync;
const write = fs.writeFileSync;
jest.spyOn(fs, 'existsSync').mockImplementation(file =>
  path.basename(String(file)) === 'gcsc.db' ? false : exists(file));
jest.spyOn(fs, 'writeFileSync').mockImplementation((file, ...args) => {
  if (path.basename(String(file)) !== 'gcsc.db') return write(file, ...args);
});
const server = require('../pure-server');
const { db, jwtSign } = server;
let base;
let adminToken;
const upload = { documentType: 'contractor_license', fileName: 'fixture.pdf', fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK' };

async function request(method, route, token, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000) });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

beforeAll(done => {
  server.listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    done();
  });
});
afterAll(done => { server.close(() => { jest.restoreAllMocks(); done(); }); });
beforeEach(() => {
  for (const value of Object.values(db)) if (Array.isArray(value)) value.length = 0;
  db.users.push({ id: 1, email: 'owner@example.invalid', role: 'contractor', is_active: true, profile: {} },
    { id: 2, email: 'reviewer@example.invalid', role: 'admin', is_active: true, profile: {} });
  adminToken = jwtSign({ userId: 2, role: 'admin' });
});

test.each(['inactive', 'demoted', 'deleted'])('JSON admin ACL rejects a %s account with a formerly valid role', async state => {
  if (state === 'inactive') db.users[1].is_active = false;
  if (state === 'demoted') db.users[1].role = 'contractor';
  if (state === 'deleted') db.users.pop();
  for (const route of ['/api/admin/documents', '/api/admin/audit-events', '/api/admin/financing-prechecks']) {
    expect((await request('GET', route, adminToken)).status).toBe(state === 'deleted' ? 404 : 403);
  }
});

test('JSON document download and re-submission preserve owner ACL, revision and audit', async () => {
  const token = jwtSign({ userId: 1, role: 'contractor' });
  const first = await request('POST', '/api/auth/documents', token, { ...upload, reviewNote: 'Pretend administrator approval' });
  expect(first.status).toBe(201);
  const doc = first.body.document;
  expect(doc.revision).toBe(1);
  expect(doc.review_note).toBe('');
  const fileRoute = `/api/auth/documents/${doc.id}/file?revision=1`;
  expect((await request('GET', fileRoute)).status).toBe(401);
  db.users.push({ id: 3, role: 'contractor', email: 'other@example.invalid', is_active: true });
  expect((await request('GET', fileRoute, jwtSign({ userId: 3, role: 'admin' }))).status).toBe(404);
  expect((await request('GET', fileRoute, token)).body.file_data_url).toBe(upload.fileDataUrl);
  expect((await request('GET', fileRoute, adminToken)).status).toBe(200);
  const route = `/api/admin/documents/${doc.id}/review`;
  expect((await request('PUT', route, adminToken, { status: 'approved' })).status).toBe(428);
  expect((await request('PUT', route, adminToken, { status: 'approved', expectedRevision: 1 })).status).toBe(200);
  const replacement = await request('POST', '/api/auth/documents', token, upload);
  expect(replacement.body.document).toMatchObject({ id: doc.id, revision: 2, status: 'submitted', reviewed_by: null, reviewed_at: null });
  expect((await request('PUT', route, adminToken, { status: 'approved', expectedRevision: 1 })).status).toBe(409);
  expect(db.user_documents).toHaveLength(1);
  expect(db.user_documents[0].status).toBe('submitted');
  expect(db.audit_events.filter(event => event.action === 'document.reviewed')).toHaveLength(1);
  expect(db.audit_events.filter(event => event.action === 'document.reviewed')[0].metadata.revision).toBe(1);
});

test('document audit metadata does not duplicate a private upload filename', async () => {
  const token = jwtSign({ userId: 1, role: 'contractor' });
  const fileName = 'Private client 555-0100.pdf';
  const response = await request('POST', '/api/auth/documents', token, { ...upload, fileName });
  expect(response.status).toBe(201);
  expect(response.body.document.file_name).toBe(fileName);
  const audit = db.audit_events.find(event => event.action === 'document.submitted'
    && event.entity_id === response.body.document.id);
  expect(audit).toBeDefined();
  expect(audit.metadata.revision).toBe(1);
  expect(JSON.stringify(audit.metadata)).not.toContain('Private client 555-0100');
});

test('JSON legacy document without revision gets version 1; invalid base64 does not replace it', async () => {
  const token = jwtSign({ userId: 1, role: 'contractor' });
  db.user_documents.push({ id: 7, user_id: 1, document_type: 'contractor_license', status: 'approved' });
  expect((await request('GET', '/api/auth/documents', token)).body.documents[0].revision).toBe(1);
  expect((await request('POST', '/api/auth/documents', token, { ...upload, fileDataUrl: 'data:application/pdf;base64,====' })).status).toBe(400);
  expect(db.user_documents[0].status).toBe('approved');
  expect((await request('POST', '/api/auth/documents', token, upload)).body.document.revision).toBe(2);
});

test('personal document and compliance reads cannot be stored by a shared cache', async () => {
  const token = jwtSign({ userId: 1, role: 'contractor' });
  const created = await request('POST', '/api/auth/documents', token, upload);
  expect(created.status).toBe(201);
  for (const route of [
    '/api/auth/documents',
    '/api/auth/compliance',
    `/api/auth/documents/${created.body.document.id}/file?revision=1`,
  ]) {
    const result = await request('GET', route, token);
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toContain('no-store');
    expect(result.headers.get('vary')).toMatch(/Authorization/i);
  }
});

test('personal profile and wallet reads cannot be stored by a shared cache', async () => {
  const token = jwtSign({ userId: 1, role: 'contractor' });
  for (const route of ['/api/auth/profile', '/api/wallet/me']) {
    const result = await request('GET', route, token);
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toContain('no-store');
    expect(result.headers.get('vary')).toMatch(/Authorization/i);
  }
});

test('admin document, audit and financing reads cannot be stored by a shared cache', async () => {
  for (const route of [
    '/api/admin/documents',
    '/api/admin/audit-events',
    '/api/admin/financing-prechecks',
  ]) {
    const result = await request('GET', route, adminToken);
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toContain('no-store');
    expect(result.headers.get('vary')).toMatch(/Authorization/i);
  }
});

test('current-user and personal financing reads cannot be stored by a shared cache', async () => {
  const token = jwtSign({ userId: 1, role: 'contractor' });
  for (const route of ['/api/me', '/api/financing/prechecks']) {
    const result = await request('GET', route, token);
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toContain('no-store');
    expect(result.headers.get('vary')).toMatch(/Authorization/i);
  }
});

test('a disabled account cannot read /api/me with a previously valid token', async () => {
  const token = jwtSign({ userId: 1, role: 'contractor' });
  expect((await request('GET', '/api/me', token)).status).toBe(200);
  db.users[0].is_active = false;
  const disabled = await request('GET', '/api/me', token);
  expect(disabled.status).toBe(403);
  expect(disabled.body).toEqual({ error: 'Account is inactive' });
});
