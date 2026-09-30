const { randomUUID } = require('node:crypto');
const { bindCheckoutSession } = require('./lead-checkout-binding.cjs');

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const id = value => Number.isInteger(value) && value > 0 && value <= 2147483647;
const amount = value => Number.isInteger(value) && value > 0 && value <= 100000000;
const version = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
function fail(code) { throw Object.assign(new Error(code), { code }); }

function validatePricePolicy(policy) {
  if (!policy || Object.keys(policy).sort().join(',') !== 'amountCents,currency,mode,version'
    || policy.mode !== 'test' || policy.currency !== 'usd'
    || !amount(policy.amountCents) || !version(policy.version)) fail('lead_checkout_policy_invalid');
  return { mode: 'test', currency: 'usd', version: policy.version, amountCents: policy.amountCents };
}

function validatePurchase(row) {
  if (!row || !uuid(row.id) || !id(row.project_id) || !id(row.contractor_id)
    || !amount(row.amount_cents) || !version(row.price_version)
    || row.currency !== 'usd' || row.provider_mode !== 'test' || row.status !== 'pending'
    || row.provider_request_key !== `gcsc_lead_${row.id}`
    || !Number.isFinite(new Date(row.expires_at).getTime())
    || new Date(row.expires_at).getTime() <= Date.now()) fail('lead_checkout_purchase_invalid');
}

function metadata(row) {
  return { purpose: 'project_access_v1', purchase_id: row.id, project_id: String(row.project_id),
    contractor_id: String(row.contractor_id), price_version: row.price_version };
}

function returnOrigin(value) {
  let url;
  try { url = new URL(value); } catch { fail('lead_checkout_origin_invalid'); }
  if (typeof value !== 'string' || url.username || url.password || url.pathname !== '/'
    || url.search || url.hash || (url.protocol !== 'https:'
      && !(url.protocol === 'http:' && url.hostname === '127.0.0.1')))
    fail('lead_checkout_origin_invalid');
  return url.origin;
}

// This module never contacts a provider. HTTP auth and SDK wiring are separate gates.
function buildCheckoutSessionRequest(row, origin) {
  validatePurchase(row);
  const expires = Math.floor(new Date(row.expires_at).getTime() / 1000);
  if (row.provider_checkout_id || expires < Math.floor(Date.now() / 1000) + 1800)
    fail('lead_checkout_session_not_creatable');
  const base = `${returnOrigin(origin)}/#/dashboard?lead_purchase=${row.id}`;
  const binding = metadata(row);
  return {
    params: {
      mode: 'payment', payment_method_types: ['card'], client_reference_id: row.id,
      success_url: base, cancel_url: `${base}&checkout=cancelled`, expires_at: expires,
      metadata: binding, payment_intent_data: { metadata: { ...binding } },
      line_items: [{ quantity: 1, price_data: { currency: row.currency,
        unit_amount: row.amount_cents, product_data: { name: 'SmartContractor project access' } } }],
    },
    options: { idempotencyKey: row.provider_request_key },
  };
}

function validateSession(row, session) {
  validatePurchase(row);
  let url;
  try { url = new URL(session?.url); } catch { fail('lead_checkout_session_mismatch'); }
  if (!session || session.object !== 'checkout.session' || session.livemode !== false
    || typeof session.id !== 'string' || session.id.length > 255 || !/^cs_test_[a-zA-Z0-9]+$/.test(session.id)
    || session.mode !== 'payment' || session.status !== 'open' || session.payment_status !== 'unpaid'
    || session.currency !== row.currency || session.amount_total !== row.amount_cents
    || session.amount_subtotal !== row.amount_cents || session.client_reference_id !== row.id
    || session.expires_at !== Math.floor(new Date(row.expires_at).getTime() / 1000)
    || Object.entries(metadata(row)).some(([key, value]) => session.metadata?.[key] !== value)
    || url.protocol !== 'https:' || url.host !== 'checkout.stripe.com' || url.username || url.password
    || url.pathname !== `/c/pay/${session.id}`) fail('lead_checkout_session_mismatch');
}

async function transaction(pool, run) {
  const client = await pool.connect();
  let discard;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { discard = error; }
    throw error;
  } finally { client.release(discard); }
}

