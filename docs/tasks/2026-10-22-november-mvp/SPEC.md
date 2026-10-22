# November 2026 GCSC MVP: scope and acceptance

## Product boundary

The pilot has two roles and one complete loop. A homeowner can create an
account, confirm email, publish/edit/close a job, view bids and select a
contractor without pretending money moved. A contractor can create an account,
confirm email, submit genuine documents for human review, discover privacy-safe
jobs, obtain permitted access, submit one bid, and see its outcome. Both can
receive necessary notifications and reach support. Operator actions are audited.

WebAuth binds and logs in the chosen XPR Testnet account; wallet identity is
separate from app identity and a signable payment session. No automatic wallet
selection, silent rebroadcast, Mainnet transfer or cash-value claim. The Testnet
50 XPR receipt scenario is QA-only and cannot verify real documents or authorize
escrow. A free public pilot must not route users into that payment flow.

Two web surfaces: `apps/marketing` truthfully explains the current service and
links to the cabinet; `apps/web` provides the responsive owner, contractor and
operator workflows. Android is a parity client for the agreed core loop, not
a separate backend or ledger. A second website is not a second project database.

## Acceptance gates

| ID | Evidence required for the 2026-11-30 go/no-go |
| --- | --- |
| A1 Baseline | One candidate SHA and worktree; tracked requirements, API contract, source provenance; unrelated dirty work preserved; independent integration review. |
| A2 Identity | New owner and contractor registration, email delivery/confirmation/reset (including the currently unfinished Forgot password path), role isolation and session restart across devices. No dev OTP/fallback secret in release. |
| A3 Marketplace | Real owner job appears in contractor catalog with only allowed public fields; bid reaches the correct owner; accepted/rejected status is truthful; no duplicate or cross-owner leakage. |
| A4 Verification | Real files are stored privately and reviewed by an authorized human; pending/rejected/test-only never display as genuinely verified. QA samples cannot unlock public payments or selection. |
| A5 Wallet | Selected Testnet XPR account signs ownership challenge, survives sign-out/login and switches correctly on Pixel; mismatch/cancel/retry fail safely. No claim about Mainnet or Samsung without separate evidence. |
| A6 Payments | Public pilot has no live paid lead or escrow. If Testnet checkout is demonstrated, sender, recipient, amount, memo, chain and one entitlement are independently checked; no second transfer on uncertain outcome. |
| A7 Sites | Both sites use correct domains and working links, responsive desktop/mobile layout, keyboard/screen-reader checks, truthful claims, a contact form with a verified delivery endpoint and honest failure state, actual privacy/terms pages and analytics consent as applicable. A local success animation is not delivery. |
| A8 Operations | Production-like PostgreSQL migration/backup/restore, concurrent bid and entitlement tests with schema-level uniqueness or equivalent invariant, secrets separation, rate limits, logs/alerts, incident and rollback runbooks, monitored email, support and moderation ownership. |
| A9 Release | CI and preview E2E pass on exact SHA; independent security/product review findings closed or explicitly accepted by founder; deploy and public ads each have separate founder go/no-go. |
| A10 Traction | Report genuine funnel counts: visitors, confirmed owner signups, published jobs, contractor signups, qualified bids, owner responses, matches, and feedback, excluding staff/test records. First real job/contractor are targets, not fabricated release gates. |

No single percentage can certify readiness. The phrase "99% ready" may only mean
all agreed A1-A9 checks pass with zero unresolved launch-blocking findings and
remaining limitations named. It does not mean 99% of the broader roadmap or
99% probability of commercial success.

## Roles and separation of duties

| Role | Responsible for | Cannot approve alone |
| --- | --- | --- |
| Founder | Scope, pilot geography/company identity, budget, providers, legal advice, public go/no-go, real signatures. | Technical PASS without evidence. |
| Dot Melchizedek | Program coordination, owner-facing digest, decision queue, dependency tracking and authorized handoff to Codex. | Code merge, payments, production or account access beyond permissions. |
| Codex integrator | One candidate branch, API contract, implementation, focused tests, release evidence and checkpoint. | Own security/review gate. |
| Independent technical reviewer | Threats, auth/privacy/payment invariants, reproducible regression findings and exact-diff review. | Author's patch without independent verification. |
| Independent product reviewer | Two-role journey, real-user evidence, scope creep and truthfulness of claims. | Substitute simulated traction for users. |
| QA/release reviewer | Cross-device/browser/DB, negative cases, rollback and release matrix. | Production release or founder acceptance. |
| Legal/compliance professional | Entity, privacy/terms, construction marketplace and payment/ad claims where required. | Product engineering or user demand. |

The AI reviewers are adversarial to unsupported claims, not to each other. Each
records claim, evidence, strongest counterexample, discriminating test and
decision. A coordinator resolves disagreement by evidence or escalates a
business/legal tradeoff to founder; majority vote is not a release criterion.

## Founder decisions and escalation

Decisions needed before live cutover: D1 free-pilot scope versus paid leads;
D2 initial geography and legal operating entity; D3 email provider/sender;
D4 two domains and hosting owner; D5 privacy/terms/legal review; D6 ad channel,
budget cap and business verification; D7 production release approval. Prepare
options and a recommendation, but do not infer authorization from silence.

For a blocked decision, Dot sends one concise request: issue, affected
milestone, evidence, two viable choices, recommended choice, deadline and what
safe work continues. P0 privacy/security/financial incident is reported
immediately; routine progress is one daily digest and a weekly demo/status.
An unchanged blocker is not re-notified. If no safe tasks remain, checkpoint
and pause the scheduler. No claim of unattended 24/7 operation or guaranteed
notifications when a device, account or quota is unavailable.
