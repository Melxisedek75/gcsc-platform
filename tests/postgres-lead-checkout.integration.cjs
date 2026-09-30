const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
function signedEvent(row, overrides = {}) {
  const event = { id: `evt_${randomUUID().replaceAll('-', '')}`, object: 'event',
    api_version: webhookConfig.apiVersion, livemode: false, created: Math.floor(Date.now() / 1000),
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
    boundary: 'Disposable PostgreSQL, synthetic policy/sessions and locally SDK-signed events; no provider request, external webhook delivery or entitlement issuance',
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
