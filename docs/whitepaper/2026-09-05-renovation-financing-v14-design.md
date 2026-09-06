# GCSC v1.4 Renovation Financing Design

**Status:** Approved product design, pending implementation-plan review.

**Scope:** Internal documentation and local demo-only technical foundation.

**Out of scope:** Real loans, real-money payouts, custody, escrow funding, lender decisions, regulated appraisals, production deployment, public website publication, provider onboarding, and wallet signatures.

## Objective

Make renovation financing the central future-facing GCSC workflow without representing GCSC as a lender, appraiser, escrow company, custodian, or money transmitter.

GCSC will structure a planned renovation into a lender-ready project package, produce AI decision-support outputs, collect milestone evidence, and create simulation-only draw-authorization records. A licensed lender, appraiser, inspector, escrow provider, or custodian remains responsible for every regulated or real-money decision.

## Product Position

GCSC turns a planned renovation into a structured, lender-ready, milestone-controlled construction project.

The platform supplies project data, contractor verification, evidence review, risk signals, audit records, and controlled workflow states. It does not promise financing, value appreciation, milestone acceptance, or payment release.

## User Workflow

1. A homeowner creates a property-improvement project with property data, scope, budget, schedule, plans, and supporting media.
2. The Renovation Valuation Agent produces preliminary current-value context, projected post-renovation value, estimated value uplift, risk range, and confidence range.
3. Verified contractors submit bids, schedules, materials needs, and milestone plans.
4. The Finance Package Agent creates a structured Renovation Finance Package.
5. A licensed lender may independently perform underwriting, appraisal, borrower qualification, and approval outside GCSC.
6. GCSC records a simulation-only funding plan and milestone draw schedule after an external approval is represented as a reviewed status.
7. A contractor submits evidence for each milestone.
8. The Milestone Evidence Agent assesses evidence and emits a recommendation with confidence, reason codes, and evidence references.
9. A human reviewer, inspector, or lender representative records the controlling decision.
10. The Draw Recommendation Agent records `eligible`, `needs_review`, or `blocked`; it never releases money.
11. The project closes only after final evidence, required human review, and an audit record.

## AI Components

### Renovation Valuation Agent

**Input:** Property characteristics, location, condition, renovation scope, planned area changes, budget, permitted public market data, and prior project outcomes where authorized.

**Output:** Current estimated value context, projected post-renovation value range, value-uplift estimate, uplift-to-cost ratio, risk range, confidence range, input provenance, and model limitations.

**Boundary:** It is a preliminary decision-support model. It is not a licensed appraisal, cannot guarantee market value, and cannot approve financing.

### Milestone Evidence Agent

**Input:** Milestone scope, before/after photos, videos, timestamps, invoices, receipts, inspection records, permit references, contractor statements, and homeowner confirmation.

**Output:** Evidence completeness, scope-match indicators, anomaly flags, confidence score, reason codes, and a recommendation.

**Boundary:** It cannot approve a draw by itself. Low confidence, dispute, missing evidence, regulated inspection requirements, or detected anomalies force `needs_review` or `blocked`.

### Draw Recommendation Agent

**Input:** Milestone state, approved draw schedule, AI evidence verdict, human/inspector/lender decision, dispute status, and compliance gate.

**Output:** `eligible`, `needs_review`, or `blocked`, plus the maximum simulated draw amount and reason codes.

**Boundary:** It produces an authorization record only. It cannot submit a payment, create a loan, interact with a wallet, or control escrow funds.

### Finance Package Agent

**Input:** Verified project, selected bid, contractor credentials, scope, valuation output, draw schedule, risk data, evidence requirements, and dispute framework.

**Output:** Versioned lender-ready package with data provenance and explicit disclaimers.

**Boundary:** It prepares a packet; it does not submit a loan application or represent approval by any bank, credit union, or provider.

## Smart Contract Design

Create a new future-facing `gcscrenovate` state contract. It replaces neither the existing `gcscrow1111` transfer-capable escrow contract nor any licensed provider flow.

### Contract Data

- Project identifier and versioned scope hash.
- Participant roles as opaque account references.
- Milestone sequence, capped simulated draw amount, and state.
- Evidence hash and evidence metadata digest.
- AI verdict digest, confidence band, and reason-code digest.
- Human/inspector/lender-review status.
- Draw-authorization status.
- Dispute-freeze status.
- Append-only audit event hash.

### Allowed Actions

- `createproject`
- `setscopehash`
- `addmilestone`
- `submitevidence`
- `recordaiverdict`
- `recordreview`
- `authorizedraw`
- `freezedispute`
- `resolvedispute`
- `closeproject`

### Explicitly Forbidden Actions

- Token deposits.
- Token transfers.
- Stablecoin settlement.
- Credit issuance.
- Interest calculation.
- Custody.
- Automatic release on AI score alone.
- Automatic release on contract state alone.

`authorizedraw` records a simulation-only authorization. A future licensed payment or escrow partner could consume such a record only after separate legal, provider, security, and production approvals.

## Application Design

Add local demo-only SmartContractor surfaces in this order:

1. Project intake and property-improvement scope.
2. Budget and milestone schedule builder.
3. AI valuation result with range, confidence, provenance, and disclaimer.
4. Contractor bid and verification summary.
5. Renovation Finance Package preview/export.
6. Milestone evidence submission and AI review result.
7. Human-review decision panel.
8. Draw recommendation board marked `Simulation only — no funds move`.
9. Immutable-style audit timeline.

No screen may use language such as “loan approved,” “funds released,” “guaranteed property value,” or “escrow funded” in the demo-only implementation.

## Whitepaper v1.4 Changes

Create a new internal `whitepaper-v1-4-renovation-financing-draft.md`; retain v1.3 and the published `whitepaper.html` unchanged.

The v1.4 draft must add:

- `Projected Post-Renovation Value`.
- `GCSC Renovation Finance Package`.
- The full lender-controlled milestone draw workflow.
- AI verification and mandatory human override conditions.
- Homeowner, contractor, and lender value propositions.
- Data-moat narrative based on before/during/after project data.
- Built, in-development, and long-term-vision separation.
- Legal and financial disclaimers.
- A v1.3-to-v1.4 changelog.

## Implementation Order

1. Write v1.4 internal whitepaper and changelog.
2. Add a claim register and validator preventing prohibited public or regulated claims.
3. Build pure local domain models and fixture-driven tests for valuation, evidence, package generation, and draw recommendations.
4. Implement `gcscrenovate` as a no-transfer state contract with unit and simulation tests.
5. Add demo-only API endpoints and UI screens behind explicit no-live-action guards.
6. Create review records and obtain independent code review before any merge.
7. Stop for founder/legal/provider approval before partner integrations, production deployment, public whitepaper replacement, real payments, loans, custody, escrow, or wallet signatures.

## Acceptance Criteria

- The v1.4 draft describes the lender-controlled renovation workflow accurately and contains the stated disclaimers.
- A machine-readable claim validator rejects prohibited statements and real-money language in demo-only surfaces.
- AI outputs include ranges, confidence, provenance, and reason codes.
- Every draw recommendation can be traced to milestone evidence, human review, and dispute/compliance status.
- `gcscrenovate` has no transfer, deposit, settlement, token, or loan actions.
- Unit tests prove that AI-only approval, unresolved disputes, missing human review, and missing evidence cannot create an `eligible` draw recommendation.
- The public `whitepaper.html` remains unchanged.

## Required Independent Review

Before merge, an independent reviewer must verify the no-transfer contract boundary, claim boundaries, state-transition tests, and the absence of public/live-action changes. The author cannot approve this work.
