const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { validateLocalTestDatabase } = require('../scripts/local-test-database.cjs');

const apiRoot = path.resolve(__dirname, '../services/api/v3');
const runDirectory = fs.realpathSync(process.env.GCSC_TEST_RUN_DIRECTORY);
assert.match(path.relative(fs.realpathSync(path.join(apiRoot, '.tmp')), runDirectory),
  /^postgres-baseline-[a-zA-Z0-9]+$/);
const databaseUrl = validateLocalTestDatabase(process.env.TEST_DATABASE_URL);
assert.equal(process.env.DATABASE_URL, databaseUrl);
assert.equal(process.env.NODE_ENV, 'test');
const sourcePath = fs.realpathSync(process.env.GCSC_API_SOURCE);
assert.equal(path.basename(sourcePath), 'pure-server.js');
const source = fs.readFileSync(sourcePath);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceSha256 = sha256(source);
assert.equal(sourceSha256, process.env.GCSC_API_SOURCE_SHA256, 'Candidate source changed after runner snapshot');

const { Pool } = createRequire(path.join(apiRoot, 'package.json'))('pg');
const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
const appDirectory = path.join(runDirectory, 'api');
fs.mkdirSync(appDirectory);
const appFile = path.join(appDirectory, 'pure-server.cjs');
fs.writeFileSync(appFile, source, { flag: 'wx' });
const copiedFiles = { 'pure-server.cjs': sourceSha256 };
for (const name of ['wallet-ownership-proof.cjs', 'wallet-challenge-store.cjs']) {
  fs.copyFileSync(path.join(path.dirname(sourcePath), name), path.join(appDirectory, name), fs.constants.COPYFILE_EXCL);
  copiedFiles[name] = sha256(fs.readFileSync(path.join(appDirectory, name)));
}
fs.writeFileSync(path.join(runDirectory, 'api-files.sha256.json'), JSON.stringify(copiedFiles, null, 2) + '\n');
fs.writeFileSync(path.join(runDirectory, 'api-source.sha256'), sourceSha256 + '\n');

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

