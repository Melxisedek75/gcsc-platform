# GCSC Lead Marketplace Simple MVP

Status: implementation candidate on codex/lead-marketplace-mvp-20261001.
Local validation: 73 contract tests pass, including 42 marketplace checks.
See VALIDATION-2026-10-01.md for evidence and remaining gates.

## Scope and settlement

Two lead acquisition modes: fixed-price reservation and timed auction.
Homeowner/job information stays off-chain; ref_hash is an opaque reference.
The ordinary application shows USD prices and refund amounts. The chain contract
accepts one explicitly configured settlement token and exact symbol/precision.
GCSC utility tokens are not a guaranteed-dollar settlement unit. Provider selection,
USD quoting, legal approval, account provisioning and API/UI integration remain pending.
The tests use a locally issued USD-symbol fixture; this is not a real dollar asset.

The settlement token contract and symbol cannot change after initialization.
A listing snapshots refund_bps, treasury and min_increment. Claims retain the
listing's refund policy and treasury through settlement, including subsequent relisting.
Config changes apply to new listings, not existing contractual terms.
Default unsuccessful-claim policy: 50% returned, 50% retained as access/reservation fee.
The UI must disclose those terms before the payment is signed.

## Payment interface change

The initial draft's public claimfixed and bid actions are replaced by a token
transfer notification. They do not appear in the new ABI. Internal claimFixed and
placeBid helpers cannot be invoked as ordinary contract actions.

For a fixed reservation, the contractor signs the configured token's transfer:
- from: contractor account
- to: gcscmarket11
- quantity: exact listing price
- memo: claim:<lead_id>

For an auction bid, sign the same token transfer with the full new bid amount
and memo bid:<lead_id>. The previous bid is refunded atomically.
The contract validates the notification sender, recipient, token symbol, amount,
memo, lead state and deadline. Failed validation reverts the token transfer.
No user permission delegation to gcscmarket11 is needed.

Reference: https://docs.xprnetwork.org/contract-sdk/notifications.html
Outgoing transfers use only the marketplace's own permission; that account needs
reviewed eosio.code authority before deployment.

No API/UI callers were part of the four-file initial marketplace PR. Future consumers
must construct these token transfers, not the old claimfixed/bid actions. This interface
change must receive independent financial/security review before integration.

## Public actions

| Action | Role |
|---|---|
| setconfig | Authorized admin/config initialization |
| listlead | Owner-authorized listing |
| finalize | Permissionless settlement of an ended auction with bids |
| confirmclose | Lead owner confirms conversion before the claim expires |
| expireclaim | Permissionless expiry, partial refund and relisting |
| pause | Admin pauses new listing/payment/finalization |

transfer is a notification handler from the configured token, not a standalone
funding action. Expired refunds remain available while paused.

## State flow

Fixed: LISTED -> RESERVED -> CONVERTED.
Unsuccessful claim: RESERVED -> PARTIAL_REFUND -> LISTED.
Auction: LISTED -> bids -> FINALIZE -> RESERVED -> CONVERTED or refund/relisting.
An auction with no bids currently rejects finalization; cancellation/relisting
for that case remains follow-on work.

Claims cannot convert at or after their deadline. Claim windows are at least one
hour. Timestamp additions and lead-id parsing reject overflow. Refunds round down
to the smallest settlement unit; the retained remainder conserves the total.
Lead owners and listing treasuries cannot acquire their own listings.

## Deployment and production boundaries

This revision adds fields to leads/claims tables and changes the payment ABI.
It must not replace a deployment containing old-format rows without a separately
reviewed migration. Use a fresh account/empty tables for authorized testnet evaluation,
or first design a compatible migration. No deployment was performed in this session.

Remaining gates:
- Independent review of the exact candidate commit.
- Confirm contract account permissions and configured settlement provider/token.
- Testnet deployment and actual signed transaction evidence.
- Server-authoritative lead validation, quotes, idempotency and transaction receipts.
- UI/API integration and real-device testing.
- Dispute/arbitration, eligibility, cancellation and operational procedures.
- Legal/provider/security approval before real-money or mainnet use.

The source/tests are locally implemented and tested. The product is not yet
deployed or production-ready, and this is not an independent professional audit.


## AI agent integration boundary

Founder requirement and execution plan:
../ai/GCSC-AI-AGENTS-VOICE-SPEC.md.

The application will offer a built-in assistant for both roles and supported
external-agent connections, including voice conversation and an optional avatar.
Matching, draft proposals/estimates and conversation-to-project stay off-chain.
These capabilities are planned; this contract does not implement them.

No mandatory AI/model/voice field is needed in the market ABI for owner-confirmed
payments. An agent prepares a payment; the contractor remains the signed actor.
Autonomous spending requires a separately reviewed delegation/budget design and
is not enabled by an API/MCP credential. Do not grant a model a user's signing key.
