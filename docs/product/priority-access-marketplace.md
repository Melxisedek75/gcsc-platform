# Priority Access Marketplace

Date: 2026-09-15 PT

Status: internal product and architecture specification. This document does not
authorize a live XPR payment, wallet signature, public launch, smart-contract
deployment, or production release.

## Product Decision

SmartContractor will distinguish three different objects:

1. **Project Opportunity** - a homeowner's construction project.
2. **Access Priority Offer** - a contractor's XPR-denominated offer for a
   time-limited exclusive opportunity to inspect the full project and prepare a
   proposal.
3. **Work Proposal** - the contractor's scope, price, schedule, materials, and
   milestones submitted to the homeowner.

An Access Priority Offer is not the contractor's price for the construction
work. The UI, API, records, and whitepaper must never label both objects as a
`bid`.

## User Journey

1. A homeowner publishes a Project Opportunity.
2. Eligible verified contractors see an anonymized preview: trade, broad
   service area, budget range, desired timing, project size, and required
   credentials. Exact address, contact details, and sensitive evidence remain
   hidden.
3. Contractors submit Access Priority Offers during a short, declared round.
4. After verified payment and round finalization, the highest valid offer gets
   one exclusive access window. No second contractor can unlock the full record
   during that window.
5. The holder reviews the project and submits a complete Work Proposal before
   the deadline.
6. The homeowner accepts, rejects, or requests a revision. Acceptance closes
   the marketplace opportunity and starts the normal contract workflow.
7. Rejection or expiry reopens a new access round. The next contractor purchases
   a new access right; an earlier fee does not purchase the construction job.

## Recommended Pilot Policy

- Access windows: 1, 4, or 12 hours; maximum 12 hours in the pilot.
- One active access grant per project and one active grant per contractor.
- The offer amount can determine priority; duration is selected from a bounded
  tier before the round starts and cannot be extended after winning.
- When the contractor submits a complete, policy-compliant Work Proposal but
  the homeowner does not award that contractor the project, 50% of the verified
  access fee is returned and 50% is retained as platform revenue.
- When the homeowner awards the project to that contractor, 100% of the access
  fee is retained as platform revenue. The access fee remains separate from the
  construction contract price, escrow, and milestone payments.
- Full refunds remain possible when access was never delivered because of
  homeowner cancellation, duplicate settlement, platform failure, invalid
  project data, or proven abuse. A contractor who receives access but submits no
  compliant proposal, violates policy, or abandons the window is not
  automatically entitled to the 50% unsuccessful-proposal refund.
- The homeowner receives no share of access fees in the pilot. This removes an
  incentive to reject valid proposals merely to trigger another paid round.
- Every rejection needs a reason code. Repeated reopenings trigger moderation;
  the platform can pause the opportunity and refund affected grants.
- Payment amount, duration, network, recipient, memo, policy version, expiry,
  and idempotency key are shown before wallet approval.
- No contact information is exposed before an active grant. Initial contact can
  use platform chat so personal details remain controlled.

The platform-revenue destination, refund reserves, limits, tax treatment, and
consumer disclosures remain founder/legal/economic decisions before any live
pilot. The 50/50 unsuccessful-proposal split is the intended product policy but
must be validated against those requirements before activation.

## Settlement and Utility Asset Direction

The prototype may express an Access Priority Offer in XPR for testnet and wallet
integration work. A future production marketplace may settle access fees and
construction payments in permitted fiat-denominated rails, USDC, USDT, or other
approved assets only after legal, provider, treasury, custody, accounting, and
security review.

XPR and future GCSC ecosystem tokens are intended as platform utility assets:
access incentives, reputation or membership benefits, staking, rewards, and
other protocol participation defined by approved token economics. They must not
be described as guaranteed investments, guaranteed yield, or technically
required network gas unless the deployed protocol actually enforces that role.
XPR Network's XPR token is distinct from XRP and the XRP Ledger; product copy,
wallet prompts, and accounting records must not interchange those names.

## State Model

Project states:

`draft -> open_preview -> access_round -> exclusive_access -> proposal_review`

Terminal or repeat transitions:

- `proposal_review -> awarded`
- `proposal_review -> reopened -> access_round`
- `exclusive_access -> reopened` when the window expires without a proposal
- any eligible state -> `cancelled` or `moderation_hold`

Access-round states:

`scheduled -> bidding -> finalized -> active -> proposal_submitted`

Alternative endings are `expired`, `rejected`, `refunded`, and `closed`.

## Data and API Boundary

Planned records:

- `project_opportunities`
- `lead_access_rounds`
- `lead_access_offers`
- `lead_access_grants`
- `lead_access_settlements`
- `work_proposals`
- append-only `marketplace_audit_events`

Planned API capabilities:

- read an anonymized opportunity preview;
- create an access offer and obtain a versioned payment challenge;
- verify and reconcile an XPR receipt idempotently;
- finalize a round and issue exactly one access grant;
- authorize full-project reads only for the active grant holder;
- submit one versioned Work Proposal;
- accept, reject, or request revision as the owning homeowner;
- expire and reopen rounds with auditable reason codes.
- calculate the deterministic 100/0 or 50/50 settlement outcome and execute it
  only through an approved, idempotent settlement provider.

The first implementation should use the canonical backend state machine plus
verified on-chain payment receipts. A new transfer-capable smart contract is not
required for the first safe prototype. A dedicated on-chain marketplace contract
may be considered only after economics, privacy, refund behavior, legal status,
abuse controls, and security review are complete.

## Required Controls

- verified contractor identity, eligibility, license/compliance, and role;
- homeowner ownership authorization for every project transition;
- server-authoritative clocks and transactional single-winner finalization;
- no double grant, replay, duplicate callback, or account/network substitution;
- rate limits, offer caps, contractor cooldowns, and anti-collusion monitoring;
- immutable policy version and audit trail for every payment and state change;
- clear separation between access fee, work price, escrow, and later milestone
  payments;
- privacy-safe previews and least-privilege access to full project data;
- operator freeze/refund path for disputes and platform failures.

## Acceptance Before Pilot

- Concurrent offers prove that exactly one contractor receives access.
- Web and Android show identical amount, duration, recipient, network, memo, and
  expiry before a user-controlled signature.
- Expiry and homeowner rejection reopen the project exactly once.
- Acceptance prevents further access sales and preserves the accepted proposal.
- Refund and duplicate-callback tests pass against the canonical PostgreSQL
  database and verified chain-receipt fixture.
- Awarded proposals retain 100% as platform revenue; compliant but unsuccessful
  proposals produce exactly one 50% refund and one 50% platform allocation.
- Security review covers authorization, privacy, auction manipulation, replay,
  race conditions, refunds, and denial-of-service behavior.
- Legal/economic review approves disclosures, fee treatment, and operating
  limits before real XPR is accepted.

## Product Name

`SmartContractor` remains the current product name in code and documentation.
`Leviton` is recorded only as a founder-proposed Android market name. It must not
replace the current name until trademark, app-store, domain, and brand review are
complete.
