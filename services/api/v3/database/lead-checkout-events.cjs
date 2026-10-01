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
    || !['checkout.session.completed', 'checkout.session.expired', 'refund.created', 'refund.updated',
      'charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed'].includes(event.type))
    fail('lead_webhook_event_invalid');
  if (event.type.startsWith('charge.dispute.')) {
    const dispute = event.data?.object;
    if (!dispute || dispute.object !== 'dispute' || !identifier(dispute.id, 'du_') || dispute.livemode !== false
      || !amount(dispute.amount) || dispute.currency !== 'usd'
      || !identifier(dispute.payment_intent, 'pi_') || !identifier(dispute.charge, 'ch_')
      || !seconds(dispute.created) || dispute.created > event.created
      || !['needs_response', 'under_review', 'won', 'lost', 'warning_needs_response', 'warning_under_review', 'warning_closed'].includes(dispute.status)
      || (event.type === 'charge.dispute.closed' && !['won', 'lost', 'warning_closed'].includes(dispute.status)))
      fail('lead_webhook_dispute_invalid');
    return Object.freeze({ kind: 'dispute', eventId: event.id, eventType: event.type,
      apiVersion: event.api_version, providerCreated: event.created,
      payloadSha256: createHash('sha256').update(rawBody).digest('hex'),
      disputeId: dispute.id, disputeAmountCents: dispute.amount, disputeCreated: dispute.created,
      disputeStatus: dispute.status, currency: 'usd', paymentIntentId: dispute.payment_intent, chargeId: dispute.charge });
  }
  if (event.type.startsWith('refund.')) {
    const refund = event.data?.object;
    // Refund has no livemode field in the pinned SDK; the signed Event supplies
    // test mode. Only successful observations, never refund creation commands.
    if (!refund || refund.object !== 'refund' || !identifier(refund.id, 're_')
      || refund.status !== 'succeeded' || !amount(refund.amount) || refund.currency !== 'usd'
      || !identifier(refund.payment_intent, 'pi_') || !identifier(refund.charge, 'ch_')
      || !seconds(refund.created) || refund.created > event.created
      || (refund.livemode !== undefined && refund.livemode !== false)
      || refund.source_transfer_reversal != null || refund.transfer_reversal != null)
      fail('lead_webhook_refund_invalid');
    return Object.freeze({ kind: 'refund', eventId: event.id, eventType: event.type,
      apiVersion: event.api_version, providerCreated: event.created,
      payloadSha256: createHash('sha256').update(rawBody).digest('hex'),
      refundId: refund.id, refundAmountCents: refund.amount, refundCreated: refund.created,
      currency: 'usd', paymentIntentId: refund.payment_intent, chargeId: refund.charge });
  }
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

// Intake records verified facts only. No HTTP endpoint, provider IO or grant transition.
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
    // SQL identifiers are fixed here, never selected by metadata or raw payload.
    const fact = event.kind === 'refund'
      ? { table: 'project_access_refund_bindings', key: 'refund_id', id: event.refundId, amount: event.refundAmountCents, created: event.refundCreated }
      : event.kind === 'dispute'
        ? { table: 'project_access_dispute_bindings', key: 'dispute_id', id: event.disputeId, amount: event.disputeAmountCents, created: event.disputeCreated }
        : null;
    const purchaseId = fact ? (await client.query(
      'SELECT purchase_id FROM project_access_checkout_bindings WHERE payment_intent_id=$1',
      [event.paymentIntentId])).rows[0]?.purchase_id : event.purchaseId;
    const row = (await client.query('SELECT * FROM project_access_purchases WHERE id=$1 FOR UPDATE', [purchaseId])).rows[0];
    let checkoutId = event.providerCheckoutId;
    if (fact) {
      const binding = (await client.query('SELECT * FROM project_access_checkout_bindings WHERE purchase_id=$1 FOR UPDATE', [purchaseId])).rows[0];
      if (!row || row.provider_mode !== 'test' || !binding || binding.payment_intent_id !== event.paymentIntentId
        || row.currency !== event.currency || fact.amount > row.amount_cents
        || fact.created < Math.floor(new Date(row.created_at).getTime() / 1000)
        || (row.provider_checkout_id && row.provider_checkout_id !== binding.provider_checkout_id))
        fail(`lead_webhook_${event.kind}_mismatch`);
      checkoutId = binding.provider_checkout_id;
      await client.query(`INSERT INTO ${fact.table}
        (${fact.key},purchase_id,payment_intent_id,charge_id,amount_cents,currency,provider_created)
        VALUES ($1,$2,$3,$4,$5,'usd',$6) ON CONFLICT (${fact.key}) DO NOTHING`,
      [fact.id, row.id, event.paymentIntentId, event.chargeId, fact.amount, fact.created]);
      const stored = (await client.query(`SELECT * FROM ${fact.table} WHERE ${fact.key}=$1 FOR UPDATE`, [fact.id])).rows[0];
      if (!stored || stored.purchase_id !== row.id || stored.payment_intent_id !== event.paymentIntentId
        || stored.amount_cents !== fact.amount || stored.currency !== event.currency
        || stored.charge_id !== event.chargeId || Number(stored.provider_created) !== fact.created)
        fail(`lead_webhook_${event.kind}_conflict`);
    } else if (!row || row.provider_mode !== 'test' || row.project_id !== event.projectId
      || row.contractor_id !== event.contractorId || row.amount_cents !== event.amountCents
      || row.currency !== event.currency || row.price_version !== event.priceVersion
      || Math.floor(new Date(row.expires_at).getTime() / 1000) !== event.expiresAt
      || (row.provider_checkout_id && row.provider_checkout_id !== event.providerCheckoutId))
      fail('lead_webhook_purchase_mismatch');
    await bindCheckoutSession(client, row.id, checkoutId, event.paymentIntentId, 'lead_webhook_purchase_mismatch');
    const inserted = await client.query(`INSERT INTO project_access_checkout_events
      (event_id,purchase_id,provider_checkout_id,event_type,api_version,provider_created,payload_sha256,payment_status,payment_intent_id,purchase_snapshot,refund_id,refund_amount_cents,dispute_id,dispute_amount_cents,dispute_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (event_id) DO NOTHING RETURNING event_id,status`,
    [event.eventId, row.id, checkoutId, event.eventType, event.apiVersion,
      event.providerCreated, event.payloadSha256, fact ? 'unpaid' : event.paymentStatus, event.paymentIntentId,
      JSON.stringify({ project_id: row.project_id, contractor_id: row.contractor_id,
        amount_cents: row.amount_cents, currency: row.currency, price_version: row.price_version,
        expires_at: Math.floor(new Date(row.expires_at).getTime() / 1000), created_at: new Date(row.created_at).toISOString() }),
      event.refundId || null, event.refundAmountCents || null,
      event.disputeId || null, event.disputeAmountCents || null, event.disputeStatus || null]);
    let result = inserted.rows[0];
    if (!result) {
      const existing = (await client.query('SELECT * FROM project_access_checkout_events WHERE event_id=$1', [event.eventId])).rows[0];
      if (!existing || existing.payload_sha256 !== event.payloadSha256 || existing.purchase_id !== row.id)
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
