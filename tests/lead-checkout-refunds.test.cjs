const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const Stripe = createRequire(path.resolve(__dirname, '../services/api/v3/package.json'))('stripe');
const { verifyLeadCheckoutEvent, receiveLeadCheckoutEvent } = require('../services/api/v3/database/lead-checkout-events.cjs');
const config = { mode: 'test', apiVersion: '2025-02-24.acacia', webhookSecret: 'whsec_synthetic_local_fixture_only_2026' };
function fixture() {
  const created = Math.floor(Date.now() / 1000);
  return { id: 'evt_refundfixture', object: 'event', type: 'refund.created',
    api_version: config.apiVersion, livemode: false, created,
    data: { object: { id: 're_fixture', object: 'refund', status: 'succeeded', amount: 2500,
      currency: 'usd', payment_intent: 'pi_fixture', charge: 'ch_fixture',
      created, metadata: { private: 'must-not-store' },
      instructions_email: 'private@example.invalid', source_transfer_reversal: null, transfer_reversal: null } } };
}
function sign(event) {
  const raw = Buffer.from(JSON.stringify(event));
  return { raw, signature: Stripe.webhooks.generateTestHeaderString({ payload: raw.toString(), secret: config.webhookSecret }) };
}
function verify(event) { const input = sign(event); return verifyLeadCheckoutEvent(input.raw, input.signature, config); }

test('signed succeeded Refund uses envelope test mode and allowlists only binding fields', () => {
  for (const type of ['refund.created', 'refund.updated']) {
    const event = fixture(); event.type = type;
    const result = verify(event);
    assert.equal(result.kind, 'refund'); assert.equal(result.refundId, 're_fixture');
    assert.equal(result.paymentIntentId, 'pi_fixture'); assert.equal(result.refundAmountCents, 2500);
    assert.equal(result.chargeId, 'ch_fixture'); assert.equal(Object.isFrozen(result), true);
    assert.equal(JSON.stringify(result).includes('private@example.invalid'), false);
    assert.equal(JSON.stringify(result).includes('must-not-store'), false);
  }
});

test('pending, failed, canceled and malformed Refund facts are not successful refunds', () => {
  for (const delta of [{ status: 'pending' }, { status: 'requires_action' }, { status: 'failed' }, { status: 'canceled' },
    { amount: 0 }, { amount: '2500' }, { amount: 0.5 }, { currency: 'eur' }, { payment_intent: null },
    { payment_intent: { id: 'pi_fixture' } }, { charge: null }, { id: 'not-refund' }, { object: 'charge' },
    { livemode: true }, { transfer_reversal: 'tr_foreign' }, { source_transfer_reversal: 'tr_foreign' },
    { created: 0 }, { created: Math.floor(Date.now() / 1000) + 1000 }]) {
    const event = fixture(); Object.assign(event.data.object, delta);
    assert.throws(() => verify(event), { code: 'lead_webhook_refund_invalid' });
  }
});

test('live, connected and unsigned refunds fail before the database', async () => {
  const pool = { connect() { assert.fail('Unverified refund reached DB'); } };
  for (const delta of [{ livemode: true }, { account: 'acct_other' }, { context: 'acct_other' }, { type: 'refund.failed' }]) {
    const input = sign({ ...fixture(), ...delta });
    await assert.rejects(receiveLeadCheckoutEvent(pool, input.raw, input.signature, config), { code: 'lead_webhook_event_invalid' });
  }
  const input = sign(fixture());
  await assert.rejects(receiveLeadCheckoutEvent(pool, input.raw, 'bad', config), { code: 'lead_webhook_signature_invalid' });
});
