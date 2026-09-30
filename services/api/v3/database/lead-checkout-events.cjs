const { createHash } = require('node:crypto');
const Stripe = require('stripe');
const { bindCheckoutSession } = require('./lead-checkout-binding.cjs');

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const identifier = (value, prefix) => typeof value === 'string'
  && value.length <= 255 && new RegExp(`^${prefix}[a-zA-Z0-9]+$`).test(value);
const amount = value => Number.isInteger(value) && value > 0 && value <= 100000000;
const seconds = value => Number.isSafeInteger(value) && value > 0;
const priceVersion = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
function fail(code) { throw Object.assign(new Error(code), { code }); }
function databaseId(value) {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,9}$/.test(value)) return null;
  const number = Number(value);
  return number <= 2147483647 ? number : null;
}

function verifyLeadCheckoutEvent(rawBody, signature, config) {
  if (!config || Object.keys(config).sort().join(',') !== 'apiVersion,mode,webhookSecret'
    || config.mode !== 'test' || typeof config.webhookSecret !== 'string'
    || !/^whsec_[a-zA-Z0-9_-]{16,256}$/.test(config.webhookSecret)
    || typeof config.apiVersion !== 'string' || !/^\d{4}-\d{2}-\d{2}(\.[a-z]+)?$/.test(config.apiVersion))
    fail('lead_webhook_config_invalid');
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || rawBody.length > 65536)
    fail('lead_webhook_payload_invalid');
  // The SDK decoder strips a UTF-8 BOM; reject it rather than authenticate
  // different wire bytes than the event digest retained by our inbox.
  if (rawBody[0] === 0xef && rawBody[1] === 0xbb && rawBody[2] === 0xbf)
    fail('lead_webhook_payload_invalid');
  try { new TextDecoder('utf-8', { fatal: true }).decode(rawBody); }
  catch { fail('lead_webhook_payload_invalid'); }
  if (typeof signature !== 'string' || signature.length > 4096 || /[\r\n]/.test(signature))
    fail('lead_webhook_signature_invalid');
  const timestamps = signature.split(',').filter(part => part.startsWith('t='));
  const signatures = signature.split(',').filter(part => part.startsWith('v1='));
  const now = Date.now();
  const timestamp = Number(timestamps[0]?.slice(2));
  if (timestamps.length !== 1 || !/^t=[1-9][0-9]{0,12}$/.test(timestamps[0])
    || signatures.length === 0 || signatures.length > 5
    || signatures.some(part => !/^v1=[a-fA-F0-9]{64}$/.test(part))
    || !seconds(timestamp) || Math.abs(Math.floor(now / 1000) - timestamp) > 300)
    fail('lead_webhook_signature_invalid');

  let event;
  try { event = Stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret, 300, undefined, now); }
  catch (error) {
    // SDK errors include the original payload/header: never propagate them to logs or HTTP.
    fail(error.type === 'StripeSignatureVerificationError' ? 'lead_webhook_signature_invalid' : 'lead_webhook_payload_invalid');
  }
  if (!event || event.object !== 'event' || !identifier(event.id, 'evt_')
    || event.livemode !== false || event.account != null || event.context != null
    || event.api_version !== config.apiVersion || !seconds(event.created)
    || event.created > Math.floor(now / 1000) + 300
    || !['checkout.session.completed', 'checkout.session.expired'].includes(event.type))
    fail('lead_webhook_event_invalid');
  const session = event.data?.object;
  const binding = session?.metadata;
  const projectId = databaseId(binding?.project_id);
  const contractorId = databaseId(binding?.contractor_id);
  if (!session || session.object !== 'checkout.session' || !identifier(session.id, 'cs_test_')
    || session.livemode !== false || session.mode !== 'payment' || session.currency !== 'usd'
    || !amount(session.amount_total) || session.amount_subtotal !== session.amount_total
    || !seconds(session.expires_at) || !projectId || !contractorId
    || binding?.purpose !== 'project_access_v1' || !uuid(binding.purchase_id)
    || !priceVersion(binding.price_version) || session.client_reference_id !== binding.purchase_id
    || (session.payment_intent != null && !identifier(session.payment_intent, 'pi_'))
    || (session.payment_status === 'paid' && !identifier(session.payment_intent, 'pi_'))
    || (event.type === 'checkout.session.completed'
      ? session.status !== 'complete' || !['paid', 'unpaid'].includes(session.payment_status)
      : session.status !== 'expired' || session.payment_status !== 'unpaid'))
    fail('lead_webhook_binding_invalid');

  return Object.freeze({ eventId: event.id, eventType: event.type, apiVersion: event.api_version,
    providerCreated: event.created, payloadSha256: createHash('sha256').update(rawBody).digest('hex'),
    purchaseId: binding.purchase_id, projectId, contractorId, priceVersion: binding.price_version,
    amountCents: session.amount_total, currency: 'usd', providerCheckoutId: session.id,
    expiresAt: session.expires_at, paymentStatus: session.payment_status,
    paymentIntentId: session.payment_intent || null });
}

// Intake records verified bindings only. No HTTP endpoint, provider IO or paid-grant transition.
async function receiveLeadCheckoutEvent(pool, rawBody, signature, config) {
  const event = verifyLeadCheckoutEvent(rawBody, signature, config);
  const client = await pool.connect();
  let discard;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    // All intake/attach writers serialize on the purchase. A future fulfillment
    // transaction must acquire project/identities first, following the API lock order.
    const row = (await client.query('SELECT * FROM project_access_purchases WHERE id=$1 FOR UPDATE', [event.purchaseId])).rows[0];
    if (!row || row.provider_mode !== 'test' || row.project_id !== event.projectId
      || row.contractor_id !== event.contractorId || row.amount_cents !== event.amountCents
      || row.currency !== event.currency || row.price_version !== event.priceVersion
      || Math.floor(new Date(row.expires_at).getTime() / 1000) !== event.expiresAt
      || (row.provider_checkout_id && row.provider_checkout_id !== event.providerCheckoutId))
      fail('lead_webhook_purchase_mismatch');
    await bindCheckoutSession(client, row.id, event.providerCheckoutId, event.paymentIntentId, 'lead_webhook_purchase_mismatch');
    const inserted = await client.query(`INSERT INTO project_access_checkout_events
      (event_id,purchase_id,provider_checkout_id,event_type,api_version,provider_created,payload_sha256,payment_status,payment_intent_id,purchase_snapshot)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (event_id) DO NOTHING RETURNING event_id,status`,
    [event.eventId, event.purchaseId, event.providerCheckoutId, event.eventType, event.apiVersion,
      event.providerCreated, event.payloadSha256, event.paymentStatus, event.paymentIntentId,
      JSON.stringify({ project_id: event.projectId, contractor_id: event.contractorId,
        amount_cents: event.amountCents, currency: event.currency, price_version: event.priceVersion,
        expires_at: event.expiresAt, created_at: new Date(row.created_at).toISOString() })]);
    let result = inserted.rows[0];
    if (!result) {
      const existing = (await client.query('SELECT * FROM project_access_checkout_events WHERE event_id=$1', [event.eventId])).rows[0];
      if (!existing || existing.payload_sha256 !== event.payloadSha256 || existing.purchase_id !== event.purchaseId)
        fail('lead_webhook_replay_conflict');
      result = existing;
    }
    await client.query('COMMIT');
    return { eventId: result.event_id, status: result.status, duplicate: inserted.rowCount === 0 };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { discard = error; }
    throw error;
  } finally { client.release(discard); }
}

module.exports = { verifyLeadCheckoutEvent, receiveLeadCheckoutEvent };
