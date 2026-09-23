import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const contract = JSON.parse(fs.readFileSync(
  new URL('../docs/product/priority-access-contract.v1.json', import.meta.url),
  'utf8',
))

test('priority access contract stays spec-only and separates access from work proposals', () => {
  assert.equal(contract.status, 'SPEC_ONLY')
  assert.equal(contract.liveSettlementEnabled, false)
  assert.ok(contract.records.includes('access_offer'))
  assert.ok(contract.records.includes('work_proposal'))
  assert.ok(!contract.records.includes('bid'))
  assert.ok(contract.prohibited.includes('label_access_offer_as_work_bid'))
})

test('payment challenge is versioned, bounded and idempotent', () => {
  const required = [
    'amountMinor', 'asset', 'network', 'recipient', 'memo',
    'policyVersion', 'expiresAt', 'idempotencyKey',
  ]
  assert.deepEqual(contract.paymentChallengeFields, required)
  assert.deepEqual(contract.durationHours, [1, 4, 12])
})

test('single-winner and replay invariants are explicit', () => {
  assert.ok(contract.uniqueness.includes('one_active_grant_per_project'))
  assert.ok(contract.uniqueness.includes('one_active_grant_per_contractor'))
  assert.ok(contract.uniqueness.includes('one_receipt_per_network_transaction'))
  assert.ok(contract.uniqueness.includes('one_outcome_per_access_settlement'))
})

test('each settlement outcome conserves exactly 100 percent', () => {
  for (const outcome of Object.values(contract.settlementOutcomes)) {
    assert.equal(outcome.refundBps + outcome.platformBps, 10000)
  }
  assert.deepEqual(contract.settlementOutcomes.awarded_to_grant_holder, {
    refundBps: 0,
    platformBps: 10000,
  })
  assert.deepEqual(contract.settlementOutcomes.compliant_proposal_not_awarded, {
    refundBps: 5000,
    platformBps: 5000,
  })
  assert.deepEqual(contract.settlementOutcomes.access_not_delivered, {
    refundBps: 10000,
    platformBps: 0,
  })
})

test('planned API has distinct offer, grant, proposal and decision boundaries', () => {
  const routes = contract.endpoints.map(({ method, path }) => `${method} ${path}`)
  assert.equal(new Set(routes).size, routes.length)
  assert.ok(routes.includes('POST /api/priority-access/rounds/:roundId/offers'))
  assert.ok(routes.includes('POST /api/priority-access/rounds/:roundId/finalize'))
  assert.ok(routes.includes('POST /api/priority-access/grants/:grantId/proposals'))
  assert.ok(routes.includes('POST /api/priority-access/proposals/:proposalId/decision'))
})
