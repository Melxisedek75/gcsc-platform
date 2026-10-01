const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { validateLocalTestDatabase } = require('../scripts/local-test-database.cjs');
const { readProjectManifest, copyApiSnapshot } = require('./postgres-project-sources.cjs');

const apiRoot = path.resolve(__dirname, '../services/api/v3');
const runDirectory = fs.realpathSync(process.env.GCSC_TEST_RUN_DIRECTORY);
assert.match(path.relative(fs.realpathSync(path.join(apiRoot, '.tmp')), runDirectory), /^postgres-baseline-[a-zA-Z0-9]+$/);
const databaseUrl = validateLocalTestDatabase(process.env.TEST_DATABASE_URL);
assert.equal(process.env.DATABASE_URL, databaseUrl);
assert.equal(process.env.NODE_ENV, 'test');
const sources = readProjectManifest(runDirectory);
const snapshot = path.dirname(copyApiSnapshot(sources, runDirectory));
const { migrateSchema } = require(path.join(snapshot, 'database/migrate-schema.cjs'));
const { reserveLeadPurchase, buildCheckoutSessionRequest, attachCheckoutSession, getLeadPurchase } = require(path.join(snapshot, 'database/lead-checkout.cjs'));
const { receiveLeadCheckoutEvent } = require(path.join(snapshot, 'database/lead-checkout-events.cjs'));
const { Pool } = createRequire(path.join(apiRoot, 'package.json'))('pg');
const Stripe = createRequire(path.join(apiRoot, 'package.json'))('stripe');
const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
const policy = { mode: 'test', currency: 'usd', version: 'fixture-v1', amountCents: 2500 };
const webhookConfig = { mode: 'test', apiVersion: '2025-02-24.acacia', webhookSecret: 'whsec_synthetic_local_fixture_only_2026' };
const loopbackFetch = global.fetch;
global.fetch = async () => { throw new Error('Provider/network calls forbidden in this fixture'); };

async function fixture() {
  const users = [];
  for (const role of ['homeowner', 'contractor', 'contractor']) {
    users.push((await pool.query(`INSERT INTO users (email,password_hash,role,full_name)
      VALUES ($1,'fixture-not-a-password',$2,'Synthetic') RETURNING *`, [`${randomUUID()}@example.invalid`, role])).rows[0]);
  }
  const project = (await pool.query(`INSERT INTO projects
    (homeowner_id,title,description,category,location,status,published)
    VALUES ($1,'Private fixture','Not sent to provider','other','Private','open',TRUE) RETURNING *`, [users[0].id])).rows[0];
  return { owner: users[0], buyer: users[1], other: users[2], project,
    request: { projectId: project.id, contractorId: users[1].id, requestKey: randomUUID() } };
}
function session(row, sessionId = `cs_test_${randomUUID().replaceAll('-', '')}`) {
  const request = buildCheckoutSessionRequest({ ...row, provider_checkout_id: null }, 'https://preview.example.test');
  return { id: sessionId, object: 'checkout.session', livemode: false,
    url: `https://checkout.stripe.com/c/pay/${sessionId}`, mode: 'payment', status: 'open', payment_status: 'unpaid',
    client_reference_id: row.id, currency: 'usd', amount_total: row.amount_cents, amount_subtotal: row.amount_cents,
    expires_at: request.params.expires_at, metadata: request.params.metadata };
}
// Windows Node/PG clocks can straddle a second. Synthetic post-purchase facts
// must not predate their known reservation; explicit invalid-time overrides remain.
const providerTime = row => Math.max(Math.floor(Date.now() / 1000), Math.floor(new Date(row.created_at).getTime() / 1000));
function signedEvent(row, overrides = {}) {
  const event = { id: `evt_${randomUUID().replaceAll('-', '')}`, object: 'event',
    api_version: webhookConfig.apiVersion, livemode: false, created: providerTime(row),
    type: 'checkout.session.completed', data: { object: {
      object: 'checkout.session', id: row.provider_checkout_id || `cs_test_${randomUUID().replaceAll('-', '')}`,
      livemode: false, mode: 'payment', status: 'complete', payment_status: 'paid',
      currency: row.currency, amount_total: row.amount_cents, amount_subtotal: row.amount_cents,
      client_reference_id: row.id, expires_at: Math.floor(new Date(row.expires_at).getTime() / 1000),
      payment_intent: `pi_${randomUUID().replaceAll('-', '')}`, customer_email: 'never-store@example.invalid',
      metadata: { purpose: 'project_access_v1', purchase_id: row.id, project_id: String(row.project_id),
        contractor_id: String(row.contractor_id), price_version: row.price_version } } }, ...overrides };
  return signEvent(event);
}
function signEvent(event, pretty = false) {
  const raw = Buffer.from(JSON.stringify(event, null, pretty ? 2 : undefined));
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: raw.toString(), secret: webhookConfig.webhookSecret });
  return { event, raw, signature };
}
function receive(input, selectedPool = pool) {
  return receiveLeadCheckoutEvent(selectedPool, input.raw, input.signature, webhookConfig);
}
function fulfill(eventId, selectedPool = pool) {
  return require(path.join(snapshot, 'database/lead-checkout-fulfillment.cjs')).fulfillLeadCheckoutEvent(selectedPool, eventId);
}
function sweep(options = {}, selectedPool = pool) {
  return require(path.join(snapshot, 'database/lead-checkout-retry.cjs')).sweepDueLeadCheckoutEvents(selectedPool, options);
}
// Advance only the worker's clock read; locks, rows and all writes use real PG.
function atDatabaseTime(now) {
  return { connect: async () => {
    const client = await pool.connect();
    return { release: error => client.release(error), query: (sql, ...args) =>
      sql === 'SELECT clock_timestamp() AS now'
        ? client.query('SELECT $1::timestamptz AS now', [now]) : client.query(sql, ...args) };
  } };
}
async function paidFixture() {
  const f = await fixture();
  const row = await reserveLeadPurchase(pool, f.request, policy);
  const input = signedEvent(row);
  await receive(input);
  return { ...f, row, input };
}
async function unboundFixture() {
  const f = await fixture();
  const row = await reserveLeadPurchase(pool, f.request, policy);
  return { ...f, row, input: signedEvent(row) };
}
async function dueFixture() {
  const f = await unboundFixture();
  const input = signedEvent(f.row, { created: Math.floor(new Date(f.row.created_at).getTime() / 1000) });
  await receive(input);
  return { ...f, input };
}
function refund(f, overrides = {}) {
  const created = providerTime(f.row);
  return signEvent({ id: `evt_${randomUUID().replaceAll('-', '')}`, object: 'event',
    api_version: webhookConfig.apiVersion, livemode: false, created,
    type: 'refund.created', data: { object: { id: `re_${randomUUID().replaceAll('-', '')}`, object: 'refund',
      status: 'succeeded', amount: f.row.amount_cents, currency: 'usd',
      payment_intent: f.input.event.data.object.payment_intent, charge: 'ch_localfixture',
      created, metadata: { private: 'do-not-store' },
      instructions_email: 'private@example.invalid', ...overrides } } });
}
function dispute(f, overrides = {}, type = 'charge.dispute.created') {
  const created = providerTime(f.row);
  return signEvent({ id: `evt_${randomUUID().replaceAll('-', '')}`, object: 'event',
    api_version: webhookConfig.apiVersion, livemode: false, created, type,
    data: { object: { id: `du_${randomUUID().replaceAll('-', '')}`, object: 'dispute',
      status: 'needs_response', livemode: false, amount: f.row.amount_cents, currency: 'usd',
      payment_intent: f.input.event.data.object.payment_intent, charge: 'ch_localfixture', created,
      metadata: { private: 'do-not-store' }, evidence: { customer_email_address: 'private@example.invalid' },
      ...overrides } } });
}
async function fulfillmentState(f) {
  return {
    purchase: (await pool.query('SELECT * FROM project_access_purchases WHERE id=$1', [f.row.id])).rows[0],
    event: (await pool.query('SELECT * FROM project_access_checkout_events WHERE event_id=$1', [f.input.event.id])).rows[0],
    grants: (await pool.query('SELECT * FROM project_access_entitlements WHERE project_id=$1 AND contractor_id=$2', [f.project.id, f.buyer.id])).rows,
    audits: (await pool.query("SELECT * FROM audit_events WHERE metadata->>'purchase_id'=$1", [f.row.id])).rows,
  };
}
async function blocked(blocker) {
  const pid = (await blocker.query('SELECT pg_backend_pid() AS id')).rows[0].id;
  const deadline = Date.now() + 5000;
  // Observe actual PostgreSQL lock waiting instead of relying on a sleep duration.
  while (Date.now() < deadline) {
    const result = await pool.query('SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))', [pid]);
    if (result.rowCount) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Expected transactional lock wait was not observed');
}

test.before(async () => { await migrateSchema(pool); });
test.after(async () => {
  await pool.end();
  fs.writeFileSync(path.join(runDirectory, 'lead-checkout-acceptance.json'), JSON.stringify({
    status: 'RUN_FINISHED_CHECK_RUNNER_EXIT_CODES', sourceFiles: sources.api.files,
    boundary: 'Disposable PostgreSQL, synthetic policy/sessions and locally SDK-signed events/grants; no provider request, real payment, external delivery or HTTP activation',
  }, null, 2));
});

test('durable reservation and immutable replay survive reconnect and schema rerun', async () => {
  const f = await fixture();
  const row = await reserveLeadPurchase(pool, f.request, policy);
  assert.equal(row.status, 'pending');
  assert.equal(row.amount_cents, 2500);
  assert.equal(row.provider_checkout_id, null);
  const another = new Pool({ connectionString: databaseUrl });
  try {
    const replay = await reserveLeadPurchase(another, f.request, { ...policy, amountCents: 3900, version: 'fixture-v2' });
    assert.equal(replay.id, row.id); assert.equal(replay.price_version, 'fixture-v1');
    assert.equal(replay.amount_cents, 2500);
    assert.deepEqual(buildCheckoutSessionRequest(replay, 'https://preview.example.test'), buildCheckoutSessionRequest(row, 'https://preview.example.test'));
  } finally { await another.end(); }
  await migrateSchema(pool);
  assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).id, row.id);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_entitlements')).rows[0].count, 0);
});

test('six concurrent retries reserve exactly one purchase', async () => {
  const f = await fixture();
  const rows = await Promise.all(Array.from({ length: 6 }, () => reserveLeadPurchase(pool, f.request, policy)));
  assert.equal(new Set(rows.map(row => row.id)).size, 1);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_purchases WHERE project_id=$1', [f.project.id])).rows[0].count, 1);
});

