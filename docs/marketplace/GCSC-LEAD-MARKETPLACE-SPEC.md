# GCSC Lead Marketplace Simple MVP

Status: implementation branch for October 2026 Simple Functions milestone.

## Scope
Two lead acquisition modes:
1. Fixed-price reserve.
2. Timed auction.

A contractor commits GCSC utility value to reserve a lead. Sensitive homeowner/job data remains off-chain; the contract stores an opaque reference hash.

Default unsuccessful-claim policy: 50% refund (5000 bps), 50% retained as access/reservation fee. Policy is configurable before use.

## State flow
LISTED -> RESERVED -> CONVERTED
LISTED -> RESERVED -> EXPIRED -> PARTIAL_REFUND -> LISTED

Auction:
LISTED -> bids -> FINALIZE -> RESERVED -> CONVERTED or EXPIRED/RETURNED.

## MVP boundaries
- No homeowner PII on-chain.
- No lending or investment return.
- Lead commitment is marketplace utility/access, not yield staking.
- Owner confirmation is required to mark a lead converted.
- Dispute/arbitration, KYC gates, reputation scoring, server API and UI integration are follow-on work before production.
- This contract is not production-ready until clean build/tests, XPR testnet deployment evidence, permissions review and security review are complete.

## Required tests
- fixed listing and reservation
- auction minimum bid
- outbid refund
- auction finalization
- successful conversion sends commitment to treasury
- expired claim returns configured refund and relists lead
- early expiration rejected
- wrong token symbol rejected
- pause gate
