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
const selectedSources = readProjectManifest(runDirectory);
const sourceSha256 = selectedSources.api.files['pure-server.js'];

const apiRequire = createRequire(path.join(apiRoot, 'package.json'));
const { Pool } = apiRequire('pg');
const { Key, Numeric, digestFromSerializedData } = apiRequire('@proton/js');
const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
const appFile = copyApiSnapshot(selectedSources, runDirectory);

let api;
let base;

async function startApi({ legacyPosting = false } = {}) {
  delete require.cache[require.resolve(appFile)];
  const original = process.env.ENABLE_LEGACY_XPR_JOB_POSTING;
  process.env.ENABLE_LEGACY_XPR_JOB_POSTING = String(legacyPosting);
  try { api = require(appFile); } finally {
    if (original === undefined) delete process.env.ENABLE_LEGACY_XPR_JOB_POSTING;
    else process.env.ENABLE_LEGACY_XPR_JOB_POSTING = original;
  }
  await api.initStorage();
  api.listen(0, '127.0.0.1');
  await once(api, 'listening');
  base = `http://127.0.0.1:${api.address().port}`;
}

async function stopApi() {
  if (api?.listening) await new Promise((resolve, reject) => api.close(error => error ? reject(error) : resolve()));
  if (api) await api.closeStorage();
}