test('different request keys cannot create simultaneous purchases for the same pair', async () => {
  const f = await fixture();
  const results = await Promise.allSettled([reserveLeadPurchase(pool, f.request, policy),
    reserveLeadPurchase(pool, { ...f.request, requestKey: randomUUID() }, policy)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'lead_checkout_already_pending');
});

test('one buyer retry key cannot be reused across two projects concurrently', async () => {
  const f = await fixture(); const g = await fixture();
  const results = await Promise.allSettled([reserveLeadPurchase(pool, f.request, policy),
    reserveLeadPurchase(pool, { ...f.request, projectId: g.project.id }, policy)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'lead_checkout_idempotency_conflict');
});

test('current identity, publication, lifecycle and existing grant are authoritative', async () => {
  for (const sql of ["UPDATE users SET is_active=FALSE WHERE id=$1", "UPDATE users SET role='homeowner' WHERE id=$1",
    "UPDATE projects SET published=FALSE WHERE id=$1", "UPDATE projects SET status='completed' WHERE id=$1"]) {
    const f = await fixture();
    await pool.query(sql, [sql.startsWith('UPDATE users') ? f.buyer.id : f.project.id]);
    await assert.rejects(reserveLeadPurchase(pool, f.request, policy), { code: 'lead_checkout_unavailable' });
  }
  const f = await fixture();
  await pool.query(`INSERT INTO project_access_entitlements (project_id,contractor_id,status,provider_payment_id,verified_at)
    VALUES ($1,$2,'paid','synthetic-existing',NOW())`, [f.project.id, f.buyer.id]);
  await assert.rejects(reserveLeadPurchase(pool, f.request, policy), { code: 'lead_checkout_existing_entitlement' });
});

test('uncommitted buyer deactivation blocks reservation then denies it after commit', async () => {
  const f = await fixture(); const blocker = await pool.connect();
  let pending;
  try {
    await blocker.query('BEGIN');
    await blocker.query('UPDATE users SET is_active=FALSE WHERE id=$1', [f.buyer.id]);
    pending = reserveLeadPurchase(pool, f.request, policy).then(value => ({ value }), error => ({ error }));
    await blocked(blocker);
    await blocker.query('COMMIT');
    assert.equal((await pending).error?.code, 'lead_checkout_unavailable');
  } finally { await blocker.query('ROLLBACK'); blocker.release(); if (pending) await pending; }
});

test('valid attached session remains pending, and exact retry is idempotent', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const response = session(row);
  const first = await attachCheckoutSession(pool, row.id, response);
  const second = await attachCheckoutSession(pool, row.id, response);
  assert.equal(first.provider_checkout_id, response.id);
  assert.equal(first.status, 'pending'); assert.equal(second.status, 'pending');
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_entitlements WHERE project_id=$1', [f.project.id])).rows[0].count, 0);
  await assert.rejects(attachCheckoutSession(pool, row.id, session(row)), { code: 'lead_checkout_session_conflict' });
});

test('forged session amount/buyer/project never mutates the reservation', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  for (const change of [{ amount_total: 1 }, { livemode: true }, { metadata: {} }, { client_reference_id: randomUUID() }]) {
    await assert.rejects(attachCheckoutSession(pool, row.id, { ...session(row), ...change }), { code: 'lead_checkout_session_mismatch' });
    assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).provider_checkout_id, null);
  }
});

test('closed project or disabled buyer between reserve and attach cannot expose checkout', async () => {
  for (const target of ['project', 'buyer', 'owner']) {
    const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
    if (target === 'project') await pool.query("UPDATE projects SET status='completed' WHERE id=$1", [f.project.id]);
    else await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [target === 'buyer' ? f.buyer.id : f.owner.id]);
    await assert.rejects(attachCheckoutSession(pool, row.id, session(row)), { code: 'lead_checkout_unavailable' });
    assert.equal((await pool.query('SELECT checkout_url FROM project_access_purchases WHERE id=$1', [row.id])).rows[0].checkout_url, null);
  }
});

test('purchase reads are buyer-scoped and hide hosted URL after project closure', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const response = session(row); await attachCheckoutSession(pool, row.id, response);
  assert.equal(await getLeadPurchase(pool, f.other.id, row.id), null);
  assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).checkout_url, response.url);
  await pool.query("UPDATE projects SET status='completed' WHERE id=$1", [f.project.id]);
  assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).checkout_url, null);
  await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [f.buyer.id]);
  assert.equal(await getLeadPurchase(pool, f.buyer.id, row.id), null);
});

test('uncommitted project closure blocks attachment then rejects it after commit', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const response = session(row); const blocker = await pool.connect();
  let pending;
  try {
    await blocker.query('BEGIN');
    await blocker.query("UPDATE projects SET status='completed' WHERE id=$1", [f.project.id]);
    pending = attachCheckoutSession(pool, row.id, response).then(value => ({ value }), error => ({ error }));
    await blocked(blocker);
    await blocker.query('COMMIT');
    assert.equal((await pending).error?.code, 'lead_checkout_unavailable');
    assert.equal((await pool.query('SELECT checkout_url FROM project_access_purchases WHERE id=$1', [row.id])).rows[0].checkout_url, null);
  } finally { await blocker.query('ROLLBACK'); blocker.release(); if (pending) await pending; }
});

test('a grant appearing after reservation prevents attachment and checkout replay', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const response = session(row); await attachCheckoutSession(pool, row.id, response);
  await pool.query(`INSERT INTO project_access_entitlements (project_id,contractor_id,status,provider_payment_id,verified_at)
    VALUES ($1,$2,'paid','synthetic-late-grant',NOW())`, [f.project.id, f.buyer.id]);
  await assert.rejects(attachCheckoutSession(pool, row.id, response), { code: 'lead_checkout_existing_entitlement' });
  await assert.rejects(reserveLeadPurchase(pool, f.request, policy), { code: 'lead_checkout_existing_entitlement' });
  assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).checkout_url, null);
});

test('owner deactivation hides checkout and overdue pending purchases require reconciliation', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  await attachCheckoutSession(pool, row.id, session(row));
  await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [f.owner.id]);
  assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).checkout_url, null);
  await pool.query('UPDATE users SET is_active=TRUE WHERE id=$1', [f.owner.id]);
  await pool.query(`UPDATE project_access_purchases SET created_at=NOW()-INTERVAL '2 hours',
    expires_at=NOW()-INTERVAL '1 hour' WHERE id=$1`, [row.id]);
  assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).checkout_url, null);
  const replay = await reserveLeadPurchase(pool, f.request, policy);
  assert.equal(replay.id, row.id); assert.equal(replay.checkout_url, null);
  assert.throws(() => buildCheckoutSessionRequest(replay, 'https://preview.example.test'), { code: 'lead_checkout_purchase_invalid' });
  await assert.rejects(reserveLeadPurchase(pool, { ...f.request, requestKey: randomUUID() }, policy), { code: 'lead_checkout_already_pending' });
});

test('session persistence failure rolls back and releases locks before retry', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  await pool.query(`CREATE FUNCTION fail_checkout_attach() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic attachment failure'; END $$`);
  await pool.query('CREATE TRIGGER fail_checkout_attach BEFORE UPDATE ON project_access_purchases FOR EACH ROW EXECUTE FUNCTION fail_checkout_attach()');
  try { await assert.rejects(attachCheckoutSession(pool, row.id, session(row)), /synthetic attachment failure/); }
  finally { await pool.query('DROP TRIGGER fail_checkout_attach ON project_access_purchases'); await pool.query('DROP FUNCTION fail_checkout_attach()'); }
  assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).provider_checkout_id, null);
  assert.equal((await attachCheckoutSession(pool, row.id, session(row))).status, 'pending');
});

test('simultaneous identical attachments persist one session without issuing access', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const response = session(row);
  const results = await Promise.all(Array.from({ length: 4 }, () => attachCheckoutSession(pool, row.id, response)));
  assert.equal(new Set(results.map(result => result.provider_checkout_id)).size, 1);
  assert.ok(results.every(result => result.status === 'pending'));
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_entitlements WHERE project_id=$1', [f.project.id])).rows[0].count, 0);
});

test('signed event persists only binding metadata, survives reconnect and grants no access', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const input = signedEvent(row);
  assert.deepEqual(await receive(input), { eventId: input.event.id, status: 'received', duplicate: false });
  const stored = (await pool.query('SELECT * FROM project_access_checkout_events WHERE event_id=$1', [input.event.id])).rows[0];
  assert.equal(stored.purchase_id, row.id); assert.equal(stored.payment_status, 'paid');
  assert.equal(stored.status, 'received'); assert.equal(stored.provider_mode, 'test');
  assert.equal(JSON.stringify(stored).includes('never-store@example.invalid'), false);
  assert.equal(JSON.stringify(stored).includes(webhookConfig.webhookSecret), false);
  const another = new Pool({ connectionString: databaseUrl });
  try { assert.equal((await receive(input, another)).duplicate, true); }
  finally { await another.end(); }
  await migrateSchema(pool);
  assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).status, 'pending');
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_entitlements WHERE project_id=$1', [f.project.id])).rows[0].count, 0);
});

test('six concurrent deliveries persist exactly one event; changed same-ID payload conflicts', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const input = signedEvent(row);
  const results = await Promise.all(Array.from({ length: 6 }, () => receive(input)));
  assert.equal(results.filter(result => !result.duplicate).length, 1);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_checkout_events WHERE purchase_id=$1', [row.id])).rows[0].count, 1);
  await assert.rejects(receive(signEvent(input.event, true)), { code: 'lead_webhook_replay_conflict' });
  assert.equal((await receive(input)).duplicate, true);
});

test('valid signatures cannot substitute a different quote, purchase, buyer or project', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  for (const target of ['amount', 'priceVersion', 'buyer', 'project', 'purchase', 'expiry']) {
    const input = signedEvent(row); const object = input.event.data.object;
    if (target === 'amount') object.amount_subtotal = object.amount_total = 10;
    if (target === 'priceVersion') object.metadata.price_version = 'other';
    if (target === 'buyer') object.metadata.contractor_id = String(f.other.id);
    if (target === 'project') object.metadata.project_id = String(f.project.id + 100000);
    if (target === 'purchase') object.client_reference_id = object.metadata.purchase_id = randomUUID();
    if (target === 'expiry') object.expires_at++;
    await assert.rejects(receive(signEvent(input.event)), { code: 'lead_webhook_purchase_mismatch' });
  }
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_checkout_events WHERE purchase_id=$1', [row.id])).rows[0].count, 0);
});

