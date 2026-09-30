const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fulfillLeadCheckoutEvent } = require('../services/api/v3/database/lead-checkout-fulfillment.cjs');
const { migrationStatements, renderSchemaSql } = require('../services/api/v3/database/migrate-schema.cjs');

test('untrusted shapes are refused before acquiring a DB connection', async () => {
  const pool = { connect() { assert.fail('Invalid input must not acquire a connection'); } };
  for (const eventId of [null, 3, {}, ['evt_fixture'], { eventId: 'evt_fixture' }, 'evt_', 'evt_' + 'a'.repeat(252)]) {
    await assert.rejects(fulfillLeadCheckoutEvent(pool, eventId), { code: 'lead_fulfillment_request_invalid' });
  }
});

test('missing inbox events roll back; failed rollback discards the client and preserves the error', async () => {
  for (const broken of [false, true]) {
    const queries = []; let released;
    const pool = { connect: async () => ({
      query: async sql => {
        queries.push(sql);
        if (broken && sql === 'ROLLBACK') throw new Error('Disconnected');
        return { rows: [] };
      }, release: error => { released = error; },
    }) };
    await assert.rejects(fulfillLeadCheckoutEvent(pool, 'evt_missing'), { code: 'lead_fulfillment_event_missing' });
    assert.equal(queries[0], 'BEGIN'); assert.equal(queries.at(-1), 'ROLLBACK');
    assert.equal(queries.includes('COMMIT'), false);
    assert.equal(released?.code, broken ? 'lead_fulfillment_event_missing' : undefined);
  }
});

test('repeatable migration adds nullable evidence fields without inventing old verified snapshots', () => {
  for (const column of ['purchase_snapshot JSONB', 'outcome TEXT', 'processed_at TIMESTAMPTZ']) {
    const sql = `ALTER TABLE project_access_checkout_events ADD COLUMN IF NOT EXISTS ${column}`;
    assert.ok(migrationStatements.includes(sql)); assert.ok(renderSchemaSql().includes(sql));
  }
  assert.equal(migrationStatements.some(sql => /UPDATE project_access_checkout_events/i.test(sql)), false);
});

test('fulfillment remains dormant and has no provider, secret or HTTP dependency', () => {
  const api = path.resolve(__dirname, '../services/api/v3');
  assert.doesNotMatch(fs.readFileSync(path.join(api, 'pure-server.js'), 'utf8'), /lead-checkout(?:-fulfillment|-events)?\.cjs/);
  assert.doesNotMatch(fs.readFileSync(path.join(api, 'database/lead-checkout-fulfillment.cjs'), 'utf8'), /require\(|process\.env|fetch\(/);
});
