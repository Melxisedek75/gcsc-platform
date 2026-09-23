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
  assert.ok(contract.uniqueness.includes('one_challenge_per_access_offer'))
  assert.ok(contract.uniqueness.includes('one_verified_receipt_per_access_offer'))
  assert.ok(contract.uniqueness.includes('one_access_settlement_per_access_offer'))
  assert.ok(contract.uniqueness.includes('one_outcome_per_access_settlement'))
  assert.ok(contract.uniqueness.includes('one_ledger_entry_per_settlement_outcome_and_entry_type'))
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
  assert.equal(contract.accounting.liveTransferAuthorized, false)
  assert.equal(contract.accounting.residualRecipient, 'platform')
  assert.equal(contract.accounting.ledgerEntriesImmutable, true)
})

test('minor-unit allocation is deterministic for even, odd and full outcomes', () => {
  const allocate = (amountMinor, outcomeName) => {
    const amount = BigInt(amountMinor)
    const outcome = contract.settlementOutcomes[outcomeName]
    const refund = amount * BigInt(outcome.refundBps) / 10000n
    const platform = amount - refund
    return { refund, platform }
  }

  assert.deepEqual(allocate(100, 'compliant_proposal_not_awarded'), { refund: 50n, platform: 50n })
  assert.deepEqual(allocate(101, 'compliant_proposal_not_awarded'), { refund: 50n, platform: 51n })
  assert.deepEqual(allocate(101, 'awarded_to_grant_holder'), { refund: 0n, platform: 101n })
  assert.deepEqual(allocate(101, 'access_not_delivered'), { refund: 101n, platform: 0n })
})

test('duplicate callbacks, audit rollback and restart recovery remain required', () => {
  assert.deepEqual(contract.requiredPersistenceCases, [
    'duplicate_callback_returns_same_receipt_and_ledger_entries',
    'failed_audit_insert_rolls_back_state_and_ledger',
    'restart_recovers_offer_challenge_receipt_settlement_and_ledger_bindings',
  ])
})

test('receipt binding identifiers and immutable quote fields are mandatory', () => {
  assert.deepEqual(contract.bindingFields.accessOffer, [
    'offerId', 'roundId', 'contractorUserId', 'challengeId', 'quoteHash', 'policyVersion',
  ])
  for (const field of ['challengeId', 'offerId', 'amountMinor', 'asset', 'network', 'recipient', 'memo']) {
    assert.ok(contract.bindingFields.verifiedReceipt.includes(field))
  }
  for (const field of ['settlementId', 'offerId', 'challengeId', 'receiptId', 'verifiedAmountMinor']) {
    assert.ok(contract.bindingFields.accessSettlement.includes(field))
  }
})

test('every state-changing operation has prior state, actor, idempotency and rejection rules', () => {
  const requiredOperations = [
    'create_offer', 'verify_receipt', 'finalize_round', 'submit_proposal',
    'accept_proposal', 'reject_proposal', 'request_revision', 'expire_grant',
    'record_outcome', 'reopen_round',
  ]
  assert.deepEqual(contract.transitions.map(item => item.operation), requiredOperations)
  for (const transition of contract.transitions) {
    assert.ok(Object.keys(transition).some(key => key.endsWith('From')))
    assert.ok(transition.actor)
    assert.ok(transition.idempotencyScope)
    assert.ok(transition.reject)
  }
  const reopen = contract.transitions.find(item => item.operation === 'reopen_round')
  assert.deepEqual(reopen.roundFrom, ['expired', 'rejected', 'refunded'])
  const finalize = contract.transitions.find(item => item.operation === 'finalize_round')
  assert.deepEqual(finalize.roundFrom, ['bidding'])
})

test('planned API has distinct offer, grant, proposal and decision boundaries', () => {
  const routes = contract.endpoints.map(({ method, path }) => `${method} ${path}`)
  assert.equal(new Set(routes).size, routes.length)
  assert.ok(routes.includes('POST /api/priority-access/rounds/:roundId/offers'))
  assert.ok(routes.includes('POST /api/priority-access/rounds/:roundId/finalize'))
  assert.ok(routes.includes('POST /api/priority-access/grants/:grantId/proposals'))
  assert.ok(routes.includes('POST /api/priority-access/proposals/:proposalId/decision'))
  assert.ok(routes.includes('POST /api/priority-access/grants/:grantId/expire'))
  assert.ok(routes.includes('POST /api/priority-access/settlements/:settlementId/outcome'))
})
