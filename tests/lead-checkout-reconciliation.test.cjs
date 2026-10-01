const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { reconcileUnboundLeadEvent } = require('../services/api/v3/database/lead-checkout-reconciliation.cjs');

test('reconciliation rejects malformed event IDs before database access', async () => {
  const pool = { connect() { assert.fail('Invalid event ID must not connect'); } };
  for (const id of [null, '', 'evt_', 'evt_bad;DROP', 'pi_valid', 'evt_' + 'a'.repeat(252)]) {
    await assert.rejects(reconcileUnboundLeadEvent(pool, id), { code: 'lead_reconcile_request_invalid' });
  }
});

test('reconciliation remains dormant and has no provider or HTTP activation', () => {
  const api = path.resolve(__dirname, '../services/api/v3');
  assert.doesNotMatch(fs.readFileSync(path.join(api, 'pure-server.js'), 'utf8'), /lead-checkout-reconciliation\.cjs/);
  assert.doesNotMatch(fs.readFileSync(path.join(api, 'database/lead-checkout-reconciliation.cjs'), 'utf8'),
    /process\.env|fetch\(|stripe\.com|setInterval\(/);
});