test('one event ID cannot bind two purchases even with valid signatures concurrently', async () => {
  const f = await fixture(); const g = await fixture();
  const a = await reserveLeadPurchase(pool, f.request, policy); const b = await reserveLeadPurchase(pool, g.request, policy);
  const eventId = `evt_${randomUUID().replaceAll('-', '')}`;
  const results = await Promise.allSettled([receive(signedEvent(a, { id: eventId })), receive(signedEvent(b, { id: eventId }))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'lead_webhook_replay_conflict');
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_checkout_events WHERE event_id=$1', [eventId])).rows[0].count, 1);
});

test('one provider session cannot bind two purchases concurrently', async () => {
  const f = await fixture(); const g = await fixture();
  const a = await reserveLeadPurchase(pool, f.request, policy); const b = await reserveLeadPurchase(pool, g.request, policy);
  const first = signedEvent(a); const second = signedEvent(b);
  second.event.data.object.id = first.event.data.object.id;
  const results = await Promise.allSettled([receive(first), receive(signEvent(second.event))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'lead_webhook_purchase_mismatch');
});

test('one provider payment intent cannot bind two purchases concurrently', async () => {
  const f = await fixture(); const g = await fixture();
  const a = await reserveLeadPurchase(pool, f.request, policy); const b = await reserveLeadPurchase(pool, g.request, policy);
  const first = signedEvent(a); const second = signedEvent(b);
  second.event.data.object.payment_intent = first.event.data.object.payment_intent;
  const results = await Promise.allSettled([receive(first), receive(signEvent(second.event))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'lead_webhook_purchase_mismatch');
});

test('already-attached sessions cannot acquire the same payment intent', async () => {
  const f = await fixture(); const g = await fixture();
  const a = await reserveLeadPurchase(pool, f.request, policy); const b = await reserveLeadPurchase(pool, g.request, policy);
  const attachedA = await attachCheckoutSession(pool, a.id, session(a));
  const attachedB = await attachCheckoutSession(pool, b.id, session(b));
  const first = signedEvent(attachedA); const second = signedEvent(attachedB);
  second.event.data.object.payment_intent = first.event.data.object.payment_intent;
  await receive(first);
  await assert.rejects(receive(signEvent(second.event)), { code: 'lead_webhook_purchase_mismatch' });
  assert.equal((await pool.query('SELECT payment_intent_id FROM project_access_checkout_bindings WHERE purchase_id=$1', [b.id])).rows[0].payment_intent_id, null);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_checkout_events WHERE purchase_id=$1', [b.id])).rows[0].count, 0);
});

test('event before attachment and attachment before event cannot bind a second session', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const input = signedEvent(row); await receive(input);
  await assert.rejects(attachCheckoutSession(pool, row.id, session(row)), { code: 'lead_checkout_session_conflict' });
  const stored = await attachCheckoutSession(pool, row.id, session(row, input.event.data.object.id));
  assert.equal(stored.provider_checkout_id, input.event.data.object.id);
  const other = signedEvent(row);
  await assert.rejects(receive(other), { code: 'lead_webhook_purchase_mismatch' });
});

test('racing event and different-session attachment select one binding, never both', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const input = signedEvent(row);
  const results = await Promise.allSettled([receive(input), attachCheckoutSession(pool, row.id, session(row))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.ok(['lead_webhook_purchase_mismatch', 'lead_checkout_session_conflict'].includes(results.find(result => result.status === 'rejected').reason.code));
});

test('late payment on an unavailable project is retained for future reconciliation, not fulfilled', async () => {
  const f = await fixture(); let row = await reserveLeadPurchase(pool, f.request, policy);
  await pool.query("UPDATE projects SET status='completed' WHERE id=$1", [f.project.id]);
  await pool.query('UPDATE users SET is_active=FALSE WHERE id=ANY($1::int[])', [[f.buyer.id, f.owner.id]]);
  row = (await pool.query(`UPDATE project_access_purchases SET created_at=NOW()-INTERVAL '2 hours',
    expires_at=date_trunc('second',NOW())-INTERVAL '1 hour' WHERE id=$1 RETURNING *`, [row.id])).rows[0];
  const input = signedEvent(row); assert.equal((await receive(input)).status, 'received');
  assert.equal((await pool.query('SELECT status FROM project_access_purchases WHERE id=$1', [row.id])).rows[0].status, 'pending');
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_entitlements WHERE project_id=$1', [f.project.id])).rows[0].count, 0);
});

test('out-of-order expired and completed events remain separate facts without granting access', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const completed = signedEvent(row);
  const expired = structuredClone(completed.event);
  expired.id = `evt_${randomUUID().replaceAll('-', '')}`; expired.type = 'checkout.session.expired';
  expired.data.object.status = 'expired'; expired.data.object.payment_status = 'unpaid'; expired.data.object.payment_intent = null;
  assert.equal((await receive(signEvent(expired))).status, 'received');
  assert.equal((await receive(completed)).status, 'received');
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_checkout_events WHERE purchase_id=$1', [row.id])).rows[0].count, 2);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_entitlements WHERE project_id=$1', [f.project.id])).rows[0].count, 0);
});

test('inbox insert failure rolls back and a signed retry safely persists once', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const input = signedEvent(row);
  await pool.query(`CREATE FUNCTION fail_checkout_event() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic event insertion failure'; END $$`);
  await pool.query('CREATE TRIGGER fail_checkout_event BEFORE INSERT ON project_access_checkout_events FOR EACH ROW EXECUTE FUNCTION fail_checkout_event()');
  try { await assert.rejects(receive(input), /synthetic event insertion failure/); }
  finally { await pool.query('DROP TRIGGER fail_checkout_event ON project_access_checkout_events'); await pool.query('DROP FUNCTION fail_checkout_event()'); }
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_checkout_events WHERE event_id=$1', [input.event.id])).rows[0].count, 0);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM project_access_checkout_bindings WHERE purchase_id=$1', [row.id])).rows[0].count, 0);
  assert.equal((await receive(input)).duplicate, false);
  assert.equal((await receive(input)).duplicate, true);
});

test('binding migration backfills an existing attached purchase and reruns without data loss', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const response = session(row);
  await pool.query('UPDATE project_access_purchases SET provider_checkout_id=$2,checkout_url=$3 WHERE id=$1', [row.id, response.id, response.url]);
  await migrateSchema(pool); await migrateSchema(pool);
  const stored = (await pool.query('SELECT * FROM project_access_checkout_bindings WHERE purchase_id=$1', [row.id])).rows[0];
  assert.equal(stored.provider_checkout_id, response.id); assert.equal(stored.payment_intent_id, null);
  assert.equal((await getLeadPurchase(pool, f.buyer.id, row.id)).checkout_url, response.url);
});

test('binding migration refuses conflicting stored associations without overwriting evidence', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const response = session(row); await attachCheckoutSession(pool, row.id, response);
  const conflicting = session(row);
  await pool.query('UPDATE project_access_purchases SET provider_checkout_id=$2,checkout_url=$3 WHERE id=$1', [row.id, conflicting.id, conflicting.url]);
  try {
    await assert.rejects(migrateSchema(pool), /Conflicting stored Checkout bindings/);
    assert.equal((await pool.query('SELECT provider_checkout_id FROM project_access_checkout_bindings WHERE purchase_id=$1', [row.id])).rows[0].provider_checkout_id, response.id);
  } finally {
    await pool.query('UPDATE project_access_purchases SET provider_checkout_id=$2,checkout_url=$3 WHERE id=$1', [row.id, response.id, response.url]);
  }
  await migrateSchema(pool);
});

test('stored signed paid event atomically grants only its buyer/project and survives reconnect', async () => {
  const f = await paidFixture();
  const result = await fulfill(f.input.event.id);
  assert.deepEqual(result, { eventId: f.input.event.id, purchaseId: f.row.id, status: 'processed', outcome: 'paid_granted', duplicate: false });
  const state = await fulfillmentState(f);
  assert.equal(state.purchase.status, 'paid'); assert.equal(state.event.status, 'processed');
  assert.equal(state.event.outcome, 'paid_granted'); assert.ok(state.event.processed_at);
  assert.equal(state.grants.length, 1); assert.equal(state.grants[0].status, 'paid');
  assert.equal(state.grants[0].provider_payment_id, f.input.event.data.object.payment_intent);
  assert.ok(state.grants[0].verified_at); assert.equal(state.audits.length, 1);
  assert.equal(state.audits[0].action, 'lead_checkout.paid_granted');
  assert.equal(state.audits[0].actor_id, null); assert.equal(state.audits[0].target_user_id, f.buyer.id);
  assert.equal(state.audits[0].entity_id, f.project.id);
  assert.equal(JSON.stringify(state.audits).includes('never-store@example.invalid'), false);
  assert.equal((await pool.query('SELECT 1 FROM project_access_entitlements WHERE contractor_id=$1', [f.other.id])).rowCount, 0);
  const another = new Pool({ connectionString: databaseUrl });
  try { assert.deepEqual(await fulfill(f.input.event.id, another), { ...result, duplicate: true }); }
  finally { await another.end(); }
  await migrateSchema(pool);
  assert.equal((await fulfillmentState(f)).audits.length, 1);
});

test('concurrent fulfillment and distinct duplicate paid events create one grant', async () => {
  const f = await paidFixture();
  const results = await Promise.all(Array.from({ length: 6 }, () => fulfill(f.input.event.id)));
  assert.equal(results.filter(result => !result.duplicate).length, 1);
  const second = structuredClone(f.input.event); second.id = `evt_${randomUUID().replaceAll('-', '')}`;
  await receive(signEvent(second));
  assert.equal((await fulfill(second.id)).outcome, 'already_paid');
  const state = await fulfillmentState(f);
  assert.equal(state.grants.length, 1); assert.equal(state.audits.length, 2);
  assert.equal(state.audits.filter(row => row.action === 'lead_checkout.paid_granted').length, 1);
});

test('unverified IDs and browser-shaped input never grant access', async () => {
  const f = await paidFixture();
  for (const value of [null, {}, f.input.event, { eventId: f.input.event.id, paid: true }, '', 'evt_bad;SELECT']) {
    await assert.rejects(fulfill(value), { code: 'lead_fulfillment_request_invalid' });
  }
  await assert.rejects(fulfill(`evt_${randomUUID().replaceAll('-', '')}`), { code: 'lead_fulfillment_event_missing' });
  const state = await fulfillmentState(f);
  assert.equal(state.purchase.status, 'pending'); assert.equal(state.event.status, 'received');
  assert.equal(state.grants.length, 0); assert.equal(state.audits.length, 0);
});

test('closed or withdrawn project and inactive or changed roles reconcile without a grant', async () => {
  for (const target of ['closed', 'withdrawn', 'buyer-inactive', 'buyer-role', 'owner-inactive', 'owner-role']) {
    const f = await paidFixture();
    if (target === 'closed') await pool.query("UPDATE projects SET status='completed' WHERE id=$1", [f.project.id]);
    else if (target === 'withdrawn') await pool.query('UPDATE projects SET published=FALSE WHERE id=$1', [f.project.id]);
    else if (target.endsWith('inactive')) await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [target.startsWith('buyer') ? f.buyer.id : f.owner.id]);
    else await pool.query("UPDATE users SET role='admin' WHERE id=$1", [target.startsWith('buyer') ? f.buyer.id : f.owner.id]);
    const result = await fulfill(f.input.event.id);
    assert.equal(result.status, 'review_required', target);
    assert.equal(result.outcome, ['closed', 'withdrawn'].includes(target) ? 'project_unavailable' : 'identity_unavailable');
    const state = await fulfillmentState(f);
    assert.equal(state.purchase.status, 'review_required'); assert.equal(state.grants.length, 0);
    assert.equal(state.audits.length, 1);
    assert.equal((await fulfill(f.input.event.id)).duplicate, true);
  }
});

test('current committed project/identity state is rechecked after observed lock waits', async () => {
  for (const target of ['project', 'owner', 'buyer']) {
    const f = await paidFixture(); const blocker = await pool.connect(); let pending;
    try {
      await blocker.query('BEGIN');
      if (target === 'project') await blocker.query('UPDATE projects SET published=FALSE WHERE id=$1', [f.project.id]);
      else await blocker.query('UPDATE users SET is_active=FALSE WHERE id=$1', [target === 'owner' ? f.owner.id : f.buyer.id]);
      pending = fulfill(f.input.event.id).then(value => ({ value }), error => ({ error }));
      await blocked(blocker); await blocker.query('COMMIT');
      const result = await pending; assert.ifError(result.error);
      assert.equal(result.value.status, 'review_required');
      assert.equal((await fulfillmentState(f)).grants.length, 0);
    } finally { await blocker.query('ROLLBACK'); blocker.release(); if (pending) await pending; }
  }
});

test('verified quote changes and pre-upgrade inbox rows fail closed without backfill', async () => {
  for (const target of ['quote', 'legacy']) {
    const f = await paidFixture();
    if (target === 'quote') await pool.query('UPDATE project_access_purchases SET amount_cents=amount_cents+1 WHERE id=$1', [f.row.id]);
    else await pool.query('UPDATE project_access_checkout_events SET purchase_snapshot=NULL WHERE event_id=$1', [f.input.event.id]);
    await migrateSchema(pool);
    const result = await fulfill(f.input.event.id);
    assert.equal(result.outcome, target === 'quote' ? 'quote_mismatch' : 'legacy_event');
    assert.equal(result.status, 'review_required'); assert.equal((await fulfillmentState(f)).grants.length, 0);
  }
});

