const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { validatePricePolicy, buildCheckoutSessionRequest, validateSession,
  reserveLeadPurchase, attachCheckoutSession, getLeadPurchase } = require('../services/api/v3/database/lead-checkout.cjs');

const policy = { mode: 'test', currency: 'usd', version: 'fixture-v1', amountCents: 2500 };
function purchase(overrides = {}) {
  const id = randomUUID();
  return { id, project_id: 17, contractor_id: 23, price_version: policy.version,
    amount_cents: policy.amountCents, currency: 'usd', provider_mode: 'test',
    provider_request_key: `gcsc_lead_${id}`, status: 'pending',
    expires_at: new Date(Date.now() + 3600000), ...overrides };
}
function session(row, overrides = {}) {
  const request = buildCheckoutSessionRequest(row, 'https://preview.example.test');
  return { object: 'checkout.session', id: 'cs_test_fixture1', livemode: false,
    url: 'https://checkout.stripe.com/c/pay/cs_test_fixture1', mode: 'payment',
    status: 'open', payment_status: 'unpaid', currency: row.currency,
    amount_total: row.amount_cents, amount_subtotal: row.amount_cents,
    expires_at: request.params.expires_at, client_reference_id: row.id,
    metadata: request.params.metadata, ...overrides };
}

test('price is explicit server policy, test-only and integer minor units', () => {
  assert.deepEqual(validatePricePolicy(policy), policy);
  for (const delta of [{ mode: 'live' }, { currency: 'xpr' }, { amountCents: '2500' },
    { amountCents: 0 }, { amountCents: -1 }, { amountCents: 2.5 }, { amountCents: NaN },
    { amountCents: 100000001 }, { version: '' }, { version: 'a '.repeat(100) }, { clientPrice: 1 }]) {
    assert.throws(() => validatePricePolicy({ ...policy, ...delta }), { code: 'lead_checkout_policy_invalid' });
  }
});

test('Checkout request binds project, buyer, immutable quote and stable provider retry key', () => {
  const row = purchase();
  const first = buildCheckoutSessionRequest(row, 'https://preview.example.test');
  assert.deepEqual(first, buildCheckoutSessionRequest(row, 'https://preview.example.test'));
  assert.equal(first.options.idempotencyKey, row.provider_request_key);
  assert.equal(first.params.client_reference_id, row.id);
  assert.equal(first.params.mode, 'payment');
  assert.equal(first.params.line_items[0].price_data.unit_amount, 2500);
  assert.equal(first.params.line_items[0].quantity, 1);
  assert.deepEqual(first.params.metadata, { purpose: 'project_access_v1', purchase_id: row.id,
    project_id: '17', contractor_id: '23', price_version: 'fixture-v1' });
  assert.deepEqual(first.params.payment_intent_data.metadata, first.params.metadata);
  assert.equal(first.params.success_url, `https://preview.example.test/#/dashboard?lead_purchase=${row.id}`);
  assert.equal(Object.hasOwn(first.params, 'allow_promotion_codes'), false);
  assert.equal(Object.hasOwn(first.params, 'customer_email'), false);
});

test('return origin cannot carry credentials, arbitrary paths, queries or unsafe protocols', () => {
  for (const origin of ['https://u:p@example.test', 'https://example.test/path',
    'https://example.test/?next=evil', 'https://example.test/#frag', 'javascript:alert(1)',
    'http://example.test', 'http://127.0.0.1.evil.test', '//example.test']) {
    assert.throws(() => buildCheckoutSessionRequest(purchase(), origin), { code: 'lead_checkout_origin_invalid' });
  }
  assert.match(buildCheckoutSessionRequest(purchase(), 'http://127.0.0.1:40719').params.success_url, /^http:\/\/127\.0\.0\.1:40719\//);
});

test('expired, already-paid, live and malformed purchase cannot start another session', () => {
  for (const delta of [{ status: 'paid' }, { status: 'revoked' }, { provider_mode: 'live' },
    { expires_at: new Date(Date.now() + 20 * 60000) }, { id: 'not-a-uuid' },
    { amount_cents: -1 }, { project_id: '17' }, { provider_request_key: 'other' }]) {
    assert.throws(() => buildCheckoutSessionRequest(purchase(delta), 'https://preview.example.test'));
  }
});

test('session must match the stored quote, identity, mode, URL and expiry', () => {
  const row = purchase();
  const response = session(row);
  assert.doesNotThrow(() => validateSession(row, response));
  const bad = [{ livemode: true }, { livemode: undefined }, { mode: 'subscription' },
    { object: 'payment_intent' }, { id: 'cs_live_fake' }, { status: 'complete' },
    { payment_status: 'paid' }, { amount_total: 1 }, { amount_subtotal: 1 },
    { amount_total: '2500' }, { currency: 'eur' }, { client_reference_id: randomUUID() },
    { expires_at: response.expires_at + 1 }, { metadata: {} },
    { metadata: { ...response.metadata, project_id: '99' } },
    { metadata: { ...response.metadata, contractor_id: '99' } },
    { metadata: { ...response.metadata, price_version: 'other' } },
    { url: 'https://checkout.stripe.com.evil.test/c/pay/cs_test_fixture1' },
    { url: 'https://u:p@checkout.stripe.com/c/pay/cs_test_fixture1' },
    { url: 'https://checkout.stripe.com/c/pay/cs_test_another' }];
  for (const delta of bad) assert.throws(() => validateSession(row, { ...response, ...delta }),
    { code: 'lead_checkout_session_mismatch' });
});

test('invalid or client-priced requests fail before accessing the database', async () => {
  const pool = { connect() { assert.fail('Invalid request reached database'); },
    query() { assert.fail('Invalid request reached database'); } };
  const request = { contractorId: 23, projectId: 17, requestKey: randomUUID() };
  for (const change of [{ contractorId: '23' }, { contractorId: 0 }, { projectId: 1.5 },
    { projectId: 2147483648 }, { requestKey: 'reuse-me' }, { amountCents: 1 }, { status: 'paid' }]) {
    await assert.rejects(reserveLeadPurchase(pool, { ...request, ...change }, policy), { code: 'lead_checkout_request_invalid' });
  }
  await assert.rejects(reserveLeadPurchase(pool, request, { ...policy, mode: 'live' }), { code: 'lead_checkout_policy_invalid' });
  await assert.rejects(attachCheckoutSession(pool, 'unbound', {}), { code: 'lead_checkout_request_invalid' });
  await assert.rejects(getLeadPurchase(pool, 0, randomUUID()), { code: 'lead_checkout_request_invalid' });
});
