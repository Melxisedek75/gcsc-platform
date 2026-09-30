const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const path = require('node:path');
const Stripe = createRequire(path.resolve(__dirname, '../services/api/v3/package.json'))('stripe');
const { verifyLeadCheckoutEvent, receiveLeadCheckoutEvent } = require('../services/api/v3/database/lead-checkout-events.cjs');

const config = { mode: 'test', apiVersion: '2025-02-24.acacia', webhookSecret: 'whsec_synthetic_local_fixture_only_2026' };
function fixture() {
  const purchase = randomUUID();
  return { id: `evt_${randomUUID().replaceAll('-', '')}`, object: 'event',
    type: 'checkout.session.completed', api_version: config.apiVersion, livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: { object: { object: 'checkout.session', id: 'cs_test_synthetic', livemode: false,
      mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'usd',
      amount_total: 2500, amount_subtotal: 2500, client_reference_id: purchase,
      expires_at: Math.floor(Date.now() / 1000) + 3600, payment_intent: 'pi_synthetic',
      metadata: { purpose: 'project_access_v1', purchase_id: purchase,
        project_id: '17', contractor_id: '23', price_version: 'fixture-v1' } } } };
}
function signed(event, { secret = config.webhookSecret, timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const raw = Buffer.from(JSON.stringify(event));
  return { raw, signature: Stripe.webhooks.generateTestHeaderString({ payload: raw.toString(), secret, timestamp }) };
}
function verify(event) { const input = signed(event); return verifyLeadCheckoutEvent(input.raw, input.signature, config); }

test('installed SDK verifies original bytes and output contains only a minimal payment binding', () => {
  const event = fixture(); event.data.object.customer_email = 'private@example.invalid';
  event.data.object.metadata.owner_address = 'Never store';
  const { raw, signature } = signed(event);
  const value = verifyLeadCheckoutEvent(raw, signature, config);
  assert.equal(value.eventId, event.id);
  assert.equal(value.purchaseId, event.data.object.client_reference_id);
  assert.equal(value.payloadSha256, createHash('sha256').update(raw).digest('hex'));
  assert.equal(value.projectId, 17); assert.equal(value.contractorId, 23);
  assert.equal(value.paymentStatus, 'paid');
  assert.equal(Object.isFrozen(value), true);
  assert.equal(JSON.stringify(value).includes('private@example.invalid'), false);
  assert.equal(JSON.stringify(value).includes('Never store'), false);
  assert.equal(JSON.stringify(value).includes(config.webhookSecret), false);
});

test('changed bytes, foreign secrets and missing signatures fail without leaking payload/header', () => {
  const event = fixture(); const original = signed(event);
  const changed = Buffer.from(original.raw.toString().replace('2500', '2501'));
  for (const input of [{ raw: changed, signature: original.signature }, signed(event, { secret: 'whsec_different_local_fixture_secret' }),
    { raw: original.raw, signature: '' }, { raw: original.raw, signature: ['t=1'] }]) {
    assert.throws(() => verifyLeadCheckoutEvent(input.raw, input.signature, config), error => {
      assert.equal(error.code, 'lead_webhook_signature_invalid');
      assert.equal(error.payload, undefined); assert.equal(error.header, undefined);
      assert.equal(error.message.includes(event.id), false); return true;
    });
  }
});

test('stale, future and ambiguous signature timestamps fail closed', () => {
  const event = fixture();
  for (const seconds of [-600, 600]) {
    const input = signed(event, { timestamp: Math.floor(Date.now() / 1000) + seconds });
    assert.throws(() => verifyLeadCheckoutEvent(input.raw, input.signature, config), { code: 'lead_webhook_signature_invalid' });
  }
  const input = signed(event);
  for (const header of [`${input.signature},t=1`, input.signature.replace(/t=\d+/, 't=NaN'), input.signature + '\r\n']) {
    assert.throws(() => verifyLeadCheckoutEvent(input.raw, header, config), { code: 'lead_webhook_signature_invalid' });
  }
});

test('explicit test policy and bounded raw UTF-8 are mandatory', () => {
  const input = signed(fixture());
  for (const override of [{ mode: 'live' }, { webhookSecret: '' }, { apiVersion: '' }, { ignoreSignature: true }]) {
    assert.throws(() => verifyLeadCheckoutEvent(input.raw, input.signature, { ...config, ...override }), { code: 'lead_webhook_config_invalid' });
  }
  for (const raw of [input.raw.toString(), JSON.parse(input.raw), Buffer.alloc(0), Buffer.alloc(65537), Buffer.from([0xff]),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), input.raw])]) {
    assert.throws(() => verifyLeadCheckoutEvent(raw, input.signature, config), { code: 'lead_webhook_payload_invalid' });
  }
});

test('live, connected, unsupported-version and non-Checkout events cannot enter the inbox', () => {
  for (const override of [{ livemode: true }, { account: 'acct_foreign' }, { context: 'acct_foreign' },
    { object: 'not-event' }, { id: 'invalid' }, { api_version: '2020-01-01' },
    { type: 'payment_intent.succeeded' }, { created: Math.floor(Date.now() / 1000) + 1000 }]) {
    assert.throws(() => verify({ ...fixture(), ...override }), { code: 'lead_webhook_event_invalid' });
  }
});

test('session binding is typed, positive, project-specific and status-consistent', () => {
  for (const delta of [{ livemode: true }, { mode: 'subscription' }, { object: 'charge' }, { id: 'cs_live_bad' },
    { amount_total: -1 }, { amount_total: '2500' }, { amount_subtotal: 1 }, { currency: 'eur' },
    { status: 'open' }, { payment_status: 'no_payment_required' }, { payment_intent: null },
    { client_reference_id: randomUUID() }, { metadata: {} }, { expires_at: 1.5 }]) {
    const event = fixture(); Object.assign(event.data.object, delta);
    assert.throws(() => verify(event), { code: 'lead_webhook_binding_invalid' });
  }
  for (const delta of [{ purpose: 'escrow' }, { contractor_id: '01' }, { project_id: '-1' },
    { project_id: '2147483648' }, { purchase_id: 'not-a-uuid' }, { price_version: 'unbounded value' }]) {
    const event = fixture(); Object.assign(event.data.object.metadata, delta);
    assert.throws(() => verify(event), { code: 'lead_webhook_binding_invalid' });
  }
});

test('unpaid completion and expired sessions can be recorded but are never proof of access', () => {
  const event = fixture(); event.data.object.payment_status = 'unpaid'; event.data.object.payment_intent = null;
  assert.equal(verify(event).paymentStatus, 'unpaid');
  event.type = 'checkout.session.expired'; event.data.object.status = 'expired';
  assert.equal(verify(event).eventType, 'checkout.session.expired');
  event.data.object.payment_status = 'paid';
  assert.throws(() => verify(event), { code: 'lead_webhook_binding_invalid' });
});

test('bad signature is rejected before opening a database connection', async () => {
  const pool = { connect() { assert.fail('Unverified input reached PostgreSQL'); } };
  const input = signed(fixture());
  await assert.rejects(receiveLeadCheckoutEvent(pool, input.raw, 'bad', config), { code: 'lead_webhook_signature_invalid' });
});