test('changed stored PaymentIntent cannot authorize a grant', async () => {
  const f = await paidFixture();
  await pool.query("UPDATE project_access_checkout_events SET payment_intent_id='pi_substituted' WHERE event_id=$1", [f.input.event.id]);
  assert.equal((await fulfill(f.input.event.id)).outcome, 'binding_mismatch');
  assert.equal((await fulfillmentState(f)).grants.length, 0);
});

test('late and impossible pre-purchase paid events require reconciliation', async () => {
  for (const target of ['late', 'before-purchase']) {
    const f = await fixture(); let row = await reserveLeadPurchase(pool, f.request, policy);
    if (target === 'late') row = (await pool.query(`UPDATE project_access_purchases SET created_at=NOW()-INTERVAL '2 hours',
      expires_at=date_trunc('second',NOW())-INTERVAL '1 hour' WHERE id=$1 RETURNING *`, [row.id])).rows[0];
    const input = signedEvent(row, target === 'before-purchase' ? { created: Math.floor(new Date(row.created_at).getTime() / 1000) - 1 } : {});
    await receive(input);
    const result = await fulfill(input.event.id);
    assert.equal(result.status, 'review_required');
    assert.equal(result.outcome, target === 'late' ? 'late_payment' : 'invalid_event_time');
    assert.equal((await fulfillmentState({ ...f, row, input })).grants.length, 0);
  }
});

test('completed unpaid event remains blocked, not paid or automatically refunded', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const input = signedEvent(row); input.event.data.object.payment_status = 'unpaid';
  input.event.data.object.payment_intent = null;
  await receive(signEvent(input.event));
  assert.equal((await fulfill(input.event.id)).outcome, 'payment_unpaid');
  const state = await fulfillmentState({ ...f, row, input });
  assert.equal(state.purchase.status, 'review_required'); assert.equal(state.grants.length, 0);
});

test('expired session releases pending reservation but later paid event cannot revive it or displace a new purchase', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const paid = signedEvent(row); const expired = structuredClone(paid.event);
  expired.id = `evt_${randomUUID().replaceAll('-', '')}`; expired.type = 'checkout.session.expired';
  expired.data.object.status = 'expired'; expired.data.object.payment_status = 'unpaid'; expired.data.object.payment_intent = null;
  await receive(signEvent(expired)); assert.equal((await fulfill(expired.id)).outcome, 'expired');
  const next = await reserveLeadPurchase(pool, { ...f.request, requestKey: randomUUID() }, policy);
  await receive(paid); const result = await fulfill(paid.event.id);
  assert.equal(result.status, 'review_required'); assert.equal(result.outcome, 'purchase_not_pending');
  assert.equal((await fulfillmentState({ ...f, row, input: paid })).purchase.status, 'expired');
  assert.equal((await getLeadPurchase(pool, f.buyer.id, next.id)).status, 'pending');
  assert.equal((await fulfillmentState({ ...f, row, input: paid })).grants.length, 0);
});

test('stale expired notification after paid cannot revoke an existing grant', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id);
  const expired = structuredClone(f.input.event);
  expired.id = `evt_${randomUUID().replaceAll('-', '')}`; expired.type = 'checkout.session.expired';
  expired.data.object.status = 'expired'; expired.data.object.payment_status = 'unpaid'; expired.data.object.payment_intent = null;
  await receive(signEvent(expired)); assert.equal((await fulfill(expired.id)).outcome, 'ignored_after_paid');
  const state = await fulfillmentState(f);
  assert.equal(state.purchase.status, 'paid'); assert.equal(state.grants[0].status, 'paid');
});

test('conflicting paid and expired facts already in the inbox reconcile in either processing order', async () => {
  for (const first of ['paid', 'expired']) {
    const f = await paidFixture(); const expired = structuredClone(f.input.event);
    expired.id = `evt_${randomUUID().replaceAll('-', '')}`; expired.type = 'checkout.session.expired';
    expired.data.object.status = 'expired'; expired.data.object.payment_status = 'unpaid'; expired.data.object.payment_intent = null;
    await receive(signEvent(expired));
    const ids = first === 'paid' ? [f.input.event.id, expired.id] : [expired.id, f.input.event.id];
    assert.equal((await fulfill(ids[0])).outcome, 'conflicting_events');
    assert.equal((await fulfill(ids[1])).status, 'review_required');
    const state = await fulfillmentState(f);
    assert.equal(state.purchase.status, 'review_required'); assert.equal(state.grants.length, 0);
  }
});

test('existing or revoked entitlements are never overwritten by a new event', async () => {
  for (const status of ['paid', 'refunded', 'revoked']) {
    const f = await paidFixture();
    await pool.query(`INSERT INTO project_access_entitlements(project_id,contractor_id,status,provider_payment_id,verified_at)
      VALUES ($1,$2,$3,'legacy-fixture',NOW())`, [f.project.id, f.buyer.id, status]);
    assert.equal((await fulfill(f.input.event.id)).outcome, 'entitlement_conflict');
    const state = await fulfillmentState(f);
    assert.equal(state.grants[0].status, status); assert.equal(state.grants[0].provider_payment_id, 'legacy-fixture');
  }
  const f = await paidFixture(); await fulfill(f.input.event.id);
  await pool.query("UPDATE project_access_entitlements SET status='revoked' WHERE project_id=$1", [f.project.id]);
  assert.equal((await fulfill(f.input.event.id)).duplicate, true);
  const next = structuredClone(f.input.event); next.id = `evt_${randomUUID().replaceAll('-', '')}`;
  await receive(signEvent(next)); assert.equal((await fulfill(next.id)).status, 'review_required');
  assert.equal((await fulfillmentState(f)).grants[0].status, 'revoked');
});

test('grant, purchase, event outcome and audit failures roll back all fulfillment writes', async () => {
  for (const table of ['project_access_entitlements', 'project_access_purchases', 'project_access_checkout_events', 'audit_events']) {
    const f = await paidFixture();
    await pool.query(`CREATE FUNCTION fail_fulfillment() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'synthetic fulfillment failure'; END $$`);
    await pool.query(`CREATE TRIGGER fail_fulfillment BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION fail_fulfillment()`);
    try { await assert.rejects(fulfill(f.input.event.id), /synthetic fulfillment failure/); }
    finally { await pool.query(`DROP TRIGGER fail_fulfillment ON ${table}`); await pool.query('DROP FUNCTION fail_fulfillment()'); }
    const state = await fulfillmentState(f);
    assert.equal(state.grants.length, 0, table); assert.equal(state.audits.length, 0, table);
    assert.equal(state.purchase.status, 'pending', table); assert.equal(state.event.status, 'received', table);
    assert.equal((await fulfill(f.input.event.id)).outcome, 'paid_granted');
  }
});

test('terminated DB connection before COMMIT leaves no partial grant and can retry', async () => {
  const f = await paidFixture();
  const crashPool = { connect: async () => {
    const client = await pool.connect(); client.on('error', () => {});
    const pid = (await client.query('SELECT pg_backend_pid() AS id')).rows[0].id;
    return { release: error => client.release(error), query: async (...args) => {
      if (args[0] === 'COMMIT') {
        const killed = await pool.query('SELECT pg_terminate_backend($1) AS killed', [pid]);
        assert.equal(killed.rows[0].killed, true);
      }
      return client.query(...args);
    } };
  } };
  await assert.rejects(fulfill(f.input.event.id, crashPool));
  const state = await fulfillmentState(f);
  assert.equal(state.grants.length, 0); assert.equal(state.audits.length, 0);
  assert.equal(state.purchase.status, 'pending'); assert.equal(state.event.status, 'received');
  assert.equal((await fulfill(f.input.event.id)).outcome, 'paid_granted');
});

test('lost COMMIT acknowledgement is replay-safe across a new DB connection', async () => {
  const f = await paidFixture();
  const lostAckPool = { connect: async () => {
    const client = await pool.connect();
    return { release: error => client.release(error), query: async (...args) => {
      const result = await client.query(...args);
      if (args[0] === 'COMMIT') throw new Error('synthetic lost COMMIT acknowledgement');
      return result;
    } };
  } };
  await assert.rejects(fulfill(f.input.event.id, lostAckPool), /synthetic lost COMMIT acknowledgement/);
  const another = new Pool({ connectionString: databaseUrl });
  try { assert.equal((await fulfill(f.input.event.id, another)).duplicate, true); }
  finally { await another.end(); }
  const state = await fulfillmentState(f);
  assert.equal(state.purchase.status, 'paid'); assert.equal(state.grants.length, 1); assert.equal(state.audits.length, 1);
});

test('future signed refunds remain retryable until the database clock catches up', async () => {
  for (const amount of [2500, 500]) {
    const f = await paidFixture(); await fulfill(f.input.event.id);
    const event = refund(f, { amount }).event;
    event.created = Math.floor(Date.now() / 1000) + 120;
    event.data.object.created = event.created;
    const input = signEvent(event); await receive(input);
    const before = await fulfillmentState({ ...f, input });
    for (let attempt = 0; attempt < 2; attempt++) {
      await assert.rejects(fulfill(event.id), { code: 'lead_fulfillment_event_not_due' });
      assert.deepEqual(await fulfillmentState({ ...f, input }), before);
    }
    const advanced = atDatabaseTime(new Date((event.created + 1) * 1000));
    const results = await Promise.all(Array.from({ length: 3 }, () => fulfill(event.id, advanced)));
    assert.equal(results.filter(result => !result.duplicate).length, 1);
    assert.ok(results.every(result => result.outcome === (amount === 2500 ? 'refund_observed' : 'partial_refund_review')));
    const after = await fulfillmentState({ ...f, input });
    assert.equal(after.purchase.status, amount === 2500 ? 'refunded' : 'review_required');
    assert.equal(after.grants[0].status, amount === 2500 ? 'refunded' : 'revoked');
    assert.equal(after.event.payload_sha256, before.event.payload_sha256);
    assert.ok(after.event.processed_at);
    assert.equal(after.audits.length, before.audits.length + 1);
  }
});

test('future signed payment stays pending without a grant and can be processed when due', async () => {
  const f = await fixture(); const row = await reserveLeadPurchase(pool, f.request, policy);
  const input = signedEvent(row, { created: Math.floor(Date.now() / 1000) + 120 });
  await receive(input);
  const before = await fulfillmentState({ ...f, row, input });
  await assert.rejects(fulfill(input.event.id), { code: 'lead_fulfillment_event_not_due' });
  assert.deepEqual(await fulfillmentState({ ...f, row, input }), before);
  assert.equal(before.purchase.status, 'pending'); assert.equal(before.grants.length, 0);
  const advanced = atDatabaseTime(new Date((input.event.created + 1) * 1000));
  assert.equal((await fulfill(input.event.id, advanced)).outcome, 'paid_granted');
  assert.equal((await fulfill(input.event.id, advanced)).duplicate, true);
  const after = await fulfillmentState({ ...f, row, input });
  assert.equal(after.purchase.status, 'paid'); assert.equal(after.grants.length, 1);
  assert.equal(after.event.payload_sha256, before.event.payload_sha256);
  assert.equal(after.audits.length, 1);
});

