# GCSC Whitepaper v1.4 Renovation Financing Changelog

Date: 2026-09-05 PT

Status: internal documentation change record. This file does not approve publication, production release, live finance, provider integration, or wallet activity.

## Status Change

Whitepaper v1.4 is a new internal draft derived from the v1.3 Construction Trust Infrastructure framing. It does not replace v1.3 and does not modify the public \`whitepaper.html\`.

## New Central Narrative

The central future-facing workflow is renovation finance preparation: GCSC structures a property-improvement project, contractor bid, preliminary value range, milestone plan, evidence record, AI recommendation, and human-review trail into a lender-ready package.

GCSC remains a decision-support and workflow platform. Licensed and qualified third parties retain responsibility for underwriting, appraisal, inspection, escrow, custody, payment, and compliance decisions.

## New AI Decision-Support Components

- Renovation Valuation Agent: preliminary value context, post-renovation range, confidence, provenance, and limitations.
- Milestone Evidence Agent: evidence completeness, scope match, anomaly indicators, confidence, and reason codes.
- Draw Recommendation Agent: \`eligible\`, \`needs_review\`, or \`blocked\` simulation outcome tied to evidence, human review, disputes, and compliance gates.
- Finance Package Agent: versioned project package, completeness checks, provenance, and disclaimers.

All agent outputs are advisory. None can independently approve a regulated action or move funds.

## New Future Smart Contract Boundary

The planned \`gcscrenovate\` contract is a no-transfer state and audit design. It may record project, milestone, evidence, AI-verdict, review, dispute, and simulation-only draw-authorization states.

It must not support deposits, token transfers, stablecoin settlement, credit issuance, interest calculation, custody, payment execution, or automatic disbursement.

## Priority Access Marketplace Added

The draft now distinguishes the homeowner's Project Opportunity, a contractor's
XPR-denominated Access Priority Offer, and the contractor's Work Proposal. A
planned bounded marketplace can award one time-limited exclusive access grant,
after which the contractor submits a proposal and the homeowner may accept,
reject, or request revision.

This is an internal specification only. It does not activate XPR payments or a
wallet flow. Anti-abuse, privacy, refund, legal, economic, security, and
production gates remain mandatory. The detailed design is recorded in
`docs/product/priority-access-marketplace.md`.

The intended marketplace economics now retain 100% of the access fee when the
contractor wins the project. A contractor who submits a compliant proposal but
is not selected receives a 50% refund, while 50% is retained as platform
revenue. Exceptional full-refund and policy-violation cases are separately
defined. Future approved settlement may use fiat-denominated rails, USDC, USDT,
or another permitted asset; XPR and future GCSC tokens remain utility, staking,
reward, and access candidates under separate token-economic and legal review.
XPR and XRP are explicitly treated as different assets and networks.

## Built / In Development / Long-Term Changes

- Built or existing: workflow and audit-oriented prototype capabilities are documented without a claim of live financial functionality.
- In development: internal v1.4 documentation, local domain models, fixture-based simulation, and a no-transfer state-contract design.
- Long-term: partner-powered underwriting, qualified valuation, licensed escrow and payment rails, and regulated digital infrastructure after required approvals.

## Claims Explicitly Not Added

v1.4 does not claim loan approval, appraisal licensing, value guarantees, real escrow, real custody, real payments, provider approval, public readiness, production readiness, wallet-signature authority, stablecoin settlement, token collateral, or a completed regulated integration.

## Public Publication Boundary

The v1.4 draft is internal. \`whitepaper.html\` remains unchanged and is not approved for replacement. Any future public wording, public-file replacement, provider outreach, legal representation, deployment, or live financial action requires separate review and explicit approvals.
