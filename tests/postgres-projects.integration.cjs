const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const { validateLocalTestDatabase } = require('../scripts/local-test-database.cjs');

const apiRoot = path.resolve(__dirname, '../services/api/v3');
const runDirectory = fs.realpathSync(process.env.GCSC_TEST_RUN_DIRECTORY);
const relative = path.relative(fs.realpathSync(path.join(apiRoot, '.tmp')), runDirectory);
assert.match(relative, /^postgres-baseline-[a-zA-Z0-9]+$/);
const databaseUrl = validateLocalTestDatabase(process.env.TEST_DATABASE_URL);
assert.equal(process.env.DATABASE_URL, databaseUrl);
assert.equal(process.env.NODE_ENV, 'test');
const { Pool } = createRequire(path.join(apiRoot, 'package.json'))('pg');
const appDirectory = path.join(runDirectory, 'api');
fs.mkdirSync(appDirectory);
const source = fs.readFileSync(path.join(apiRoot, 'pure-server.js'));
const appFile = path.join(appDirectory, 'pure-server.cjs');
fs.writeFileSync(appFile, source, { flag: 'wx' });
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
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, body: await response.json() };
}

async function fixtureUser(role, label) {
  const result = await pool.query(`INSERT INTO users (email, password_hash, role, full_name)
    VALUES ($1, 'fixture-not-a-password', $2, $3) RETURNING id, role, email`,
  [`${label}@example.invalid`, role, label]);
  return result.rows[0];
}

test('real PostgreSQL project/bid persistence and access baseline', { timeout: 90000 }, async t => {
  t.after(async () => { try { await stopApi(); } finally { await pool.end(); } });
  const tables = await pool.query("SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname = 'public'");
  assert.equal(tables.rows[0].count, 0, 'Only a new empty database is allowed');
  await startApi();
  const owner = await fixtureUser('homeowner', 'owner');
  const otherOwner = await fixtureUser('homeowner', 'other-owner');
  const contractor = await fixtureUser('contractor', 'contractor');
  const otherContractor = await fixtureUser('contractor', 'other-contractor');
  let project;
  let bid;

  await t.test('health confirms real PostgreSQL; schema init can repeat without losing users', async () => {
    const health = await request('GET', '/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.database, 'postgres');
    await api.initStorage();
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM users')).rows[0].count, 4);
  });

  await t.test('project creation denies anonymous and contractor requests', async () => {
    const body = { title: 'Roof repair', description: 'Replace damaged roof panels' };
    assert.equal((await request('POST', '/api/projects', null, body)).status, 401);
    assert.equal((await request('POST', '/api/projects', contractor, body)).status, 403);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM projects')).rows[0].count, 0);
  });

  await t.test('homeowner project and audit event are persisted with the authenticated owner', async () => {
    const result = await request('POST', '/api/projects', owner, {
      title: 'Roof repair', description: 'Replace damaged roof panels', category: 'roofing',
      budget_min: 1200, budget_max: 2400, location: 'Seattle', timeline_days: 7,
      homeowner_id: otherOwner.id,
    });
    assert.equal(result.status, 201);
    project = result.body.project;
    assert.equal(project.homeowner_id, owner.id);
    assert.equal(project.published, false);
    const stored = (await pool.query('SELECT * FROM projects WHERE id = $1', [project.id])).rows[0];
    assert.equal(stored.title, 'Roof repair');
    assert.equal(stored.budget_min, 1200);
    const events = await pool.query("SELECT * FROM audit_events WHERE action = 'project.created' AND entity_id = $1", [String(project.id)]);
    assert.equal(events.rows.length, 1);
    assert.equal(events.rows[0].actor_id, owner.id);
  });

  await t.test('my projects isolates owners and discovery applies category/location filters', async () => {
    assert.deepEqual((await request('GET', '/api/projects/my/projects', otherOwner)).body.projects, []);
    assert.equal((await request('GET', '/api/projects/my/projects', owner)).body.projects[0].id, project.id);
    assert.equal((await request('GET', '/api/projects?category=roofing&location=seattle')).body.projects.length, 1);
    assert.deepEqual((await request('GET', '/api/projects?category=plumbing')).body.projects, []);
  });

  await t.test('bid creation denies anonymous/homeowner/unknown-project requests', async () => {
    const body = { project_id: project.id, amount: 1800 };
    assert.equal((await request('POST', '/api/bids', null, body)).status, 401);
    assert.equal((await request('POST', '/api/bids', owner, body)).status, 403);
    assert.equal((await request('POST', '/api/bids', contractor, { ...body, project_id: 999999 })).status, 404);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM bids')).rows[0].count, 0);
  });

  await t.test('contractor bid, audit and my-bids persist without accepting a financial contract', async () => {
    const result = await request('POST', '/api/bids', contractor, {
      project_id: project.id, amount: 1800, proposed_timeline_days: 5,
      message: 'Local fixture quote', contractor_id: otherContractor.id,
    });
    assert.equal(result.status, 201);
    bid = result.body.bid;
    assert.equal(bid.contractor_id, contractor.id);
    assert.equal((await pool.query('SELECT amount FROM bids WHERE id = $1', [bid.id])).rows[0].amount, 1800);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE action = 'bid.submitted'")).rows[0].count, 1);
    assert.deepEqual((await request('GET', '/api/bids/my/bids', otherContractor)).body.bids, []);
    assert.equal((await request('GET', '/api/bids/my/bids', contractor)).body.bids[0].id, bid.id);
    assert.equal((await request('GET', '/api/projects/my/projects', contractor)).body.projects[0].id, project.id);
  });

  await t.test('foreign keys, allowed roles and receipt uniqueness are enforced by PostgreSQL', async () => {
    await assert.rejects(pool.query("INSERT INTO users(email,password_hash,role) VALUES ('bad@example.invalid','fixture','root')"), { code: '23514' });
    await assert.rejects(pool.query("INSERT INTO bids(project_id,contractor_id,amount) VALUES (999999,$1,10)", [contractor.id]), { code: '23503' });
    const hash = 'f'.repeat(64);
    const insert = () => pool.query(`INSERT INTO payment_receipts(tx_hash, user_id, kind, amount, from_account)
      VALUES ($1, $2, 'lead_token', '50.0000 XPR', 'fixture')`, [hash, contractor.id]);
    const writes = await Promise.allSettled([insert(), insert()]);
    assert.equal(writes.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(writes.find(result => result.status === 'rejected').reason.code, '23505');
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM payment_receipts WHERE tx_hash = $1', [hash])).rows[0].count, 1);
  });

  await t.test('new API module and connections restore project/bid from the database', async () => {
    await stopApi();
    await startApi();
    assert.equal(api.db.projects.length, 0);
    assert.equal(api.db.bids.length, 0);
    const result = await request('GET', `/api/projects/${project.id}`, owner);
    assert.equal(result.status, 200);
    assert.equal(result.body.project.title, 'Roof repair');
    assert.equal(result.body.bids[0].id, bid.id);
    assert.equal((await request('GET', '/api/bids/my/bids', contractor)).body.bids[0].amount, 1800);
  });

  fs.writeFileSync(path.join(runDirectory, 'api-source.sha256'), createHash('sha256').update(source).digest('hex') + '\n');
});