test('successful full refund revokes only the exact purchase and persists with no provider calls', async () => {
  const f = await paidFixture(); const g = await paidFixture();
  await fulfill(f.input.event.id); await fulfill(g.input.event.id);
  const input = refund(f); await receive(input);
  assert.equal((await fulfill(input.event.id)).outcome, 'refund_observed');
  const state = await fulfillmentState(f); const other = await fulfillmentState(g);
  assert.equal(state.purchase.status, 'refunded'); assert.equal(state.grants[0].status, 'refunded');
  assert.equal(other.purchase.status, 'paid'); assert.equal(other.grants[0].status, 'paid');
  const event = (await pool.query('SELECT * FROM project_access_checkout_events WHERE event_id=$1', [input.event.id])).rows[0];
  assert.equal(event.refund_id, input.event.data.object.id); assert.equal(event.refund_amount_cents, 2500);
  assert.equal(event.payment_status, 'unpaid'); assert.equal(event.status, 'processed');
  assert.equal(JSON.stringify(event).includes('private@example.invalid'), false);
  assert.equal(JSON.stringify(state.audits).includes('do-not-store'), false);
  assert.equal(state.audits.at(-1).metadata.refund_id, input.event.data.object.id);
  await migrateSchema(pool);
  const another = new Pool({ connectionString: databaseUrl });
  try { assert.equal((await fulfill(input.event.id, another)).duplicate, true); }
  finally { await another.end(); }
  assert.equal((await fulfillmentState(f)).audits.length, 2);
});

test('refund stored before payment processing prevents access in either worker order', async () => {
  for (const order of ['paid-first', 'refund-first']) {
    const f = await paidFixture(); const input = refund(f); await receive(input);
    if (order === 'paid-first') {
      assert.equal((await fulfill(f.input.event.id)).outcome, 'refund_pending');
      assert.equal((await fulfillmentState(f)).grants.length, 0);
    }
    assert.equal((await fulfill(input.event.id)).outcome, 'refund_observed');
    if (order === 'refund-first') assert.equal((await fulfill(f.input.event.id)).status, 'review_required');
    const state = await fulfillmentState(f);
    assert.equal(state.purchase.status, 'refunded'); assert.equal(state.grants[0].status, 'refunded');
  }
});

test('partial succeeded refund suspends access for review without claiming full refund or summing events', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id);
  for (let i = 0; i < 2; i++) {
    const input = refund(f, { amount: 1250 }); await receive(input);
    assert.equal((await fulfill(input.event.id)).outcome, 'partial_refund_review');
    const state = await fulfillmentState(f);
    assert.equal(state.purchase.status, 'review_required'); assert.equal(state.grants[0].status, 'revoked');
  }
  const replay = structuredClone(f.input.event); replay.id = `evt_${randomUUID().replaceAll('-', '')}`;
  await receive(signEvent(replay)); assert.equal((await fulfill(replay.id)).status, 'review_required');
  assert.equal((await fulfillmentState(f)).grants[0].status, 'revoked');
});

test('refund and grant concurrent processing never ends with paid access', async () => {
  const f = await paidFixture(); const input = refund(f); await receive(input);
  await Promise.all([fulfill(f.input.event.id), fulfill(input.event.id)]);
  assert.equal((await fulfillmentState(f)).grants[0].status, 'refunded');
});

test('concurrent identical refund deliveries and different event IDs for the same refund cannot apply twice', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id); const input = refund(f);
  await Promise.all(Array.from({ length: 4 }, () => receive(input)));
  const result = await Promise.all(Array.from({ length: 4 }, () => fulfill(input.event.id)));
  assert.equal(result.filter(row => !row.duplicate).length, 1);
  const repeat = structuredClone(input.event); repeat.id = `evt_${randomUUID().replaceAll('-', '')}`; repeat.type = 'refund.updated';
  await receive(signEvent(repeat)); assert.equal((await fulfill(repeat.id)).outcome, 'already_refunded');
  assert.equal((await fulfillmentState(f)).grants[0].status, 'refunded');
  const changed = structuredClone(input.event); changed.data.object.amount--;
  await assert.rejects(receive(signEvent(changed)), { code: 'lead_webhook_refund_conflict' });
});

test('known-PI refund cannot select purchase using metadata, wrong quote or pre-purchase timestamp', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id);
  const g = await paidFixture(); await fulfill(g.input.event.id);
  for (const delta of [{ amount: 2501 },
    { created: Math.floor(new Date(f.row.created_at).getTime() / 1000) - 1 }]) {
    await assert.rejects(receive(refund(f, delta)), { code: 'lead_webhook_refund_mismatch' });
  }
  const input = refund(f, { metadata: { purchase_id: g.row.id, contractor_id: String(g.buyer.id) } });
  await receive(input); await fulfill(input.event.id);
  assert.equal((await fulfillmentState(g)).grants[0].status, 'paid');
});

test('a refund ID and an event ID cannot be rebound to another purchase', async () => {
  const f = await paidFixture(); const g = await paidFixture();
  const a = refund(f); const b = refund(g, { id: a.event.data.object.id });
  const results = await Promise.allSettled([receive(a), receive(b)]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(results.find(row => row.status === 'rejected').reason.code, 'lead_webhook_refund_conflict');
  const collision = refund(g); collision.event.id = f.input.event.id;
  await assert.rejects(receive(signEvent(collision.event)), { code: 'lead_webhook_replay_conflict' });
  assert.equal((await pool.query('SELECT 1 FROM project_access_refund_bindings WHERE refund_id=$1', [collision.event.data.object.id])).rowCount, 0);
});

test('late full refund never revokes a replacement purchase or its different grant', async () => {
  for (const hasGrant of [false, true]) {
    const f = await paidFixture();
    await pool.query("UPDATE project_access_purchases SET status='expired' WHERE id=$1", [f.row.id]);
    const next = await reserveLeadPurchase(pool, { ...f.request, requestKey: randomUUID() }, policy);
    const paid = signedEvent(next); await receive(paid);
    if (hasGrant) await fulfill(paid.event.id);
    const input = refund(f); await receive(input);
    assert.equal((await fulfill(input.event.id)).status, 'review_required');
    const state = await fulfillmentState(f);
    assert.equal(state.purchase.status, 'expired');
    assert.equal(state.grants.length, hasGrant ? 1 : 0);
    if (hasGrant) {
      assert.equal(state.grants[0].provider_payment_id, paid.event.data.object.payment_intent);
      assert.equal(state.grants[0].status, 'paid');
    }
    assert.equal((await getLeadPurchase(pool, f.buyer.id, next.id)).status, hasGrant ? 'paid' : 'pending');
  }
});

test('closed project and disabled users do not prevent observing a valid full refund', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id);
  await pool.query("UPDATE projects SET status='completed' WHERE id=$1", [f.project.id]);
  await pool.query('UPDATE users SET is_active=FALSE WHERE id=ANY($1::int[])', [[f.owner.id, f.buyer.id]]);
  const input = refund(f); await receive(input);
  assert.equal((await fulfill(input.event.id)).outcome, 'refund_observed');
  assert.equal((await fulfillmentState(f)).grants[0].status, 'refunded');
});

test('refund revocation waits for a locked entitlement, then commits only its current binding', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id); const input = refund(f); await receive(input);
  const blocker = await pool.connect(); let pending;
  try {
    await blocker.query('BEGIN');
    await blocker.query("UPDATE project_access_entitlements SET provider_payment_id='pi_replaced' WHERE project_id=$1", [f.project.id]);
    pending = fulfill(input.event.id).then(value => ({ value }), error => ({ error }));
    await blocked(blocker); await blocker.query('COMMIT');
    const result = await pending; assert.ifError(result.error);
    assert.equal(result.value.outcome, 'entitlement_conflict');
    assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
  } finally { await blocker.query('ROLLBACK'); blocker.release(); if (pending) await pending; }
});

test('synthetic provider timestamps remain causal when the Node clock trails PostgreSQL at a second boundary', async t => {
  const f = await unboundFixture();
  const boundary = Math.floor(new Date(f.row.created_at).getTime() / 1000);
  const clock = t.mock.method(Date, 'now', () => boundary * 1000 - 1);
  let paid, returned, disputed;
  try {
    paid = signedEvent(f.row); returned = refund(f); disputed = dispute(f);
  } finally { clock.mock.restore(); }
  for (const input of [paid, returned, disputed]) {
    assert.equal(input.event.created, boundary);
    if (input !== paid) assert.equal(input.event.data.object.created, boundary);
  }
  await receive(paid);
  assert.equal((await fulfill(paid.event.id)).outcome, 'paid_granted');
});

test('refund grant/purchase/outcome/audit failures roll back together and retry safely', async () => {
  for (const table of ['project_access_entitlements', 'project_access_purchases', 'project_access_checkout_events', 'audit_events']) {
    const f = await paidFixture();
    assert.equal((await fulfill(f.input.event.id)).outcome, 'paid_granted');
    const input = refund(f); await receive(input);
    await pool.query(`CREATE FUNCTION fail_refund() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'synthetic refund failure'; END $$`);
    await pool.query(`CREATE TRIGGER fail_refund BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION fail_refund()`);
    try { await assert.rejects(fulfill(input.event.id), /synthetic refund failure/); }
    finally { await pool.query(`DROP TRIGGER fail_refund ON ${table}`); await pool.query('DROP FUNCTION fail_refund()'); }
    const state = await fulfillmentState(f);
    assert.equal(state.purchase.status, 'paid'); assert.equal(state.grants[0].status, 'paid');
    assert.equal(state.audits.length, 1);
    assert.equal((await fulfill(input.event.id)).outcome, 'refund_observed');
  }
});

test('full-refund state is monotonic across old paid and partial-refund notifications', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id);
  const full = refund(f); await receive(full); await fulfill(full.event.id);
  assert.equal((await fulfill(f.input.event.id)).duplicate, true);
  const paid = structuredClone(f.input.event); paid.id = `evt_${randomUUID().replaceAll('-', '')}`;
  await receive(signEvent(paid)); assert.equal((await fulfill(paid.id)).status, 'review_required');
  const partial = refund(f, { amount: 500 }); await receive(partial);
  assert.equal((await fulfill(partial.event.id)).outcome, 'already_refunded');
  await assert.rejects(reserveLeadPurchase(pool, { ...f.request, requestKey: randomUUID() }, policy), { code: 'lead_checkout_existing_entitlement' });
  const state = await fulfillmentState(f);
  assert.equal(state.purchase.status, 'refunded'); assert.equal(state.grants[0].status, 'refunded');
});

test('tampered stored refund binding cannot revoke an unrelated entitlement', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id);
  const input = refund(f); await receive(input);
  await pool.query('UPDATE project_access_refund_bindings SET amount_cents=amount_cents-1 WHERE refund_id=$1', [input.event.data.object.id]);
  assert.equal((await fulfill(input.event.id)).outcome, 'refund_binding_mismatch');
  assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
});

test('signed dispute intake preserves paid access until its atomic worker hold and survives schema rerun', async () => {
  const f = await paidFixture(); const g = await paidFixture();
  await fulfill(f.input.event.id); await fulfill(g.input.event.id);
  const input = dispute(f, { amount: 500 }); await receive(input);
  assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
  const stored = (await pool.query('SELECT * FROM project_access_checkout_events WHERE event_id=$1', [input.event.id])).rows[0];
  assert.equal(stored.dispute_id, input.event.data.object.id); assert.equal(stored.dispute_status, 'needs_response');
  assert.equal(stored.status, 'received'); assert.doesNotMatch(JSON.stringify(stored), /private@example|do-not-store/);
  await migrateSchema(pool);
  const another = new Pool({ connectionString: databaseUrl });
  try { assert.equal((await fulfill(input.event.id, another)).outcome, 'dispute_observed'); }
  finally { await another.end(); }
  const after = await fulfillmentState({ ...f, input });
  assert.equal(after.purchase.status, 'review_required'); assert.equal(after.grants[0].status, 'revoked');
  assert.equal(after.event.status, 'review_required'); assert.equal(after.audits.length, 2);
  assert.equal(after.audits.at(-1).metadata.dispute_id, input.event.data.object.id);
  assert.equal((await fulfillmentState(g)).grants[0].status, 'paid');
});

