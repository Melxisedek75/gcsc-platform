const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { validateLocalTestDatabase } = require('../scripts/local-test-database.cjs');
const { profileDocumentAcceptance } = require('./profile-documents.acceptance.cjs');
const { chatAcceptance } = require('./chat.acceptance.cjs');

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
for (const file of ['wallet-ownership-proof.cjs', 'wallet-challenge-store.cjs']) {
  fs.copyFileSync(path.join(apiRoot, file), path.join(appDirectory, file), fs.constants.COPYFILE_EXCL);
}
fs.mkdirSync(path.join(appDirectory, 'database'));
for (const file of ['migrate-schema.cjs', 'schema-statements.cjs']) {
  fs.copyFileSync(path.join(apiRoot, 'database', file), path.join(appDirectory, 'database', file), fs.constants.COPYFILE_EXCL);
}
const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
const { migrateSchema, schemaDigest } = require(path.join(appDirectory, 'database/migrate-schema.cjs'));
let api;
let base;

async function schemaPool(t, name) {
  assert.match(name, /^fixture_[a-z_]+$/);
  await pool.query(`CREATE SCHEMA ${name}`);
  const isolated = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000,
    options: `-c search_path=${name}` });
  t.after(() => isolated.end());
  return isolated;
}

async function schemaSnapshot(name) {
  const columns = await pool.query(`SELECT table_name,column_name,data_type,is_nullable,column_default
    FROM information_schema.columns WHERE table_schema = $1 ORDER BY table_name,ordinal_position`, [name]);
  const constraints = await pool.query(`SELECT c.relname AS table_name,p.conname,p.contype,pg_get_constraintdef(p.oid) AS definition
    FROM pg_constraint p JOIN pg_class c ON c.oid = p.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 ORDER BY c.relname,p.conname`, [name]);
  const indexes = await pool.query(`SELECT tablename,indexname,indexdef FROM pg_indexes
    WHERE schemaname = $1 ORDER BY tablename,indexname`, [name]);
  return JSON.stringify({ columns: columns.rows, constraints: constraints.rows, indexes: indexes.rows })
    .replaceAll(`${name}.`, '').replaceAll('public.', '');
}

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

