const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const Stripe = createRequire(path.resolve(__dirname, '../services/api/v3/package.json'))('stripe');
const { verifyLeadCheckoutEvent, receiveLeadCheckoutEvent } = require('../services/api/v3/database/lead-checkout-events.cjs');
const config = { mode: 'test', apiVersion: '2025-02-24.acacia', webhookSecret: 'whsec_synthetic_local_fixture_only_2026' };
function fixture() {
  const created = Math.floor(Date.now() / 1000);
  return { id: 'evt_disputefixture', object: 'event', type: 'charge.dispute.created',
    api_version: config.apiVersion, livemode: false, created,
    data: { object: { id: 'du_fixture', object: 'dispute', status: 'needs_response', livemode: false,
      amount: 2500, currency: 'usd', payment_intent: 'pi_fixture', charge: 'ch_fixture', created,
      metadata: { private: 'must-not-store' }, evidence: { customer_email_address: 'private@example.invalid' },
      balance_transactions: [{ id: 'txn_private' }], reason: 'private-reason' } } };
}
function sign(event) {
  const raw = Buffer.from(JSON.stringify(event));
  return { raw, signature: Stripe.webhooks.generateTestHeaderString({ payload: raw.toString(), secret: config.webhookSecret }) };
}
function verify(event) { const input = sign(event); return verifyLeadCheckoutEvent(input.raw, input.signature, config); }

test('signed dispute lifecycle retains only allowlisted references and status', () => {
  for (const [type, statuses] of [
    ['charge.dispute.created', ['needs_response', 'warning_needs_response']],
    ['charge.dispute.updated', ['needs_response', 'under_review', 'warning_needs_response', 'warning_under_review']],
    ['charge.dispute.closed', ['won', 'lost', 'warning_closed']],
  ]) for (const status of statuses) {
    const event = fixture(); event.type = type; event.data.object.status = status;
    const result = verify(event);
    assert.equal(result.kind, 'dispute'); assert.equal(result.disputeId, 'du_fixture');
    assert.equal(result.paymentIntentId, 'pi_fixture'); assert.equal(result.disputeAmountCents, 2500);
    assert.equal(result.disputeStatus, status); assert.equal(Object.isFrozen(result), true);
    assert.doesNotMatch(JSON.stringify(result), /private|txn_/);
  }
});

test('malformed, live, expanded or unsupported dispute data is rejected', () => {
  for (const delta of [{ status: 'prevented' }, { status: 'unknown' }, { amount: 0 }, { amount: 0.5 },
    { amount: '2500' }, { amount: 100000001 }, { currency: 'eur' }, { payment_intent: null },
    { payment_intent: { id: 'pi_fixture' } }, { charge: { id: 'ch_fixture' } }, { charge: null },
    { id: 'du_' }, { object: 'charge' }, { livemode: true }, { livemode: undefined },
    { created: 0 }, { created: Math.floor(Date.now() / 1000) + 1000 }]) {
    const event = fixture(); Object.assign(event.data.object, delta);
    assert.throws(() => verify(event), { code: 'lead_webhook_dispute_invalid' });
  }
  const event = fixture(); event.type = 'charge.dispute.closed';
  assert.throws(() => verify(event), { code: 'lead_webhook_dispute_invalid' });
});

test('unsigned, foreign-account and live disputes never reach the database', async () => {
  const pool = { connect() { assert.fail('Unverified dispute reached DB'); } };
  for (const delta of [{ livemode: true }, { account: 'acct_other' }, { context: 'acct_other' },
    { type: 'charge.dispute.funds_withdrawn' }, { api_version: '2020-08-27' }]) {
    const input = sign({ ...fixture(), ...delta });
    await assert.rejects(receiveLeadCheckoutEvent(pool, input.raw, input.signature, config), { code: 'lead_webhook_event_invalid' });
  }
  const input = sign(fixture());
  await assert.rejects(receiveLeadCheckoutEvent(pool, input.raw, 'bad', config), { code: 'lead_webhook_signature_invalid' });
});