test('won and closed disputes never restore access even when delivered before older statuses', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id);
  const original = dispute(f);
  for (const [type, status] of [['charge.dispute.closed', 'won'], ['charge.dispute.created', 'needs_response'],
    ['charge.dispute.updated', 'under_review'], ['charge.dispute.closed', 'lost'],
    ['charge.dispute.updated', 'warning_needs_response'], ['charge.dispute.updated', 'warning_under_review'],
    ['charge.dispute.closed', 'warning_closed']]) {
    const event = structuredClone(original.event); event.id = `evt_${randomUUID().replaceAll('-', '')}`;
    event.type = type; event.data.object.status = status;
    await receive(signEvent(event)); assert.equal((await fulfill(event.id)).status, 'review_required');
    assert.equal((await fulfillmentState(f)).grants[0].status, 'revoked');
  }
  assert.equal((await fulfill(f.input.event.id)).duplicate, true);
  const paid = structuredClone(f.input.event); paid.id = `evt_${randomUUID().replaceAll('-', '')}`;
  await receive(signEvent(paid)); assert.equal((await fulfill(paid.id)).status, 'review_required');
  assert.equal((await fulfillmentState(f)).grants[0].status, 'revoked');
});

test('queued dispute prevents initial grant in both worker orders and concurrent processing', async () => {
  for (const order of ['paid-first', 'dispute-first', 'concurrent']) {
    const f = await paidFixture(); const input = dispute(f); await receive(input);
    if (order === 'concurrent') await Promise.all([fulfill(f.input.event.id), fulfill(input.event.id)]);
    else {
      const ids = order === 'paid-first' ? [f.input.event.id, input.event.id] : [input.event.id, f.input.event.id];
      if (order === 'paid-first') assert.equal((await fulfill(ids[0])).outcome, 'dispute_pending');
      else await fulfill(ids[0]);
      await fulfill(ids[1]);
    }
    const after = await fulfillmentState(f);
    assert.equal(after.grants[0].status, 'revoked'); assert.equal(after.purchase.status, 'review_required');
    assert.equal(after.audits.some(row => row.action === 'lead_checkout.paid_granted'), false);
  }
});

test('concurrent identical dispute deliveries and fulfillment create one hold and audit', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id); const input = dispute(f);
  const received = await Promise.all(Array.from({ length: 5 }, () => receive(input)));
  assert.equal(received.filter(row => !row.duplicate).length, 1);
  const applied = await Promise.all(Array.from({ length: 5 }, () => fulfill(input.event.id)));
  assert.equal(applied.filter(row => !row.duplicate).length, 1);
  assert.equal((await fulfillmentState(f)).audits.length, 2);
});

test('known-PI dispute metadata has no authority and wrong amount or creation time cannot bind', async () => {
  const f = await paidFixture(); const g = await paidFixture();
  for (const delta of [{ amount: 2501 },
    { created: Math.floor(new Date(f.row.created_at).getTime() / 1000) - 1 }]) {
    await assert.rejects(receive(dispute(f, delta)), { code: 'lead_webhook_dispute_mismatch' });
  }
  const input = dispute(f, { metadata: { purchase_id: g.row.id, contractor_id: String(g.buyer.id) } });
  await receive(input);
  const stored = (await pool.query('SELECT * FROM project_access_dispute_bindings WHERE dispute_id=$1', [input.event.data.object.id])).rows[0];
  assert.equal(stored.purchase_id, f.row.id); assert.doesNotMatch(JSON.stringify(stored), /metadata|example.invalid/);
  for (const delta of [{ charge: 'ch_changed' }, { amount: 500 }, { created: input.event.data.object.created + 1 }]) {
    const event = structuredClone(input.event); event.id = `evt_${randomUUID().replaceAll('-', '')}`;
    event.created++; Object.assign(event.data.object, delta);
    await assert.rejects(receive(signEvent(event)), { code: 'lead_webhook_dispute_conflict' });
  }
});

test('dispute IDs and global event IDs cannot bind different purchases or collide with refunds', async () => {
  const f = await paidFixture(); const g = await paidFixture();
  const a = dispute(f); const b = dispute(g, { id: a.event.data.object.id });
  const results = await Promise.allSettled([receive(a), receive(b)]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(results.find(row => row.status === 'rejected').reason.code, 'lead_webhook_dispute_conflict');
  const refunded = refund(g); await receive(refunded);
  const collision = dispute(g); collision.event.id = refunded.event.id;
  await assert.rejects(receive(signEvent(collision.event)), { code: 'lead_webhook_replay_conflict' });
  assert.equal((await pool.query('SELECT 1 FROM project_access_dispute_bindings WHERE dispute_id=$1', [collision.event.data.object.id])).rowCount, 0);
});

test('old dispute never touches a replacement purchase or grant', async () => {
  for (const hasGrant of [false, true]) {
    const f = await paidFixture();
    await pool.query("UPDATE project_access_purchases SET status='expired' WHERE id=$1", [f.row.id]);
    const next = await reserveLeadPurchase(pool, { ...f.request, requestKey: randomUUID() }, policy);
    const paid = signedEvent(next); await receive(paid); if (hasGrant) await fulfill(paid.event.id);
    const input = dispute(f); await receive(input);
    assert.equal((await fulfill(input.event.id)).status, 'review_required');
    const after = await fulfillmentState(f); assert.equal(after.purchase.status, 'expired');
    assert.equal(after.grants.length, hasGrant ? 1 : 0);
    if (hasGrant) { assert.equal(after.grants[0].status, 'paid'); assert.equal(after.grants[0].provider_payment_id, paid.event.data.object.payment_intent); }
    assert.equal((await getLeadPurchase(pool, f.buyer.id, next.id)).status, hasGrant ? 'paid' : 'pending');
  }
});

test('closed project and inactive identities still permit exact dispute suspension', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id);
  await pool.query("UPDATE projects SET status='completed' WHERE id=$1", [f.project.id]);
  await pool.query('UPDATE users SET is_active=FALSE WHERE id=ANY($1::int[])', [[f.owner.id, f.buyer.id]]);
  const input = dispute(f); await receive(input); await fulfill(input.event.id);
  assert.equal((await fulfillmentState(f)).grants[0].status, 'revoked');
});

test('dispute worker rechecks entitlement binding after an actual lock wait', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id); const input = dispute(f); await receive(input);
  const blocker = await pool.connect(); let pending;
  try {
    await blocker.query('BEGIN');
    await blocker.query("UPDATE project_access_entitlements SET provider_payment_id='pi_replaced' WHERE project_id=$1", [f.project.id]);
    pending = fulfill(input.event.id).then(value => ({ value }), error => ({ error }));
    await blocked(blocker); await blocker.query('COMMIT');
    const result = await pending; assert.ifError(result.error); assert.equal(result.value.outcome, 'entitlement_conflict');
    assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
  } finally { await blocker.query('ROLLBACK'); blocker.release(); if (pending) await pending; }
});

test('dispute grant, purchase, event and audit writes roll back together on failure', async () => {
  for (const table of ['project_access_entitlements', 'project_access_purchases', 'project_access_checkout_events', 'audit_events']) {
    const f = await paidFixture(); await fulfill(f.input.event.id); const input = dispute(f); await receive(input);
    const before = await fulfillmentState({ ...f, input });
    await pool.query(`CREATE FUNCTION fail_dispute() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'synthetic dispute failure'; END $$`);
    await pool.query(`CREATE TRIGGER fail_dispute BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION fail_dispute()`);
    try { await assert.rejects(fulfill(input.event.id), /synthetic dispute failure/); }
    finally { await pool.query(`DROP TRIGGER fail_dispute ON ${table}`); await pool.query('DROP FUNCTION fail_dispute()'); }
    assert.deepEqual(await fulfillmentState({ ...f, input }), before);
    assert.equal((await fulfill(input.event.id)).outcome, 'dispute_observed');
  }
});

test('disputes cannot downgrade a full refund and full refund can follow a dispute hold', async () => {
  for (const first of ['refund', 'dispute']) {
    const f = await paidFixture(); await fulfill(f.input.event.id);
    const refunded = refund(f); const disputed = dispute(f); await receive(refunded); await receive(disputed);
    const ids = first === 'refund' ? [refunded.event.id, disputed.event.id] : [disputed.event.id, refunded.event.id];
    await fulfill(ids[0]); await fulfill(ids[1]);
    const closed = structuredClone(disputed.event); closed.id = `evt_${randomUUID().replaceAll('-', '')}`;
    closed.type = 'charge.dispute.closed'; closed.data.object.status = 'won';
    await receive(signEvent(closed)); assert.equal((await fulfill(closed.id)).outcome, 'dispute_after_refund');
    const after = await fulfillmentState(f);
    assert.equal(after.purchase.status, 'refunded'); assert.equal(after.grants[0].status, 'refunded');
  }
});

test('future dispute remains received until due and concurrent retries apply one hold', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id);
  const event = dispute(f).event; event.created += 120; event.data.object.created = event.created;
  const input = signEvent(event); await receive(input); const before = await fulfillmentState({ ...f, input });
  await assert.rejects(fulfill(event.id), { code: 'lead_fulfillment_event_not_due' });
  assert.deepEqual(await fulfillmentState({ ...f, input }), before);
  const advanced = atDatabaseTime(new Date((event.created + 1) * 1000));
  const results = await Promise.all([fulfill(event.id, advanced), fulfill(event.id, advanced)]);
  assert.equal(results.filter(row => !row.duplicate).length, 1);
  assert.equal((await fulfillmentState(f)).grants[0].status, 'revoked');
});

test('tampered dispute binding does not revoke access', async () => {
  const f = await paidFixture(); await fulfill(f.input.event.id); const input = dispute(f); await receive(input);
  await pool.query('UPDATE project_access_dispute_bindings SET amount_cents=amount_cents-1 WHERE dispute_id=$1', [input.event.data.object.id]);
  assert.equal((await fulfill(input.event.id)).outcome, 'dispute_binding_mismatch');
  assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
});

test('unknown-PI negative observations persist only allowlisted facts and survive reconnect and migration', async () => {
  for (const make of [refund, dispute]) {
    const f = await unboundFixture(); const input = make(f);
    const before = await fulfillmentState(f);
    assert.deepEqual(await receive(input), { eventId: input.event.id, status: 'unbound', duplicate: false });
    assert.deepEqual(await fulfillmentState(f), before);
    assert.equal((await pool.query('SELECT 1 FROM project_access_checkout_bindings WHERE purchase_id=$1', [f.row.id])).rowCount, 0);
    assert.equal((await pool.query('SELECT 1 FROM project_access_checkout_events WHERE event_id=$1', [input.event.id])).rowCount, 0);
    const stored = (await pool.query('SELECT * FROM project_access_unbound_events WHERE event_id=$1', [input.event.id])).rows[0];
    assert.deepEqual(Object.keys(stored).sort(), ['event_id', 'event_type', 'provider_mode', 'api_version', 'provider_created',
      'payload_sha256', 'payment_intent_id', 'object_id', 'charge_id', 'amount_cents', 'currency', 'object_created',
      'dispute_status', 'received_at'].sort());
    assert.equal(stored.payment_intent_id, input.event.data.object.payment_intent);
    assert.equal(stored.object_id, input.event.data.object.id);
    assert.equal(stored.provider_mode, 'test'); assert.equal(stored.amount_cents, 2500);
    assert.doesNotMatch(JSON.stringify(stored), /do-not-store|private@example|instructions_email|evidence|metadata|purchase_id/);
    await assert.rejects(fulfill(input.event.id), { code: 'lead_fulfillment_event_missing' });
    const reopened = new Pool({ connectionString: databaseUrl });
    try {
      await migrateSchema(reopened);
      assert.deepEqual((await reopened.query('SELECT * FROM project_access_unbound_events WHERE event_id=$1', [input.event.id])).rows[0], stored);
      assert.deepEqual(await receive(input, reopened), { eventId: input.event.id, status: 'unbound', duplicate: true });
    } finally { await reopened.end(); }
  }
});

