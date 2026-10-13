const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sweepDueLeadCheckoutEvents } = require('../services/api/v3/database/lead-checkout-retry.cjs');

test('retry sweep rejects unbounded or malformed selections before database access', async () => {
  const pool = { query() { assert.fail('Invalid sweep must not query the database'); } };
  for (const options of [null, [], { limit: 0 }, { limit: 51 }, { limit: 1.5 },
    { eventIds: [] }, { eventIds: ['evt_a', 'evt_a'] }, { eventIds: ['evt_bad;DROP'] },
    { eventIds: ['evt_' + 'a'.repeat(252)] }, { providerMode: 'live' }]) {
    await assert.rejects(sweepDueLeadCheckoutEvents(pool, options), { code: 'lead_retry_request_invalid' });
  }
});

test('retry sweep remains dormant and cannot call a payment provider', () => {
  const api = path.resolve(__dirname, '../services/api/v3');
  assert.doesNotMatch(fs.readFileSync(path.join(api, 'pure-server.js'), 'utf8'), /lead-checkout-retry\.cjs/);
  assert.doesNotMatch(fs.readFileSync(path.join(api, 'database/lead-checkout-retry.cjs'), 'utf8'),
    /process\.env|fetch\(|stripe\.com|setInterval\(/);
});
