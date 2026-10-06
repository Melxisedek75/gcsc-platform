const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { validateLocalTestDatabase } = require('../scripts/local-test-database.cjs');
const { readProjectManifest, copyApiSnapshot } = require('./postgres-project-sources.cjs');

const apiRoot = path.resolve(__dirname, '../services/api/v3');
const runDirectory = fs.realpathSync(process.env.GCSC_TEST_RUN_DIRECTORY);
assert.match(path.relative(fs.realpathSync(path.join(apiRoot, '.tmp')), runDirectory),
  /^postgres-baseline-[a-zA-Z0-9]+$/);
const databaseUrl = validateLocalTestDatabase(process.env.TEST_DATABASE_URL);
assert.equal(process.env.DATABASE_URL, databaseUrl);
assert.equal(process.env.NODE_ENV, 'test');
const sources = readProjectManifest(runDirectory);
const appFile = copyApiSnapshot(sources, runDirectory);
const { Pool } = createRequire(path.join(apiRoot, 'package.json'))('pg');
const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
let api;
let base;

async function startApi() {
  delete require.cache[require.resolve(appFile)];
  api = require(appFile);
  await api.initStorage();
  api.listen(0, '127.0.0.1');
  await once(api, 'listening');
  base = `http://127.0.0.1:${api.address().port}`;
}

async function stopApi() {
  if (api?.listening) await new Promise((resolve, reject) => api.close(error => error ? reject(error) : resolve()));
  if (api) await api.closeStorage();
}

async function request(method, route, user, body) {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? {
      Authorization: `Bearer ${api.jwtSign({ userId: user.id, role: user.role, email: user.email })}`,
    } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, cache: response.headers.get('cache-control'), body: await response.json() };
}

async function fixtureUser(role, label) {
  const result = await pool.query(`INSERT INTO users (email, password_hash, role, full_name)
    VALUES ($1, 'fixture-not-a-password', $2, $3) RETURNING id, role, email`,
  [`${label}@example.invalid`, role, label]);
  return result.rows[0];
}