test('six concurrent unbound deliveries persist once and changed raw bytes conflict', async () => {
  for (const make of [refund, dispute]) {
    const f = await unboundFixture(); const input = make(f);
    const receipts = await Promise.all(Array.from({ length: 6 }, () => receive(input)));
    assert.equal(receipts.filter(row => !row.duplicate).length, 1);
    assert.equal(receipts.every(row => row.status === 'unbound'), true);
    assert.equal((await pool.query('SELECT 1 FROM project_access_unbound_events WHERE event_id=$1', [input.event.id])).rowCount, 1);
    for (const changed of [signEvent(input.event, true), signEvent({ ...input.event, data: { object: {
      ...input.event.data.object, payment_intent: 'pi_otherunbound', amount: 1200 } } })]) {
      await assert.rejects(receive(changed), { code: 'lead_webhook_replay_conflict' });
    }
  }
});

test('unbound delivery ignores purchase metadata and blocks only its later-bound PI without automatic promotion', async () => {
  for (const make of [refund, dispute]) {
    const f = await unboundFixture(); const g = await paidFixture();
    const negative = make(f, { metadata: { purchase_id: g.row.id, contractor_id: String(g.buyer.id), purpose: 'project_access_v1' } });
    await receive(negative); await receive(f.input);
    assert.equal((await fulfill(g.input.event.id)).outcome, 'paid_granted');
    const beforeReplay = (await pool.query('SELECT * FROM project_access_unbound_events WHERE event_id=$1', [negative.event.id])).rows[0];
    assert.deepEqual(await receive(negative), { eventId: negative.event.id, status: 'unbound', duplicate: true });
    assert.deepEqual((await pool.query('SELECT * FROM project_access_unbound_events WHERE event_id=$1', [negative.event.id])).rows[0], beforeReplay);
    assert.equal((await fulfill(f.input.event.id)).outcome, 'unbound_negative_event');
    assert.equal((await fulfillmentState(f)).purchase.status, 'review_required');
    assert.equal((await fulfillmentState(f)).grants.length, 0);
    assert.equal((await fulfillmentState(g)).grants[0].status, 'paid');
    assert.equal((await pool.query('SELECT 1 FROM project_access_checkout_events WHERE event_id=$1', [negative.event.id])).rowCount, 0);
  }
});

test('global event-ID collisions between quarantine and inbox reject in both orders and concurrently', async () => {
  for (const order of ['unbound-first', 'bound-first', 'concurrent']) {
    const f = await unboundFixture(); const g = await unboundFixture();
    const negative = refund(f); const paid = signEvent({ ...g.input.event, id: negative.event.id });
    if (order === 'unbound-first') {
      await receive(negative);
      await assert.rejects(receive(paid), { code: 'lead_webhook_replay_conflict' });
    } else if (order === 'bound-first') {
      await receive(paid);
      await assert.rejects(receive(negative), { code: 'lead_webhook_replay_conflict' });
    } else {
      const outcomes = await Promise.allSettled([receive(negative), receive(paid)]);
      assert.equal(outcomes.filter(row => row.status === 'fulfilled').length, 1);
      assert.equal(outcomes.find(row => row.status === 'rejected').reason.code, 'lead_webhook_replay_conflict');
    }
    const quarantine = (await pool.query('SELECT 1 FROM project_access_unbound_events WHERE event_id=$1', [negative.event.id])).rowCount;
    const inbox = (await pool.query('SELECT 1 FROM project_access_checkout_events WHERE event_id=$1', [negative.event.id])).rowCount;
    assert.equal(quarantine + inbox, 1);
    assert.equal((await pool.query('SELECT 1 FROM project_access_checkout_bindings WHERE purchase_id=$1', [g.row.id])).rowCount, inbox);
    assert.equal((await fulfillmentState(f)).grants.length, 0);
  }
});

test('unbound refund/dispute collisions are global and malformed or unsigned facts never persist', async () => {
  const f = await unboundFixture(); const a = refund(f); const b = dispute(f);
  b.event.id = a.event.id;
  const outcomes = await Promise.allSettled([receive(a), receive(signEvent(b.event))]);
  assert.equal(outcomes.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(row => row.status === 'rejected').reason.code, 'lead_webhook_replay_conflict');
  for (const delta of [{ livemode: true }, { account: 'acct_other' }, { api_version: '2020-08-27' }]) {
    const input = refund(f); Object.assign(input.event, delta);
    await assert.rejects(receive(signEvent(input.event)), { code: 'lead_webhook_event_invalid' });
    assert.equal((await pool.query('SELECT 1 FROM project_access_unbound_events WHERE event_id=$1', [input.event.id])).rowCount, 0);
  }
  const bad = dispute(f); bad.signature = 'bad';
  await assert.rejects(receive(bad), { code: 'lead_webhook_signature_invalid' });
  assert.equal((await pool.query('SELECT 1 FROM project_access_unbound_events WHERE event_id=$1', [bad.event.id])).rowCount, 0);
});