async function request(method, route, user, body, headers = {}) {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? {
      Authorization: `Bearer ${api.jwtSign({ userId: user.id, role: user.role, email: user.email })}`,
    } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

function assertPrivateDetailsHeaders(response) {
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.ok((response.headers.get('vary') || '').split(',').map(value => value.trim().toLowerCase())
    .includes('authorization'), 'Details responses must vary by Authorization');
}

function assertDetailsDenied(response) {
  assert.equal(response.status, 404);
  assertPrivateDetailsHeaders(response);
  assert.deepEqual(response.body,
    { error: 'Project details unavailable', code: 'project_details_unavailable' });
}

async function fixtureUser(role, label) {
  const result = await pool.query(`INSERT INTO users (email, password_hash, role, full_name)
    VALUES ($1, 'fixture-not-a-password', $2, $3) RETURNING id, role, email`,
  [`${label}@example.invalid`, role, label]);
  return result.rows[0];
}

async function expectBlockedBy(blocker, responsePromise) {
  const pid = (await blocker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const lockObservation = (async () => {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const result = await pool.query(`SELECT COUNT(*)::int AS count FROM pg_stat_activity
        WHERE $1 = ANY(pg_blocking_pids(pid))`, [pid]);
      if (result.rows[0].count > 0) return { blocked: true };
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    return { blocked: false };
  })();
  const first = await Promise.race([
    responsePromise.then(response => ({ response })), lockObservation,
  ]);
  assert.deepEqual(first, { blocked: true }, 'API request must reach a row lock held by the fixture');
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

  await t.test('disabled PostgreSQL user cannot read /api/me with a previously valid token', async () => {
    const disabled = await fixtureUser('contractor', 'disabled-current-user');
    assert.equal((await request('GET', '/api/me', disabled)).status, 200);
    await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [disabled.id]);
    const response = await request('GET', '/api/me', disabled);
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, { error: 'Account is inactive' });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  });

  await t.test('disabled contractor profile is not publicly readable from PostgreSQL', async () => {
    const listed = await fixtureUser('contractor', 'public-profile-contractor');
    const route = `/api/contractors/${listed.id}/public`;
    const active = await request('GET', route);
    assert.equal(active.status, 200);
    assert.equal(active.body.contractor.id, listed.id);
    await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [listed.id]);
    const disabled = await request('GET', route);
    assert.equal(disabled.status, 404);
    assert.equal(disabled.body.contractor, undefined);
  });

  await t.test('persisted document audit omits the private upload filename', async () => {
    const documentOwner = await fixtureUser('contractor', 'audit-filename-contractor');
    const fileName = 'Private client 555-0100.pdf';
    const uploaded = await request('POST', '/api/auth/documents', documentOwner, {
      documentType: 'contractor_license', fileName,
      fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
    });
    assert.equal(uploaded.status, 201);
    assert.equal(uploaded.body.document.file_name, fileName);
    const audit = await pool.query(
      "SELECT metadata FROM audit_events WHERE action='document.submitted' AND entity_id=$1",
      [String(uploaded.body.document.id)]);
    assert.equal(audit.rowCount, 1);
    assert.equal(audit.rows[0].metadata.file_name, undefined);
    assert.equal(audit.rows[0].metadata.revision, 1);
    assert.doesNotMatch(JSON.stringify(audit.rows[0].metadata), /Private client 555-0100/);
  });

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
    const audit = (await pool.query(
      "SELECT metadata FROM audit_events WHERE action='project.created' AND entity_id=$1", [String(project.id)]));
    assert.equal(audit.rowCount, 1);
    assert.deepEqual(Object.keys(audit.rows[0].metadata).sort(),
      ['budget_max', 'budget_min', 'project_id', 'status', 'timeline_days']);
    assert.equal(audit.rows[0].metadata.project_id, project.id);
    assert.doesNotMatch(JSON.stringify(audit.rows[0].metadata),
      /PRIVATE_(TITLE|DESCRIPTION|ADDRESS)_DO_NOT_EXPOSE/);
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

  await t.test('active owner sees own persisted draft details; other identities get uniform private denial', async () => {
    const route = `/api/projects/${project.id}/details`;
    const ownerDetails = await request('GET', route, owner);
    assert.equal(ownerDetails.status, 200);
    assertPrivateDetailsHeaders(ownerDetails);
    assert.deepEqual(Object.keys(ownerDetails.body), ['project']);
    assert.equal(ownerDetails.body.project.id, project.id);
    assert.equal(ownerDetails.body.project.homeowner_id, owner.id);
    assert.equal(ownerDetails.body.project.title, 'PRIVATE_TITLE_DO_NOT_EXPOSE');
    assert.equal(ownerDetails.body.project.location, 'PRIVATE_ADDRESS_DO_NOT_EXPOSE');
    assert.equal(ownerDetails.body.project.published, false);
    assert.equal(ownerDetails.body.project.published_at, null);

    const anonymous = await request('GET', route);
    assert.equal(anonymous.status, 401);
    assertPrivateDetailsHeaders(anonymous);
    assert.deepEqual(anonymous.body, { error: 'Unauthorized' });
    assertDetailsDenied(await request('GET', route, stranger));
    assertDetailsDenied(await request('GET', route, contractor));
    await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [owner.id]);
    assertDetailsDenied(await request('GET', route, owner));
    await pool.query("UPDATE users SET is_active=TRUE, role='contractor' WHERE id=$1", [owner.id]);
    assertDetailsDenied(await request('GET', route, owner));
    await pool.query("UPDATE users SET role='homeowner' WHERE id=$1", [owner.id]);
  });

  await t.test('personal project reads are private and vary by authorization', async () => {
    for (const [route, user] of [
      [`/api/projects/${project.id}`, owner],
      ['/api/projects/my/projects', owner],
      ['/api/projects/my/projects', contractor],
    ]) {
      const response = await request('GET', route, user);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      const vary = (response.headers.get('vary') || '').split(',').map(value => value.trim().toLowerCase());
      assert.ok(vary.includes('origin'));
      assert.ok(vary.includes('authorization'));
    }
  });

  await t.test('malformed project IDs cannot read or publish the owner draft', async () => {
    for (const id of [`${project.id}suffix`, `0${project.id}`]) {
      for (const route of [`/api/projects/${id}`, `/api/projects/${id}/details`]) {
        const response = await request('GET', route, owner);
        assert.equal(response.status, 404);
        assert.doesNotMatch(JSON.stringify(response.body), /PRIVATE_(TITLE|DESCRIPTION|ADDRESS)_DO_NOT_EXPOSE/);
      }
      assert.equal((await request('POST', `/api/projects/${id}/publish`, owner)).status, 404);
      assert.deepEqual((await pool.query('SELECT published,published_at FROM projects WHERE id=$1', [project.id])).rows,
        [{ published: false, published_at: null }]);
      assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE action='project.published' AND entity_id=$1",
        [String(project.id)])).rows[0].count, 0);
    }
  });

  await t.test('only the current active owner can publish', async () => {
    const route = `/api/projects/${project.id}/publish`;
    assert.equal((await request('POST', route, null)).status, 401);
    assert.equal((await request('POST', route, stranger)).status, 404);
    assert.equal((await request('POST', route, contractor)).status, 404);
    await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [owner.id]);
    assert.equal((await request('POST', route, owner)).status, 404);
    assert.equal((await request('POST', '/api/projects', owner,
      { title: 'Disabled owner draft', description: 'Must not persist' })).status, 403);
    await pool.query("UPDATE users SET is_active=TRUE, role='contractor' WHERE id=$1", [owner.id]);
    assert.equal((await request('POST', route, owner)).status, 404);
    assert.equal((await request('POST', '/api/projects', owner,
      { title: 'Demoted owner draft', description: 'Must not persist' })).status, 403);
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

  await t.test('publication waits for a concurrent owner disable and keeps the draft private', async () => {
    const created = await request('POST', '/api/projects', owner, {
      title: 'Owner disable race', description: 'Must remain private', category: 'roofing',
    });
    assert.equal(created.status, 201);
    const draftId = created.body.project.id;
    const blocker = await pool.connect();
    let committed = false;
    try {
      await blocker.query('BEGIN');
      await blocker.query('UPDATE users SET is_active=FALSE WHERE id=$1', [owner.id]);
      const responsePromise = request('POST', `/api/projects/${draftId}/publish`, owner);
      await expectBlockedBy(blocker, responsePromise);
      await blocker.query('COMMIT');
      committed = true;
      assert.equal((await responsePromise).status, 409);
      assert.deepEqual((await pool.query('SELECT published,published_at FROM projects WHERE id=$1', [draftId])).rows,
        [{ published: false, published_at: null }]);
    } finally {
      if (!committed) await blocker.query('ROLLBACK');
      blocker.release();
      await pool.query('UPDATE users SET is_active=TRUE WHERE id=$1', [owner.id]);
    }
  });

  await t.test('old posting receipt cannot publish after a concurrent owner disable', async () => {
    const created = await request('POST', '/api/projects', owner, {
      title: 'Pending posting receipt', description: 'Must remain private', category: 'roofing',
    });
    assert.equal(created.status, 201);
    const draftId = created.body.project.id;
    const txHash = `fixture-pending-posting-${draftId}`;
    await pool.query(`INSERT INTO payment_receipts
      (tx_hash,kind,user_id,from_account,amount,project_id,verification_status)
      VALUES ($1,'job-posting',$2,'fixtureowner','25.0000 XPR',$3,'pending')`,
    [txHash, owner.id, draftId]);
    const originalVerifier = api._hooks.verifyHyperionTransfer;
    api._hooks.verifyHyperionTransfer = async () => ({ ok: true, from: 'fixtureowner' });
    const blocker = await pool.connect();
    let committed = false;
    try {
      await blocker.query('BEGIN');
      await blocker.query('UPDATE users SET is_active=FALSE WHERE id=$1', [owner.id]);
      const reconcilePromise = api.reconcilePendingPayments();
      await expectBlockedBy(blocker, reconcilePromise);
      await blocker.query('COMMIT');
      committed = true;
      await reconcilePromise;
      assert.deepEqual((await pool.query('SELECT published,published_at FROM projects WHERE id=$1', [draftId])).rows,
        [{ published: false, published_at: null }]);
      const receipt = (await pool.query('SELECT verification_status,verify_error FROM payment_receipts WHERE tx_hash=$1', [txHash])).rows[0];
      assert.equal(receipt.verification_status, 'confirmed');
      assert.equal(receipt.verify_error, 'publication_blocked_owner_or_project_ineligible');
    } finally {
      if (!committed) await blocker.query('ROLLBACK');
      blocker.release();
      api._hooks.verifyHyperionTransfer = originalVerifier;
      await pool.query('UPDATE users SET is_active=TRUE WHERE id=$1', [owner.id]);
    }
  });

  await t.test('October free publication does not offer the legacy XPR posting charge', async () => {
    const response = await request('POST', '/api/payment/job-posting', owner,
      { project_id: project.id });
    assert.equal(response.status, 410);
    assert.equal(response.body.code, 'legacy_job_posting_disabled');
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM job_posting_payments')).rows[0].count, 0);
    assert.equal((await pool.query('SELECT published FROM projects WHERE id=$1', [project.id])).rows[0].published, true);
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

  await t.test('paid project details expose only the nine-field brief to a current matching contractor', async () => {
    const route = `/api/projects/${project.id}/details`;
    const paidContractor = await fixtureUser('contractor', 'details-paid-contractor');
    const noGrantContractor = await fixtureUser('contractor', 'details-no-grant');
    const admin = await fixtureUser('admin', 'details-admin');
    const other = await request('POST', '/api/projects', owner,
      { title: 'Other offer', description: 'Separate grant', category: 'plumbing' });
    assert.equal(other.status, 201);
    const otherId = other.body.project.id;
    assert.equal((await request('POST', `/api/projects/${otherId}/publish`, owner)).status, 200);
    const draft = await request('POST', '/api/projects', owner,
      { title: 'Unpublished paid fixture', description: 'Must stay private' });
    assert.equal(draft.status, 201);
    const countsBefore = (await pool.query(`SELECT
      (SELECT COUNT(*)::int FROM bids) AS bids,
      (SELECT COUNT(*)::int FROM payment_receipts) AS receipts,
      (SELECT COUNT(*)::int FROM job_posting_payments) AS posting_payments`)).rows[0];

    for (const viewer of [stranger, admin, noGrantContractor, paidContractor]) {
      assertDetailsDenied(await request('GET', route, viewer));
    }
    assertDetailsDenied(await request('GET', '/api/projects/0/details', paidContractor));
    await pool.query(`INSERT INTO project_access_entitlements
      (project_id, contractor_id, status, provider_payment_id, verified_at)
      VALUES ($1, $2, 'paid', 'fixture-other-details', NOW())`, [otherId, paidContractor.id]);
    assertDetailsDenied(await request('GET', route, paidContractor));
    await pool.query(`INSERT INTO project_access_entitlements
      (project_id, contractor_id, status, provider_payment_id)
      VALUES ($1, $2, 'pending', 'fixture-target-details')`, [project.id, paidContractor.id]);
    assertDetailsDenied(await request('GET', route, paidContractor));

    await pool.query(`UPDATE project_access_entitlements SET status='paid', verified_at=NOW()
      WHERE project_id=$1 AND contractor_id=$2`, [project.id, paidContractor.id]);
    const stored = (await pool.query(`SELECT id,title,description,category,budget_min,budget_max,
      timeline_days,status,published_at,location,homeowner_id FROM projects WHERE id=$1`, [project.id])).rows[0];
    const allowed = {
      id: stored.id, title: stored.title, description: stored.description,
      category: stored.category, budget_min: stored.budget_min, budget_max: stored.budget_max,
      timeline_days: stored.timeline_days, status: stored.status,
      published_at: stored.published_at.toISOString(),
    };
    assert.equal(stored.location, 'PRIVATE_ADDRESS_DO_NOT_EXPOSE');
    assert.equal(stored.homeowner_id, owner.id);
    const paid = await request('GET', route, paidContractor);
    assert.equal(paid.status, 200);
    assertPrivateDetailsHeaders(paid);
    assert.deepEqual(Object.keys(paid.body), ['project']);
    assert.deepEqual(Object.keys(paid.body.project).sort(), Object.keys(allowed).sort());
    assert.deepEqual(paid.body.project, allowed);
    assert.ok(!JSON.stringify(paid.body).includes('PRIVATE_ADDRESS_DO_NOT_EXPOSE'));

    for (const status of ['failed', 'expired', 'refunded', 'revoked']) {
      await pool.query('UPDATE project_access_entitlements SET status=$3 WHERE project_id=$1 AND contractor_id=$2',
        [project.id, paidContractor.id, status]);
      assertDetailsDenied(await request('GET', route, paidContractor));
    }
    await pool.query("UPDATE project_access_entitlements SET status='paid' WHERE project_id=$1 AND contractor_id=$2",
      [project.id, paidContractor.id]);
    await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [paidContractor.id]);
    assertDetailsDenied(await request('GET', route, paidContractor));
    await pool.query("UPDATE users SET is_active=TRUE, role='homeowner' WHERE id=$1", [paidContractor.id]);
    assertDetailsDenied(await request('GET', route, paidContractor));
    await pool.query("UPDATE users SET role='contractor' WHERE id=$1", [paidContractor.id]);

    await pool.query(`INSERT INTO project_access_entitlements
      (project_id, contractor_id, status, provider_payment_id, verified_at)
      VALUES ($1, $2, 'paid', 'fixture-draft-details', NOW())`, [draft.body.project.id, paidContractor.id]);
    assertDetailsDenied(await request('GET', `/api/projects/${draft.body.project.id}/details`, paidContractor));
    await pool.query("UPDATE projects SET status='cancelled' WHERE id=$1", [otherId]);
    assertDetailsDenied(await request('GET', `/api/projects/${otherId}/details`, paidContractor));
    const countsAfter = (await pool.query(`SELECT
      (SELECT COUNT(*)::int FROM bids) AS bids,
      (SELECT COUNT(*)::int FROM payment_receipts) AS receipts,
      (SELECT COUNT(*)::int FROM job_posting_payments) AS posting_payments`)).rows[0];
    assert.deepEqual(countsAfter, countsBefore, 'Details reads must not create bids or payment records');
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

  await t.test('a disabled or demoted contractor cannot list persisted bids with an old token', async () => {
    const mine = await request('GET', '/api/bids/my/bids', contractor);
    assert.equal(mine.status, 200);
    assert.ok(mine.body.bids.some(bid => bid.project_id === project.id));
    try {
      await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [contractor.id]);
      assert.equal((await request('GET', '/api/bids/my/bids', contractor)).status, 403);
      await pool.query("UPDATE users SET is_active=TRUE, role='homeowner' WHERE id=$1", [contractor.id]);
      assert.equal((await request('GET', '/api/bids/my/bids', contractor)).status, 403);
    } finally {
      await pool.query("UPDATE users SET is_active=TRUE, role='contractor' WHERE id=$1", [contractor.id]);
    }
  });

  await t.test('a bid cannot pass a concurrent project close, access revocation or contractor disable', async () => {
    const created = await request('POST', '/api/projects', owner,
      { title: 'Concurrent access fixture', description: 'Local transaction check' });
    assert.equal(created.status, 201);
    const concurrentId = created.body.project.id;
    assert.equal((await request('POST', `/api/projects/${concurrentId}/publish`, owner)).status, 200);
    await pool.query(`INSERT INTO project_access_entitlements
      (project_id, contractor_id, status, provider_payment_id, verified_at)
      VALUES ($1, $2, 'paid', 'local-concurrency-fixture', NOW())`,
    [concurrentId, contractor.id]);

    for (const change of [
      { sql: `UPDATE projects SET status='cancelled' WHERE id=$1`, args: [concurrentId],
        expected: 404, reset: `UPDATE projects SET status='open' WHERE id=$1` },
      { sql: `UPDATE project_access_entitlements SET status='revoked'
        WHERE project_id=$1`, args: [concurrentId], expected: 403,
        reset: `UPDATE project_access_entitlements SET status='paid' WHERE project_id=$1` },
      { sql: 'UPDATE users SET is_active=FALSE WHERE id=$1', args: [contractor.id],
        expected: 403, reset: 'UPDATE users SET is_active=TRUE WHERE id=$1' },
    ]) {
      const blocker = await pool.connect();
      try {
        await blocker.query('BEGIN');
        await blocker.query(change.sql, change.args);
        const responsePromise = request('POST', '/api/bids', contractor,
          { project_id: concurrentId, amount: 1900 });
        await expectBlockedBy(blocker, responsePromise);
        await blocker.query('COMMIT');
        const response = await responsePromise;
        assert.equal(response.status, change.expected);
        assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM bids WHERE project_id=$1',
          [concurrentId])).rows[0].count, 0);
        await pool.query(change.reset, change.args);
      } finally {
        await blocker.query('ROLLBACK');
        blocker.release();
      }
    }
  });

  await t.test('escrow insert failure rolls back project and bid acceptance together', async () => {
    await pool.query(`UPDATE project_access_entitlements SET status='paid'
      WHERE project_id=$1 AND contractor_id=$2`, [project.id, contractor.id]);
    await pool.query(`UPDATE users SET phone='555-0100',
      profile=$2, wallet=$3 WHERE id=$1`, [contractor.id,
      { companyName: 'Fixture Co', ein: '12-3456789', licenseNumber: 'L-1',
        serviceArea: 'Seattle', specialties: ['roofing'] },
      { accountName: 'fixturewallet', permission: 'active', verified: true }]);
    for (const documentType of ['contractor_license', 'insurance_certificate', 'business_ein']) {
      await pool.query(`INSERT INTO user_documents (user_id, document_type, status)
        VALUES ($1, $2, 'approved')`, [contractor.id, documentType]);
    }
    const bid = (await pool.query(`SELECT id FROM bids WHERE project_id=$1 AND contractor_id=$2
      ORDER BY id DESC LIMIT 1`, [project.id, contractor.id])).rows[0];
    assert.ok(bid);
    await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [contractor.id]);
    assert.equal((await request('POST', `/api/bids/${bid.id}/accept`, owner)).status, 400);
    await pool.query('UPDATE users SET is_active=TRUE WHERE id=$1', [contractor.id]);
    await pool.query(`CREATE FUNCTION fixture_reject_escrow() RETURNS trigger LANGUAGE plpgsql
      AS $$ BEGIN RAISE EXCEPTION 'fixture escrow insert failure'; END $$`);
    await pool.query(`CREATE TRIGGER fixture_reject_escrow BEFORE INSERT ON escrow_contracts
      FOR EACH ROW EXECUTE FUNCTION fixture_reject_escrow()`);
    try {
      const response = await request('POST', `/api/bids/${bid.id}/accept`, owner);
      assert.equal(response.status, 500);
      assert.deepEqual((await pool.query('SELECT status,escrow_id FROM projects WHERE id=$1', [project.id])).rows,
        [{ status: 'open', escrow_id: null }]);
      assert.equal((await pool.query('SELECT status FROM bids WHERE id=$1', [bid.id])).rows[0].status,
        'pending');
      assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM escrow_contracts')).rows[0].count, 0);
    } finally {
      await pool.query('DROP TRIGGER fixture_reject_escrow ON escrow_contracts');
      await pool.query('DROP FUNCTION fixture_reject_escrow()');
    }
  });

  await t.test('acceptance waits for concurrent owner, contractor and document changes', async () => {
    const bid = (await pool.query(`SELECT id FROM bids WHERE project_id=$1 AND contractor_id=$2
      ORDER BY id DESC LIMIT 1`, [project.id, contractor.id])).rows[0];
    assert.ok(bid);
    for (const change of [
      { sql: 'UPDATE users SET is_active=FALSE WHERE id=$1', args: [owner.id],
        reset: 'UPDATE users SET is_active=TRUE WHERE id=$1', expected: [owner.id] },
      { sql: 'UPDATE users SET is_active=FALSE WHERE id=$1', args: [contractor.id],
        reset: 'UPDATE users SET is_active=TRUE WHERE id=$1', expected: [contractor.id] },
      { sql: `UPDATE user_documents SET status='rejected'
        WHERE user_id=$1 AND document_type='contractor_license'`, args: [contractor.id],
        reset: `UPDATE user_documents SET status='approved'
          WHERE user_id=$1 AND document_type='contractor_license'`, expected: [contractor.id] },
    ]) {
      const blocker = await pool.connect();
      try {
        await blocker.query('BEGIN');
        await blocker.query(change.sql, change.args);
        const responsePromise = request('POST', `/api/bids/${bid.id}/accept`, owner);
        await expectBlockedBy(blocker, responsePromise);
        await blocker.query('COMMIT');
        assert.equal((await responsePromise).status, 409);
        assert.deepEqual((await pool.query('SELECT status,escrow_id FROM projects WHERE id=$1',
          [project.id])).rows, [{ status: 'open', escrow_id: null }]);
        assert.equal((await pool.query('SELECT status FROM bids WHERE id=$1', [bid.id])).rows[0].status,
          'pending');
        await pool.query(change.reset, change.expected);
      } finally {
        await blocker.query('ROLLBACK');
        blocker.release();
      }
    }
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

  await t.test('wallet login resolves exactly one verified active PostgreSQL identity and consumes its proof', async () => {
    const user = await fixtureUser('contractor', 'wallet-login-owner');
    const duplicate = await fixtureUser('contractor', 'wallet-login-duplicate');
    const key = Key.PrivateKey.fromElliptic(
      Key.constructElliptic(Numeric.KeyType.k1).genKeyPair(), Numeric.KeyType.k1);
    const wallet = { accountName: 'fixture11111', verified: true,
      publicKey: key.getPublicKey().toString() };
    const originalAuthority = api._hooks.verifyOwnershipAuthority;
    api._hooks.verifyOwnershipAuthority = async identity => identity.accountName === wallet.accountName
      && identity.permission === 'active' && identity.publicKey === wallet.publicKey;
    const prove = async () => {
      const challenge = await request('POST', '/api/auth/wallet/challenge', null,
        { accountName: wallet.accountName, permission: 'active' });
      assert.equal(challenge.status, 200);
      assert.deepEqual(challenge.body.signingOptions, { broadcast: false, noModify: true });
      const digest = digestFromSerializedData(challenge.body.chainId,
        Buffer.from(challenge.body.serializedTransaction, 'hex'));
      const body = { accountName: wallet.accountName, permission: 'active',
        sessionBinding: challenge.body.sessionBinding,
        proof: { challengeId: challenge.body.challengeId,
          serializedTransaction: challenge.body.serializedTransaction,
          signatures: [key.sign(digest, false).toString()] } };
      return { response: await request('POST', '/api/auth/wallet/verify', null, body), body };
    };
    try {
      await pool.query('UPDATE users SET wallet=$2, profile=$3 WHERE id=$1',
        [user.id, wallet, { companyName: 'Synthetic Login Co' }]);
      const { response, body } = await prove();
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.user.id, user.id);
      assert.equal(response.body.user.role, 'contractor');
      assert.equal(response.body.user.wallet.accountName, wallet.accountName);
      assert.equal(response.body.user.wallet.verified, true);
      assert.equal(response.body.user.profile.companyName, 'Synthetic Login Co');
      assert.ok(!Object.hasOwn(response.body.user, 'password_hash'));
      assert.equal(typeof response.body.token, 'string');
      const me = await request('GET', '/api/auth/profile', null, undefined,
        { Authorization: `Bearer ${response.body.token}` });
      assert.equal(me.status, 200);
      assert.equal(me.body.user.id, user.id);
      const replay = await request('POST', '/api/auth/wallet/verify', null, body);
      assert.equal(replay.status, 400);
      assert.equal(replay.body.code, 'wallet_proof_not_found');

      for (const denied of [
        { wallet: null, active: true },
        { wallet: { ...wallet, verified: false }, active: true },
        { wallet, active: false },
        { wallet: { ...wallet, permission: 'owner' }, active: true },
        { wallet, active: true, duplicate: true },
      ]) {
        await pool.query('UPDATE users SET wallet=$2, is_active=$3 WHERE id=$1',
          [user.id, denied.wallet, denied.active]);
        await pool.query('UPDATE users SET wallet=$2 WHERE id=$1',
          [duplicate.id, denied.duplicate ? wallet : null]);
        const result = await prove();
        assert.equal(result.response.status, 401, JSON.stringify(result.response.body));
        assert.equal(result.response.body.code, 'wallet_login_unavailable');
        assert.ok(!Object.hasOwn(result.response.body, 'token'));
      }
      assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE action='wallet.login' AND actor_id=$1",
        [user.id])).rows[0].count, 1);
    } finally {
      api._hooks.verifyOwnershipAuthority = originalAuthority;
    }
  });

  await t.test('explicit legacy posting preserves receipt replay after publication and process restart', async () => {
    await stopApi();
    await startApi({ legacyPosting: true });
    const paymentOwner = await fixtureUser('homeowner', 'legacy-posting-owner');
    await pool.query('UPDATE users SET wallet=$2 WHERE id=$1', [paymentOwner.id,
      { accountName: 'fixture11112', permission: 'active', verified: true }]);
    const created = await request('POST', '/api/projects', paymentOwner,
      { title: 'Synthetic legacy posting', description: 'No real payment' });
    assert.equal(created.status, 201);
    const body = { project_id: created.body.project.id };
    const txHash = 'e'.repeat(64);
    let verificationCalls = 0;
    api._hooks.verifyHyperionTransfer = async input => {
      verificationCalls++;
      assert.equal(input.expectedFrom, 'fixture11112');
      return { ok: true, from: 'fixture11112', block_num: 12345 };
    };
    assert.equal((await request('POST', '/api/payment/job-posting', paymentOwner, body,
      { 'X-Payment-Tx': txHash.toUpperCase() })).status, 200);
    assert.equal(verificationCalls, 1);
    await stopApi();
    await startApi({ legacyPosting: true });
    api._hooks.verifyHyperionTransfer = async () => { throw new Error('Replay must not reach verifier'); };
    for (const status of ['open', 'in_progress', 'completed']) {
      await pool.query('UPDATE projects SET status=$2 WHERE id=$1', [body.project_id, status]);
      const replay = await request('POST', '/api/payment/job-posting', paymentOwner, body,
        { 'X-Payment-Tx': txHash });
      assert.equal(replay.status, 409, JSON.stringify(replay.body));
      assert.equal(replay.body.error, 'Payment already processed');
      const fresh = await request('POST', '/api/payment/job-posting', paymentOwner, body,
        { 'X-Payment-Tx': 'f'.repeat(64) });
      assert.equal(fresh.status, 400);
      assert.deepEqual((await pool.query('SELECT published,status FROM projects WHERE id=$1',
        [body.project_id])).rows, [{ published: true, status }]);
    }
    const foreign = await request('POST', '/api/payment/job-posting', paymentOwner,
      { project_id: project.id }, { 'X-Payment-Tx': txHash });
    assert.equal(foreign.status, 400);
    assert.ok(!Object.hasOwn(foreign.body, 'tx_hash'));
    for (const table of ['payment_receipts', 'job_posting_payments']) {
      assert.equal((await pool.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE tx_hash=$1`,
        [txHash])).rows[0].count, 1);
    }
  });

  fs.writeFileSync(path.join(runDirectory, 'publication-acceptance.json'), JSON.stringify({
    status: 'RUN_FINISHED', verdictSource: 'result.json testExitCode and postgresExitCode',
    apiSourceSha256: sourceSha256, projectSources: selectedSources, database: 'fresh loopback PostgreSQL',
    projectId: project.id, checks: ['private draft', 'owner draft details and cache headers', 'owner authority',
      'legacy posting disabled', 'exact public preview', 'paid nine-field details and uniform denials',
      'project-specific paid bid access', 'concurrent close access revoke and contractor disable',
      'atomic bid acceptance', 'concurrent owner and contractor eligibility', 'legacy bid blocked',
      'synthetic proof PostgreSQL wallet login and denials', 'legacy receipt replay after restart'],
  }, null, 2) + '\n');
});