async function lockEligibleProject(client, projectId, contractorId) {
  // Match bid/accept lock order: project, sorted current identities, then purchases/grants.
  const project = (await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE', [projectId])).rows[0];
  if (!project || !project.published || project.status !== 'open' || project.escrow_id)
    fail('lead_checkout_unavailable');
  const users = (await client.query('SELECT id, role, is_active FROM users WHERE id=ANY($1::int[]) ORDER BY id FOR SHARE',
    [[contractorId, project.homeowner_id]])).rows;
  if (!users.some(user => user.id === contractorId && user.role === 'contractor' && user.is_active)
    || !users.some(user => user.id === project.homeowner_id && user.role === 'homeowner' && user.is_active))
    fail('lead_checkout_unavailable');
}

async function requireNoEntitlement(client, projectId, contractorId) {
  const grant = await client.query('SELECT 1 FROM project_access_entitlements WHERE project_id=$1 AND contractor_id=$2 FOR UPDATE',
    [projectId, contractorId]);
  if (grant.rowCount) fail('lead_checkout_existing_entitlement');
}

function withUsableCheckout(row, eligible = true) {
  return { ...row, checkout_url: eligible && row.status === 'pending'
    && new Date(row.expires_at).getTime() > Date.now() ? row.checkout_url : null };
}

async function reserveLeadPurchase(pool, request, policyInput) {
  if (!request || Object.keys(request).sort().join(',') !== 'contractorId,projectId,requestKey'
    || !id(request.projectId) || !id(request.contractorId) || !uuid(request.requestKey))
    fail('lead_checkout_request_invalid');
  const policy = validatePricePolicy(policyInput);
  return transaction(pool, async client => {
    await lockEligibleProject(client, request.projectId, request.contractorId);
    await requireNoEntitlement(client, request.projectId, request.contractorId);
    const previous = async () => (await client.query(
      'SELECT * FROM project_access_purchases WHERE contractor_id=$1 AND request_key=$2 FOR UPDATE',
      [request.contractorId, request.requestKey])).rows[0];
    const replay = await previous();
    if (replay) {
      if (replay.project_id !== request.projectId) fail('lead_checkout_idempotency_conflict');
      return withUsableCheckout(replay);
    }
    const active = await client.query("SELECT 1 FROM project_access_purchases WHERE project_id=$1 AND contractor_id=$2 AND status IN ('pending','paid','review_required') FOR UPDATE",
      [request.projectId, request.contractorId]);
    if (active.rowCount) fail('lead_checkout_already_pending');
    const purchaseId = randomUUID();
    const result = await client.query(`INSERT INTO project_access_purchases
      (id, project_id, contractor_id, request_key, price_version, amount_cents, currency, provider_mode, provider_request_key, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,'usd','test',$7,date_trunc('second',NOW()) + INTERVAL '1 hour')
      ON CONFLICT (contractor_id, request_key) DO NOTHING RETURNING *`,
    [purchaseId, request.projectId, request.contractorId, request.requestKey, policy.version,
      policy.amountCents, `gcsc_lead_${purchaseId}`]);
    if (result.rows[0]) return result.rows[0];
    const concurrent = await previous();
    if (!concurrent || concurrent.project_id !== request.projectId) fail('lead_checkout_idempotency_conflict');
    return withUsableCheckout(concurrent);
  });
}

async function attachCheckoutSession(pool, purchaseId, session) {
  if (!uuid(purchaseId)) fail('lead_checkout_request_invalid');
  return transaction(pool, async client => {
    const binding = (await client.query('SELECT project_id, contractor_id FROM project_access_purchases WHERE id=$1', [purchaseId])).rows[0];
    if (!binding) fail('lead_checkout_purchase_invalid');
    await lockEligibleProject(client, binding.project_id, binding.contractor_id);
    await requireNoEntitlement(client, binding.project_id, binding.contractor_id);
    const row = (await client.query('SELECT * FROM project_access_purchases WHERE id=$1 FOR UPDATE', [purchaseId])).rows[0];
    if (!row || row.project_id !== binding.project_id || row.contractor_id !== binding.contractor_id)
      fail('lead_checkout_purchase_invalid');
    validateSession(row, session);
    await bindCheckoutSession(client, purchaseId, session.id);
    if (row.provider_checkout_id) {
      if (row.provider_checkout_id !== session.id || row.checkout_url !== session.url)
        fail('lead_checkout_session_conflict');
      return row;
    }
    return (await client.query(`UPDATE project_access_purchases
      SET provider_checkout_id=$2, checkout_url=$3, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [purchaseId, session.id, session.url])).rows[0];
  });
}

async function getLeadPurchase(pool, contractorId, purchaseId) {
  if (!id(contractorId) || !uuid(purchaseId)) fail('lead_checkout_request_invalid');
  const row = (await pool.query(`SELECT p.*, (j.published=TRUE AND j.status='open' AND j.escrow_id IS NULL
      AND owner.role='homeowner' AND owner.is_active=TRUE
      AND NOT EXISTS (SELECT 1 FROM project_access_entitlements e
        WHERE e.project_id=p.project_id AND e.contractor_id=p.contractor_id)) AS checkout_allowed
    FROM project_access_purchases p
    JOIN users u ON u.id=p.contractor_id AND u.role='contractor' AND u.is_active=TRUE
    JOIN projects j ON j.id=p.project_id
    JOIN users owner ON owner.id=j.homeowner_id
    WHERE p.id=$1 AND p.contractor_id=$2`, [purchaseId, contractorId])).rows[0];
  if (!row) return null;
  const { checkout_allowed: allowed, ...purchase } = row;
  return withUsableCheckout(purchase, allowed);
}

module.exports = { validatePricePolicy, buildCheckoutSessionRequest, validateSession,
  reserveLeadPurchase, attachCheckoutSession, getLeadPurchase };