async function request(method, route, user, body, options = {}) {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? {
      Authorization: `Bearer ${api.jwtSign({ userId: user.id, role: user.role, email: user.email })}`,
    } : {}), ...options.headers },
    ...(options.rawBody !== undefined ? { body: options.rawBody } : body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, headers: response.headers, body: await response.json() };
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

  await t.test('drafts stay private until free publication and discovery never filters on private location', async () => {
    assert.deepEqual((await request('GET', '/api/projects/my/projects', otherOwner)).body.projects, []);
    assert.equal((await request('GET', '/api/projects/my/projects', owner)).body.projects[0].id, project.id);
    assert.deepEqual((await request('GET', '/api/projects?category=roofing')).body.projects, []);
    assert.equal((await request('GET', `/api/projects/${project.id}`)).status, 404);
    assert.equal((await request('POST', `/api/projects/${project.id}/publish`, otherOwner)).status, 404);
    assert.equal((await request('POST', `/api/projects/${project.id}/publish`, owner)).status, 200);
    assert.equal((await pool.query('SELECT published FROM projects WHERE id=$1', [project.id])).rows[0].published, true);
    const preview = (await request('GET', '/api/projects?category=roofing')).body.projects;
    assert.equal(preview.length, 1);
    assert.equal(preview[0].id, project.id);
    assert.equal(preview[0].description, undefined);
    assert.equal(preview[0].location, undefined);
    assert.equal((await request('GET', '/api/projects?category=roofing&location=seattle')).status, 400);
    assert.deepEqual((await request('GET', '/api/projects?category=plumbing')).body.projects, []);
  });

  await t.test('bid creation denies anonymous/homeowner/unknown-project requests', async () => {
    const body = { project_id: project.id, amount: 1800 };
    assert.equal((await request('POST', '/api/bids', null, body)).status, 401);
    assert.equal((await request('POST', '/api/bids', owner, body)).status, 403);
    assert.equal((await request('POST', '/api/bids', contractor, { ...body, project_id: 999999 })).status, 404);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM bids')).rows[0].count, 0);
  });

  await t.test('contractor bid requires a project-specific fixture grant before persistence', async () => {
    assert.equal((await request('POST', '/api/bids', contractor, { project_id: project.id, amount: 1800 })).status, 403);
    // Isolated SQL evidence only, not a provider payment or checkout acceptance.
    await pool.query(`INSERT INTO project_access_entitlements(project_id,contractor_id,status,provider_payment_id,verified_at)
      VALUES ($1,$2,'paid','isolated-baseline-fixture',NOW())`, [project.id, contractor.id]);
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

  await t.test('upgrade preserves legacy milestone actions while replacing their CHECK constraint', async () => {
    const escrow = (await pool.query(`INSERT INTO escrow_contracts(project_id,homeowner_id,contractor_id,total_amount)
      VALUES ($1,$2,$3,1800) RETURNING id`, [project.id, owner.id, contractor.id])).rows[0];
    const milestone = (await pool.query(`INSERT INTO milestones(escrow_id,title,amount)
      VALUES ($1,'Fixture milestone',600) RETURNING id`, [escrow.id])).rows[0];
    await pool.query('ALTER TABLE milestone_chain_txs DROP CONSTRAINT milestone_chain_txs_action_check');
    await pool.query(`ALTER TABLE milestone_chain_txs ADD CONSTRAINT milestone_chain_txs_action_check
      CHECK (action IN ('submitmilestone','approvemilestone','releasemilestone','disputemilestone'))`);
    const oldActions = ['submitmilestone', 'approvemilestone', 'releasemilestone', 'disputemilestone'];
    for (const action of oldActions) {
      await pool.query(`INSERT INTO milestone_chain_txs(milestone_id,escrow_id,action,tx_id)
        VALUES ($1,$2,$3,$4)`, [milestone.id, escrow.id, action, `fixture-${action}`]);
    }
    await api.initStorage();
    assert.deepEqual((await pool.query('SELECT action FROM milestone_chain_txs ORDER BY id')).rows.map(row => row.action),
      ['submitms', 'approvems', 'releasems', 'disputems']);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM milestone_chain_txs')).rows[0].count, 4);
    await assert.rejects(pool.query("UPDATE milestone_chain_txs SET action = 'invalid'"), { code: '23514' });
    await api.initStorage();
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM milestone_chain_txs')).rows[0].count, 4);
  });

  await t.test('standalone exported SQL creates the same complete schema as API startup and can repeat', async s => {
    const sqlPool = await schemaPool(s, 'fixture_export');
    const exported = spawnSync(process.execPath, [path.join(apiRoot, 'scripts/migrate-postgres.mjs'), '--print-sql'],
      { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    assert.equal(exported.status, 0, exported.stderr);
    assert.ok(exported.stdout.includes(schemaDigest));
    await sqlPool.query(exported.stdout);
    assert.equal(await schemaSnapshot('fixture_export'), await schemaSnapshot('public'));
    await sqlPool.query(exported.stdout);
    assert.equal(await schemaSnapshot('fixture_export'), await schemaSnapshot('public'));
    fs.writeFileSync(path.join(runDirectory, 'canonical-schema.sql'), exported.stdout);
  });

  await t.test('additive canonical upgrade preserves user/project/receipt values and backfills new columns', async s => {
    const upgrade = await schemaPool(s, 'fixture_upgrade');
    await migrateSchema(upgrade);
    await upgrade.query(`INSERT INTO users(id,email,password_hash,role,full_name) VALUES (1,'upgrade@example.invalid','fixture','homeowner','Owner');
      INSERT INTO projects(id,homeowner_id,title) VALUES (1,1,'Preserved project');
      INSERT INTO payment_receipts(tx_hash,kind,user_id,amount) VALUES ('fixture-receipt','lead_token',1,'50.0000 XPR');
      INSERT INTO user_documents(user_id,document_type,file_name,status) VALUES (1,'contractor_license','preserved.pdf','approved');
      DROP TABLE chat_messages,chat_threads;
      DROP INDEX idx_bids_chat_pair;
      ALTER TABLE user_documents DROP COLUMN revision;
      ALTER TABLE users DROP COLUMN email_verified;
      ALTER TABLE projects DROP COLUMN published;
      ALTER TABLE projects DROP COLUMN published_at;
      ALTER TABLE payment_receipts DROP COLUMN verification_status;`);
    await migrateSchema(upgrade);
    assert.deepEqual((await upgrade.query('SELECT full_name,email_verified FROM users WHERE id=1')).rows,
      [{ full_name: 'Owner', email_verified: false }]);
    assert.deepEqual((await upgrade.query('SELECT title,published,published_at FROM projects WHERE id=1')).rows,
      [{ title: 'Preserved project', published: false, published_at: null }]);
    assert.deepEqual((await upgrade.query('SELECT tx_hash,amount,verification_status FROM payment_receipts')).rows,
      [{ tx_hash: 'fixture-receipt', amount: '50.0000 XPR', verification_status: 'confirmed' }]);
    assert.deepEqual((await upgrade.query('SELECT file_name,status,revision FROM user_documents')).rows,
      [{ file_name: 'preserved.pdf', status: 'approved', revision: 1 }]);
    await migrateSchema(upgrade);
    assert.equal((await upgrade.query('SELECT COUNT(*)::int AS count FROM payment_receipts')).rows[0].count, 1);
    assert.equal((await upgrade.query('SELECT COUNT(*)::int AS count FROM chat_threads')).rows[0].count, 0);
    assert.equal((await upgrade.query('SELECT COUNT(*)::int AS count FROM chat_messages')).rows[0].count, 0);
  });

  await t.test('unknown action rolls back both DDL and data; original constraint survives failure', async s => {
    const broken = await schemaPool(s, 'fixture_rollback');
    await migrateSchema(broken);
    await broken.query(`INSERT INTO users(id,email,password_hash,role) VALUES
      (1,'owner@example.invalid','fixture','homeowner'),(2,'contractor@example.invalid','fixture','contractor');
      INSERT INTO projects(id,homeowner_id,title) VALUES (1,1,'Fixture');
      INSERT INTO escrow_contracts(id,project_id,homeowner_id,contractor_id,total_amount) VALUES (1,1,1,2,100);
      INSERT INTO milestones(id,escrow_id,amount) VALUES (1,1,100);
      ALTER TABLE users DROP COLUMN email_verified;
      ALTER TABLE milestone_chain_txs DROP CONSTRAINT milestone_chain_txs_action_check;
      ALTER TABLE milestone_chain_txs ADD CONSTRAINT milestone_chain_txs_action_check CHECK (action IN ('submitmilestone','unknown'));
      INSERT INTO milestone_chain_txs(milestone_id,escrow_id,action,tx_id) VALUES
        (1,1,'submitmilestone','fixture-old'),(1,1,'unknown','fixture-unknown');`);
    const before = await schemaSnapshot('fixture_rollback');
    await assert.rejects(migrateSchema(broken), { code: '23514' });
    assert.equal(await schemaSnapshot('fixture_rollback'), before);
    assert.deepEqual((await broken.query('SELECT action FROM milestone_chain_txs ORDER BY id')).rows.map(row => row.action),
      ['submitmilestone', 'unknown']);
    await assert.rejects(broken.query("UPDATE milestone_chain_txs SET action='submitms' WHERE tx_id='fixture-old'"), { code: '23514' });
  });

  await t.test('two simultaneous migrations serialize on a fresh schema', async s => {
    const parallel = await schemaPool(s, 'fixture_parallel');
    await Promise.all([migrateSchema(parallel), migrateSchema(parallel)]);
    assert.equal(await schemaSnapshot('fixture_parallel'), await schemaSnapshot('public'));
  });

  await t.test('old init.sql schema is rejected before changes instead of reporting false readiness', async s => {
    const legacy = await schemaPool(s, 'fixture_legacy');
    await legacy.query(fs.readFileSync(path.join(apiRoot, 'database/init.sql'), 'utf8'));
    const before = await schemaSnapshot('fixture_legacy');
    await assert.rejects(migrateSchema(legacy), { code: '0A000' });
    assert.equal(await schemaSnapshot('fixture_legacy'), before);
  });

  await profileDocumentAcceptance(t, { pool, request, fixtureUser, startApi, stopApi });
  await chatAcceptance(t, { pool, request, fixtureUser, startApi, stopApi });

  fs.writeFileSync(path.join(runDirectory, 'api-source.sha256'), createHash('sha256').update(source).digest('hex') + '\n');
  const hashes = Object.fromEntries(['pure-server.cjs', 'wallet-ownership-proof.cjs', 'wallet-challenge-store.cjs',
    'database/migrate-schema.cjs', 'database/schema-statements.cjs']
    .map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(appDirectory, file))).digest('hex')]));
  fs.writeFileSync(path.join(runDirectory, 'api-files.sha256.json'), JSON.stringify(hashes, null, 2) + '\n');
});