test('initial grant waits for uncommitted unknown-PI quarantine then sees its committed fact', { timeout: 30000 }, async () => {
  for (const make of [refund, dispute]) {
    const f = await unboundFixture(); const input = make(f);
    let enter; let release; let client;
    const entered = new Promise(resolve => { enter = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    const wrapped = { connect: async () => {
      client = await pool.connect();
      return { release: error => client.release(error), query: async (sql, ...args) => {
        const result = await client.query(sql, ...args);
        if (sql.includes('INSERT INTO project_access_unbound_events')) { enter(); await gate; }
        return result;
      } };
    } };
    const receiving = receive(input, wrapped);
    let processing;
    try {
      await Promise.race([entered, receiving.then(() => { throw new Error('Expected quarantine insert pause'); })]);
      await receive(f.input);
      processing = fulfill(f.input.event.id);
      await blocked(client);
      release(); await receiving;
      assert.equal((await processing).outcome, 'unbound_negative_event');
      assert.equal((await fulfillmentState(f)).grants.length, 0);
    } finally {
      release(); await Promise.allSettled([receiving, processing].filter(Boolean));
    }
  }
});

test('failed quarantine insert rolls back and releases locks so the exact signed retry can persist', async () => {
  for (const make of [refund, dispute]) {
    const f = await unboundFixture(); const input = make(f);
    const wrapped = { connect: async () => {
      const client = await pool.connect();
      return { release: error => client.release(error), query: (sql, ...args) => {
        if (sql.includes('INSERT INTO project_access_unbound_events')) throw new Error('fixture quarantine failure');
        return client.query(sql, ...args);
      } };
    } };
    await assert.rejects(receive(input, wrapped), /fixture quarantine failure/);
    assert.equal((await pool.query('SELECT 1 FROM project_access_unbound_events WHERE event_id=$1', [input.event.id])).rowCount, 0);
    assert.equal((await pool.query('SELECT 1 FROM project_access_checkout_events WHERE event_id=$1', [input.event.id])).rowCount, 0);
    assert.equal((await receive(input)).duplicate, false);
  }
});

test('lost quarantine COMMIT acknowledgement is replay-safe across a new connection', async () => {
  for (const make of [refund, dispute]) {
    const f = await unboundFixture(); const input = make(f);
    const wrapped = { connect: async () => {
      const client = await pool.connect();
      return { release: error => client.release(error), query: async (sql, ...args) => {
        const result = await client.query(sql, ...args);
        if (sql === 'COMMIT') throw new Error('fixture lost quarantine acknowledgement');
        return result;
      } };
    } };
    await assert.rejects(receive(input, wrapped), /fixture lost quarantine acknowledgement/);
    const stored = (await pool.query('SELECT * FROM project_access_unbound_events WHERE event_id=$1', [input.event.id])).rows[0];
    assert.ok(stored);
    const reopened = new Pool({ connectionString: databaseUrl });
    try {
      assert.deepEqual(await receive(input, reopened), { eventId: input.event.id, status: 'unbound', duplicate: true });
      assert.deepEqual((await reopened.query('SELECT * FROM project_access_unbound_events WHERE event_id=$1', [input.event.id])).rows, [stored]);
      assert.equal((await fulfillmentState(f)).grants.length, 0);
    } finally { await reopened.end(); }
  }
});

test('quarantine never assumes an unknown observation fits the later quote or belongs to a newer purchase', async () => {
  for (const make of [refund, dispute]) {
    const f = await unboundFixture();
    const negative = make(f, { amount: f.row.amount_cents + 1 });
    await receive(negative); await receive(f.input);
    assert.equal((await fulfill(f.input.event.id)).outcome, 'unbound_negative_event');
    assert.equal((await fulfillmentState(f)).grants.length, 0);
    const stored = (await pool.query('SELECT * FROM project_access_unbound_events WHERE event_id=$1', [negative.event.id])).rows[0];
    assert.equal(stored.amount_cents, 2501);
    assert.equal((await receive(negative)).status, 'unbound');
    await pool.query("UPDATE project_access_purchases SET status='expired' WHERE id=$1", [f.row.id]);
    const replacement = await reserveLeadPurchase(pool, { ...f.request, requestKey: randomUUID() }, policy);
    const paid = signedEvent(replacement); await receive(paid);
    assert.equal((await fulfill(paid.event.id)).outcome, 'paid_granted');
    assert.equal((await pool.query('SELECT provider_payment_id FROM project_access_entitlements WHERE project_id=$1 AND contractor_id=$2',
      [f.project.id, f.buyer.id])).rows[0].provider_payment_id, paid.event.data.object.payment_intent);
  }
});

test('bounded sweep processes only selected due inbox facts and never grants from a future fact', async () => {
  const fixtures = await Promise.all(Array.from({ length: 3 }, () => dueFixture()));
  const ids = fixtures.map(f => f.input.event.id);
  const first = await sweep({ limit: 2, eventIds: ids });
  assert.deepEqual(first, { considered: 2, processed: 2, reviewRequired: 0, retried: 0, parked: 0, skipped: 0 });
  const states = await Promise.all(fixtures.map(fulfillmentState));
  assert.equal(states.filter(state => state.grants.length === 1).length, 2);
  assert.equal((await pool.query(`SELECT COUNT(*)::int AS count FROM project_access_checkout_events
    WHERE event_id=ANY($1::text[]) AND status='received'`, [ids])).rows[0].count, 1);
  assert.equal((await sweep({ limit: 2, eventIds: ids })).processed, 1);
  assert.equal((await sweep({ limit: 2, eventIds: ids })).considered, 0);

  const f = await unboundFixture();
  const now = Math.floor(new Date((await pool.query('SELECT clock_timestamp() AS now')).rows[0].now).getTime() / 1000);
  const input = signedEvent(f.row, { created: now + 2 }); await receive(input);
  assert.equal((await sweep({ eventIds: [input.event.id] })).considered, 0);
  assert.equal((await fulfillmentState(f)).grants.length, 0);
  await pool.query('SELECT pg_sleep(2.1)');
  assert.equal((await sweep({ eventIds: [input.event.id] })).processed, 1);
  assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
});

test('two concurrent sweeps claim one event and make one paid grant', async () => {
  const f = await dueFixture();
  const runs = await Promise.all(Array.from({ length: 2 }, () => sweep({ eventIds: [f.input.event.id] })));
  assert.equal(runs.reduce((n, row) => n + row.processed, 0), 1);
  assert.equal((await fulfillmentState(f)).grants.length, 1);
  assert.equal((await fulfillmentState(f)).audits.length, 1);
});

test('a future refund already in the inbox prevents an earlier paid sweep from granting', async () => {
  const f = await dueFixture();
  const current = Math.floor(new Date((await pool.query('SELECT clock_timestamp() AS now')).rows[0].now).getTime() / 1000);
  const event = refund(f).event; event.created = current + 2; event.data.object.created = event.created;
  const negative = signEvent(event); await receive(negative);
  const paid = await sweep({ eventIds: [f.input.event.id] });
  assert.equal(paid.reviewRequired, 1);
  assert.equal((await fulfillmentState(f)).grants.length, 0);
  assert.equal((await sweep({ eventIds: [negative.event.id] })).considered, 0);
  await pool.query('SELECT pg_sleep(2.1)');
  const refunded = await sweep({ eventIds: [negative.event.id] });
  assert.equal(refunded.processed, 1);
  assert.equal((await fulfillmentState(f)).grants[0].status, 'refunded');
  assert.equal((await fulfillmentState(f)).purchase.status, 'refunded');
});

test('transient worker failure rolls back grant, records backoff and succeeds on a later sweep', async () => {
  const f = await dueFixture();
  await pool.query(`CREATE FUNCTION fail_lead_retry() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic retryable failure' USING ERRCODE='40001'; END $$`);
  await pool.query('CREATE TRIGGER fail_lead_retry BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_lead_retry()');
  try {
    assert.equal((await sweep({ eventIds: [f.input.event.id] })).retried, 1);
    const state = await fulfillmentState(f);
    assert.equal(state.purchase.status, 'pending'); assert.equal(state.grants.length, 0);
    const retry = (await pool.query('SELECT * FROM project_access_checkout_retries WHERE event_id=$1', [f.input.event.id])).rows[0];
    assert.equal(retry.attempts, 1); assert.equal(retry.state, 'ready');
    assert.equal(retry.last_error_kind, 'temporary');
    assert.doesNotMatch(JSON.stringify(retry), /synthetic retryable failure/);
    assert.ok(new Date(retry.next_attempt_at).getTime() > Date.now());
    assert.equal((await sweep({ eventIds: [f.input.event.id] })).considered, 0);
  } finally {
    await pool.query('DROP TRIGGER fail_lead_retry ON audit_events');
    await pool.query('DROP FUNCTION fail_lead_retry()');
  }
  await pool.query("UPDATE project_access_checkout_retries SET next_attempt_at=NOW()-INTERVAL '1 second' WHERE event_id=$1", [f.input.event.id]);
  assert.equal((await sweep({ eventIds: [f.input.event.id] })).processed, 1);
  assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
  assert.equal((await pool.query('SELECT 1 FROM project_access_checkout_retries WHERE event_id=$1', [f.input.event.id])).rowCount, 0);
});

test('recovered database connection failure retries a bound event without parking it', async () => {
  const f = await dueFixture();
  const disconnected = { query: (...args) => pool.query(...args), connect: async () => {
    throw Object.assign(new Error('synthetic connection reset'), { code: 'ECONNRESET' });
  } };
  assert.equal((await sweep({ eventIds: [f.input.event.id] }, disconnected)).retried, 1);
  const retry = (await pool.query('SELECT attempts,state,last_error_kind FROM project_access_checkout_retries WHERE event_id=$1',
    [f.input.event.id])).rows[0];
  assert.equal(retry.attempts, 1); assert.equal(retry.state, 'ready');
  assert.equal(retry.last_error_kind, 'temporary');
  assert.equal((await fulfillmentState(f)).grants.length, 0);
  await pool.query("UPDATE project_access_checkout_retries SET next_attempt_at=NOW()-INTERVAL '1 second' WHERE event_id=$1", [f.input.event.id]);
  assert.equal((await sweep({ eventIds: [f.input.event.id] })).processed, 1);
  assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
});

test('unexpected failure parks without granting and a repeated temporary failure has a finite attempt cap', async () => {
  for (const code of ['P0001', '40001']) {
    const f = await dueFixture();
    await pool.query(`CREATE FUNCTION fail_lead_retry() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'synthetic worker failure' USING ERRCODE='${code}'; END $$`);
    await pool.query('CREATE TRIGGER fail_lead_retry BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_lead_retry()');
    try {
      const attempts = code === '40001' ? 5 : 1;
      for (let i = 0; i < attempts; i++) {
        const result = await sweep({ eventIds: [f.input.event.id] });
        assert.equal(code === '40001' ? result.retried + result.parked : result.parked, 1);
        await pool.query("UPDATE project_access_checkout_retries SET next_attempt_at=NOW()-INTERVAL '1 second' WHERE event_id=$1", [f.input.event.id]);
      }
      const retry = (await pool.query('SELECT attempts,state,last_error_kind FROM project_access_checkout_retries WHERE event_id=$1',
        [f.input.event.id])).rows[0];
      assert.equal(retry.attempts, attempts); assert.equal(retry.state, 'parked');
      assert.equal(retry.last_error_kind, code === '40001' ? 'temporary' : 'unexpected');
      assert.equal((await sweep({ eventIds: [f.input.event.id] })).considered, 0);
      assert.equal((await fulfillmentState(f)).grants.length, 0);
    } finally {
      await pool.query('DROP TRIGGER fail_lead_retry ON audit_events');
      await pool.query('DROP FUNCTION fail_lead_retry()');
    }
  }
});

test('an abandoned lease survives reconnect and becomes claimable only after expiry', async () => {
  const f = await dueFixture();
  await pool.query(`INSERT INTO project_access_checkout_retries (event_id,lease_until)
    VALUES ($1,clock_timestamp()+INTERVAL '1 minute')`, [f.input.event.id]);
  const reopened = new Pool({ connectionString: databaseUrl });
  try {
    assert.equal((await sweep({ eventIds: [f.input.event.id] }, reopened)).considered, 0);
    await pool.query("UPDATE project_access_checkout_retries SET lease_until=NOW()-INTERVAL '1 second' WHERE event_id=$1", [f.input.event.id]);
    assert.equal((await sweep({ eventIds: [f.input.event.id] }, reopened)).processed, 1);
  } finally { await reopened.end(); }
  assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
});

test('an expired worker cannot record failure against a newer lease', async () => {
  const f = await dueFixture();
  let enteredFirst, enteredSecond, releaseFirst, releaseSecond;
  const firstEntered = new Promise(resolve => { enteredFirst = resolve; });
  const secondEntered = new Promise(resolve => { enteredSecond = resolve; });
  const firstHold = new Promise(resolve => { releaseFirst = resolve; });
  const secondHold = new Promise(resolve => { releaseSecond = resolve; });
  const firstPool = { query: (...args) => pool.query(...args), connect: async () => {
    enteredFirst(); await firstHold;
    throw Object.assign(new Error('synthetic stale worker'), { code: '40001' });
  } };
  const secondPool = { query: (...args) => pool.query(...args), connect: async () => {
    enteredSecond(); await secondHold;
    return pool.connect();
  } };
  let first, second;
  try {
    first = sweep({ eventIds: [f.input.event.id] }, firstPool);
    await firstEntered;
    await pool.query("UPDATE project_access_checkout_retries SET lease_until=NOW()-INTERVAL '1 second' WHERE event_id=$1", [f.input.event.id]);
    second = sweep({ eventIds: [f.input.event.id] }, secondPool);
    await secondEntered;
    releaseFirst();
    assert.equal((await first).skipped, 1);
    const claimed = (await pool.query('SELECT attempts,state FROM project_access_checkout_retries WHERE event_id=$1', [f.input.event.id])).rows[0];
    assert.equal(claimed.attempts, 0); assert.equal(claimed.state, 'ready');
  } finally {
    releaseFirst(); releaseSecond();
    if (first) await first;
    if (second) await second;
  }
  assert.equal((await fulfillmentState(f)).grants[0].status, 'paid');
});

test('lost fulfillment COMMIT acknowledgement does not count as a failed retry', async () => {
  const f = await dueFixture();
  const lostAckPool = { query: (...args) => pool.query(...args), connect: async () => {
    const client = await pool.connect();
    return { release: error => client.release(error), query: async (sql, ...args) => {
      const result = await client.query(sql, ...args);
      if (sql === 'COMMIT') throw new Error('synthetic lost fulfillment acknowledgement');
      return result;
    } };
  } };
  assert.equal((await sweep({ eventIds: [f.input.event.id] }, lostAckPool)).skipped, 1);
  const state = await fulfillmentState(f);
  assert.equal(state.purchase.status, 'paid'); assert.equal(state.grants.length, 1);
  assert.equal(state.audits.length, 1);
  assert.equal((await pool.query('SELECT 1 FROM project_access_checkout_retries WHERE event_id=$1', [f.input.event.id])).rowCount, 0);
  assert.equal((await sweep({ eventIds: [f.input.event.id] })).considered, 0);
});

test('real local API denies details and new bids after refund or dispute processing', { timeout: 30000 }, async () => {
  const api = require(path.join(snapshot, 'pure-server.cjs'));
  try {
    await api.initStorage(); api.listen(0, '127.0.0.1'); await once(api, 'listening');
    const base = `http://127.0.0.1:${api.address().port}`;
    async function request(method, route, user, body) {
      const response = await loopbackFetch(base + route, { method, redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.jwtSign({ userId: user.id, role: user.role, email: user.email })}` },
        ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    }
    for (const observation of ['full-refund', 'partial-refund', 'dispute']) {
      const f = await paidFixture();
      assert.equal((await request('GET', `/api/projects/${f.project.id}/details`, f.buyer)).status, 404);
      await fulfill(f.input.event.id);
      assert.equal((await request('GET', `/api/projects/${f.project.id}/details`, f.buyer)).status, 200);
      assert.equal((await request('POST', '/api/bids', f.buyer, { project_id: f.project.id, amount: 500, message: 'Synthetic proposal' })).status, 201);
      const input = observation === 'dispute' ? dispute(f) : refund(f, { amount: observation === 'full-refund' ? 2500 : 500 });
      await receive(input); await fulfill(input.event.id);
      const denied = await request('GET', `/api/projects/${f.project.id}/details`, f.buyer);
      assert.equal(denied.status, 404); assert.equal(denied.body.project, undefined);
      const bid = await request('POST', '/api/bids', f.buyer, { project_id: f.project.id, amount: 600 });
      assert.equal(bid.status, 403); assert.equal(bid.body.code, 'project_access_required');
      assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM bids WHERE project_id=$1', [f.project.id])).rows[0].count, 1);
    }
  } finally {
    if (api.listening) await new Promise((resolve, reject) => api.close(error => error ? reject(error) : resolve()));
    await api.closeStorage();
  }
});