test('real PostgreSQL draft, publication, privacy and legacy-bid acceptance', { timeout: 90000 }, async t => {
  t.after(async () => { try { await stopApi(); } finally { await pool.end(); } });
  const dataDirectory = await pool.query('SHOW data_directory');
  assert.equal(fs.realpathSync(dataDirectory.rows[0].data_directory),
    fs.realpathSync(path.join(runDirectory, 'cluster')));
  const tables = await pool.query("SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname = 'public'");
  assert.equal(tables.rows[0].count, 0, 'Only a fresh disposable database is allowed');
  await startApi();
  const health = await request('GET', '/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.database, 'postgres');

  const owner = await fixtureUser('homeowner', 'publication-owner');
  const stranger = await fixtureUser('homeowner', 'publication-stranger');
  const contractor = await fixtureUser('contractor', 'publication-contractor');
  let project;

  await t.test('owner creates a persisted private draft; strangers cannot discover or bid on it', async () => {
    const created = await request('POST', '/api/projects', owner, {
      title: 'PRIVATE_TITLE_DO_NOT_EXPOSE', description: 'PRIVATE_DESCRIPTION_DO_NOT_EXPOSE',
      category: 'roofing', budget_min: 1200, budget_max: 2400,
      location: 'PRIVATE_ADDRESS_DO_NOT_EXPOSE', timeline_days: 7,
      homeowner_id: stranger.id,
    });
    assert.equal(created.status, 201);
    project = created.body.project;
    assert.equal(project.homeowner_id, owner.id);
    assert.equal(project.published, false);
    assert.equal(project.published_at, null);
    assert.deepEqual((await pool.query('SELECT published,published_at FROM projects WHERE id=$1', [project.id])).rows,
      [{ published: false, published_at: null }]);
    await stopApi();
    await startApi();
    assert.equal((await request('GET', `/api/projects/${project.id}`, owner)).body.project.title,
      'PRIVATE_TITLE_DO_NOT_EXPOSE');
    for (const viewer of [null, stranger, contractor]) {
      assert.equal((await request('GET', `/api/projects/${project.id}`, viewer)).status, 404);
      assert.deepEqual((await request('GET', '/api/projects', viewer)).body.projects, []);
    }
    assert.deepEqual((await request('GET', '/api/projects/my/projects', stranger)).body.projects, []);
    assert.equal((await request('POST', '/api/bids', contractor,
      { project_id: project.id, amount: 1800 })).status, 404);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM bids')).rows[0].count, 0);
  });

  await t.test('only the current active owner can publish', async () => {
    const route = `/api/projects/${project.id}/publish`;
    assert.equal((await request('POST', route, null)).status, 401);
    assert.equal((await request('POST', route, stranger)).status, 404);
    assert.equal((await request('POST', route, contractor)).status, 404);
    await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [owner.id]);
    assert.equal((await request('POST', route, owner)).status, 404);
    await pool.query("UPDATE users SET is_active=TRUE, role='contractor' WHERE id=$1", [owner.id]);
    assert.equal((await request('POST', route, owner)).status, 404);
    assert.deepEqual((await pool.query('SELECT published,published_at FROM projects WHERE id=$1', [project.id])).rows,
      [{ published: false, published_at: null }]);
    await pool.query("UPDATE users SET role='homeowner' WHERE id=$1", [owner.id]);
    const result = await request('POST', route, owner);
    assert.equal(result.status, 200);
    assert.equal(result.body.project.published, true);
    assert.ok(Number.isFinite(Date.parse(result.body.project.published_at)));
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE action='project.published' AND entity_id=$1",
      [String(project.id)])).rows[0].count, 1);
  });

  await t.test('anonymous and stranger list/detail contain exactly allowlisted preview and PG timestamp', async () => {
    const stored = (await pool.query('SELECT published,published_at FROM projects WHERE id=$1', [project.id])).rows[0];
    assert.equal(stored.published, true);
    assert.ok(stored.published_at instanceof Date);
    const expected = {
      id: project.id, title: 'Roofing project', category: 'Roofing',
      budget_min: 1200, budget_max: 2400, timeline_days: 7,
      status: 'open', published_at: stored.published_at.toISOString(),
    };
    const allowedKeys = Object.keys(expected).sort();
    await stopApi();
    await startApi();
    for (const viewer of [null, stranger, contractor]) {
      const list = await request('GET', '/api/projects', viewer);
      const detail = await request('GET', `/api/projects/${project.id}`, viewer);
      assert.equal(list.status, 200);
      assert.equal(detail.status, 200);
      assert.equal(list.body.projects.length, 1);
      for (const preview of [list.body.projects[0], detail.body.project]) {
        assert.deepEqual(Object.keys(preview).sort(), allowedKeys);
        assert.deepEqual(preview, expected);
      }
      assert.deepEqual(Object.keys(detail.body).sort(), ['project']);
    }
    assert.equal((await request('GET', `/api/projects/${project.id}`, owner)).body.project.title,
      'PRIVATE_TITLE_DO_NOT_EXPOSE');
  });

  await t.test('only a current paid entitlement for this project allows a bid', async () => {
    const other = await request('POST', '/api/projects', owner,
      { title: 'Other project', description: 'Separate access grant', category: 'roofing' });
    assert.equal(other.status, 201);
    assert.equal((await request('POST', `/api/projects/${other.body.project.id}/publish`, owner)).status, 200);

    const bidBody = { project_id: project.id, amount: 1800 };
    const bidCount = async () => (await pool.query('SELECT COUNT(*)::int AS count FROM bids')).rows[0].count;
    const before = await bidCount();
    assert.equal((await request('POST', '/api/bids', contractor, bidBody)).status, 403);
    await pool.query(`INSERT INTO project_access_entitlements
      (project_id, contractor_id, status, provider_payment_id, verified_at)
      VALUES ($1, $2, 'paid', 'local-pg-fixture-other', NOW())`, [other.body.project.id, contractor.id]);
    assert.equal((await request('POST', '/api/bids', contractor, bidBody)).status, 403);
    await pool.query(`INSERT INTO project_access_entitlements
      (project_id, contractor_id, status, provider_payment_id)
      VALUES ($1, $2, 'pending', 'local-pg-fixture-target')`, [project.id, contractor.id]);
    assert.equal((await request('POST', '/api/bids', contractor, bidBody)).status, 403);
    assert.equal(await bidCount(), before);

    await assert.rejects(pool.query(`INSERT INTO project_access_entitlements
      (project_id, contractor_id, status, provider_payment_id)
      VALUES ($1, $2, 'paid', 'unverified-fixture')`, [project.id, stranger.id]),
    error => error.code === '23514');

    await pool.query(`UPDATE project_access_entitlements
      SET status='paid', verified_at=NOW() WHERE project_id=$1 AND contractor_id=$2`,
    [project.id, contractor.id]);
    assert.equal((await request('POST', '/api/bids', contractor, bidBody)).status, 201);
    assert.equal(await bidCount(), before + 1);

    await pool.query(`UPDATE project_access_entitlements SET status='revoked'
      WHERE project_id=$1 AND contractor_id=$2`, [project.id, contractor.id]);
    assert.equal((await request('POST', '/api/bids', contractor, bidBody)).status, 403);
    assert.equal(await bidCount(), before + 1);
  });

  await t.test('a pre-existing bid on an unpublished draft cannot be accepted', async () => {
    const created = await request('POST', '/api/projects', owner,
      { title: 'Legacy private draft', description: 'Unpublished fixture' });
    assert.equal(created.status, 201);
    const draftId = created.body.project.id;
    const inserted = await pool.query(`INSERT INTO bids (project_id, contractor_id, amount, status)
      VALUES ($1, $2, 1550, 'pending') RETURNING id`, [draftId, contractor.id]);
    const response = await request('POST', `/api/bids/${inserted.rows[0].id}/accept`, owner);
    assert.equal(response.status, 409);
    assert.deepEqual((await pool.query('SELECT published,published_at,status,escrow_id FROM projects WHERE id=$1', [draftId])).rows,
      [{ published: false, published_at: null, status: 'open', escrow_id: null }]);
    assert.equal((await pool.query('SELECT status FROM bids WHERE id=$1', [inserted.rows[0].id])).rows[0].status,
      'pending');
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM escrow_contracts')).rows[0].count, 0);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE action='bid.accepted'")).rows[0].count, 0);
    assert.equal((await request('GET', `/api/projects/${draftId}`, stranger)).status, 404);
    const visibleIds = (await request('GET', '/api/projects')).body.projects.map(item => item.id);
    assert.ok(visibleIds.includes(project.id));
    assert.ok(!visibleIds.includes(draftId));
  });

  fs.writeFileSync(path.join(runDirectory, 'publication-acceptance.json'), JSON.stringify({
    status: 'PASS', apiSourceSha256: sourceSha256, database: 'fresh loopback PostgreSQL',
    projectId: project.id, checks: ['private draft', 'owner authority', 'exact public preview',
      'project-specific paid bid access', 'legacy bid blocked'],
  }, null, 2) + '\n');
});