test('real PostgreSQL draft edit stays private, durable, versioned and audited', { timeout: 90000 }, async t => {
  t.after(async () => { try { await stopApi(); } finally { await pool.end(); } });
  const dataDirectory = await pool.query('SHOW data_directory');
  assert.equal(fs.realpathSync(dataDirectory.rows[0].data_directory),
    fs.realpathSync(path.join(runDirectory, 'cluster')));
  assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname='public'"))
    .rows[0].count, 0);
  await startApi();
  assert.equal((await request('GET', '/health')).body.database, 'postgres');
  const owner = await fixtureUser('homeowner', 'draft-owner');
  const stranger = await fixtureUser('homeowner', 'draft-stranger');
  const contractor = await fixtureUser('contractor', 'draft-contractor');
  const original = { title: 'Original draft', description: 'Original private details', category: 'Roofing',
    budget_min: 1000, budget_max: 2000, location: 'Private address', timeline_days: 30 };
  const created = await request('POST', '/api/projects', owner, original);
  assert.equal(created.status, 201);
  const projectId = created.body.project.id;
  const route = `/api/projects/${projectId}`;
  const version = created.body.project.updated_at;
  assert.equal(typeof version, 'string');
  const replacement = { ...original, title: 'Revised draft', description: 'Revised private details',
    location: 'New private address', expected_updated_at: version };
  const before = await pool.query('SELECT * FROM projects WHERE id=$1', [projectId]);
  const beforeAudit = (await pool.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE action='project.updated' AND entity_id=$1",
    [projectId])).rows[0].count;

  await t.test('other users and stale roles cannot edit or infer the draft', async () => {
    for (const [user, status] of [[null, 401], [stranger, 404], [contractor, 404]]) {
      const denied = await request('PUT', route, user, replacement);
      assert.equal(denied.status, status);
      assert.equal(denied.cache, 'private, no-store');
      assert.equal(denied.body.project, undefined);
    }
    await pool.query("UPDATE users SET role='admin' WHERE id=$1", [owner.id]);
    assert.equal((await request('PUT', route, owner, replacement)).status, 404);
    await pool.query("UPDATE users SET role='homeowner', is_active=FALSE WHERE id=$1", [owner.id]);
    assert.equal((await request('PUT', route, owner, replacement)).status, 404);
    await pool.query('UPDATE users SET is_active=TRUE WHERE id=$1', [owner.id]);
    assert.deepEqual((await pool.query('SELECT * FROM projects WHERE id=$1', [projectId])).rows, before.rows);
  });

  await t.test('valid edit survives restart; stale and invalid edits do not alter data', async () => {
    const invalid = await request('PUT', route, owner, { ...replacement, title: ' ' });
    assert.equal(invalid.status, 400);
    const updated = await request('PUT', route, owner, replacement);
    assert.equal(updated.status, 200);
    assert.equal(updated.cache, 'private, no-store');
    assert.equal(updated.body.project.title, replacement.title);
    assert.ok(Date.parse(updated.body.project.updated_at) > Date.parse(version));
    const stale = await request('PUT', route, owner, { ...replacement, title: 'Stale write' });
    assert.equal(stale.status, 409);
    assert.equal((await pool.query('SELECT title FROM projects WHERE id=$1', [projectId])).rows[0].title,
      replacement.title);
    await stopApi();
    await startApi();
    const stored = await pool.query('SELECT title, description, location FROM projects WHERE id=$1', [projectId]);
    assert.deepEqual(stored.rows[0], { title: replacement.title, description: replacement.description,
      location: replacement.location });
  });

  await t.test('audit failure rolls back the edit and leaves no update event', async () => {
    const current = await pool.query('SELECT title, updated_at FROM projects WHERE id=$1', [projectId]);
    const auditCount = (await pool.query(
      "SELECT COUNT(*)::int AS count FROM audit_events WHERE action='project.updated' AND entity_id=$1",
      [projectId])).rows[0].count;
    await pool.query(`CREATE FUNCTION reject_draft_update_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action = 'project.updated' THEN RAISE EXCEPTION 'fixture audit failure'; END IF;
      RETURN NEW; END $$`);
    await pool.query(`CREATE TRIGGER reject_draft_update_audit BEFORE INSERT ON audit_events
      FOR EACH ROW EXECUTE FUNCTION reject_draft_update_audit()`);
    try {
      const failed = await request('PUT', route, owner, { ...replacement,
        title: 'Must roll back', expected_updated_at: current.rows[0].updated_at.toISOString() });
      assert.equal(failed.status, 500);
    } finally {
      await pool.query('DROP TRIGGER reject_draft_update_audit ON audit_events');
      await pool.query('DROP FUNCTION reject_draft_update_audit()');
    }
    const after = await pool.query('SELECT title, updated_at FROM projects WHERE id=$1', [projectId]);
    assert.deepEqual(after.rows, current.rows);
    assert.equal((await pool.query(
      "SELECT COUNT(*)::int AS count FROM audit_events WHERE action='project.updated' AND entity_id=$1",
      [projectId])).rows[0].count, auditCount);
  });

  await t.test('audit contains no private text and published draft rejects edits', async () => {
    const audits = await pool.query("SELECT metadata FROM audit_events WHERE action='project.updated' AND entity_id=$1",
      [projectId]);
    assert.equal(audits.rows.length, beforeAudit + 1);
    assert.doesNotMatch(JSON.stringify(audits.rows[0].metadata), /Revised private details|New private address/);
    const published = await request('POST', `${route}/publish`, owner);
    assert.equal(published.status, 200);
    assert.equal((await request('PUT', route, owner,
      { ...replacement, expected_updated_at: published.body.project.updated_at })).status, 409);
  });
});
