# November 2026 GCSC MVP: execution plan

Status: IN_PROGRESS. Target decision: 2026-11-30, not an automatic release.
Canonical candidate: `codex/wallet-reconcile-20261018` in the GCSC monorepo.
The older `CHECKLIST.md` remains the detailed backlog; this document orders
its open items around the limited pilot specified in SPEC.md.

## Critical path and dates (Pacific time)

| Window | Owner and dependency | Deliverable and exit evidence |
| --- | --- | --- |
| Oct 22-25: establish truth | Codex + independent technical/product reviewers; no new feature merge | Reconcile publication/mobile baseline and dirty state; classify L01-L25 as required/deferred/excluded; freeze free-pilot contract and API schema; decide D1-D4; record exact SHA, red tests and top risks. |
| Oct 26-Nov 1: identity and data | Backend/web/mobile + QA; requires frozen contract | Real email registration/verification/reset, role/JWT guards, PostgreSQL migrations, private document storage and human review; negative auth/privacy tests. No QA sample accepted as real. |
| Nov 2-8: core two-sided loop | Backend/web/mobile + QA; requires identity/data | Owner publish/edit/close, privacy-safe contractor catalog, permitted access, bid, owner review/status, notifications; repeatable same-DB E2E with two fresh accounts. Testnet wallet bind/login/switch/cancel on Pixel. |
| Nov 9-15: public surfaces | Web/marketing + product reviewer; requires working loop | Responsive cabinet and presentation site, truthful content, first-visit usability, operator support flow, privacy/terms draft, accessibility, mobile core parity. Start direct owner/contractor interviews and manual recruiting now, not after code completion. |
| Nov 16-22: pilot operations | QA/release + founder; requires site and flow | Production-like deployment rehearsals, backup/restore, logging/alerts, incident and rollback exercise, domain/email checks, independent review, approved copy and real-user pilot feedback. Draft ads but no spend. |
| Nov 23-27: candidate | Codex + separate reviewers; requires all A1-A8 | Exact-SHA CI/PG/browser/device E2E, security/privacy regression, performance/accessibility checks, zero P0/P1, documented limitations, staged release package and founder go/no-go request. |
| Nov 28-30: controlled launch | Founder + operator + Codex; requires explicit approvals | Deploy only approved scope; verify live owner/contractor journeys and support monitoring; launch only approved ads with capped budget; report real funnel. If a gate fails, remain private/pilot and report the truth. |

Work streams can overlap only with disjoint writers and a frozen shared API
contract. Every week ends with a demo of a real user journey and a stop/go
review, not a percentage based on number of tickets closed.

## Ordered work queue

1. N0a: inspect live branches, incomplete mobile QA changes and independent
   findings. Preserve all user changes. Publish a concise release-risk ledger.
   Investigate the fake-success Contact form, footer policy links, and unfinished
   password reset before any campaign or public signup claim.
2. N0b: map each A1-A9 criterion to existing L-items, code owner, exact test,
   environment, and missing founder decision. Remove no historical evidence.
   Initial mapping is in ACCEPTANCE-MAP.md; revise it when code evidence changes.
3. N1: repair QA-only verification ambiguity and the reviewer findings before
   any additional Testnet payment or APK handoff. Run focused API/mobile tests,
   PostgreSQL concurrency checks, then complete build/device verification.
   Test-only labels must remain visible. Never repeat a transfer to test retry.
4. N2: wire the smallest full owner/contractor web+API+DB journey and email
   delivery/reset; prove one shared data source rather than separate local
   accounts. Owner-side viewing and decision must be checked without implying
   escrow or payout when no money moved.
5. N3: repeat WebAuth selected-account and cancellation tests on real device;
   do not equate wallet profile text with a valid signed session.
6. N4: ship the two public-facing surfaces only after product claims, privacy,
   support and rollback reviews. Keep finance/DAO future features clearly future.
7. N5: recruit users, launch a small measurable pilot and only then approved
   advertising. Iterate from real friction, not imagined feature requests.

## Autonomous operating loop

- Dot tracks this plan and the single checkpoint `docs/migration/ACTIVE-TASK.json`;
  Codex owns implementation in this branch. Dot can inspect and send an
  authorized next task but does not write into Codex's active worktree.
- Codex takes the highest-priority dependency-ready safe item, writes a scoped
  INTENT/SPEC/PLAN for substantial changes, tests it, records evidence, then
  takes the next item. Reviewers are read-only or isolated writers.
- On each scheduled wake, read the checkpoint and `git status`; if another
  writer is active, do independent read-only work or stop. Do not start a
  duplicate agent just to maintain activity. No repeated two-minute polling.
- Record status at meaningful transitions; Dot prepares a daily Pacific-time
  digest and weekly investor-demo readiness update. Notify immediately only
  for a verified P0, a lost payment/identity risk or a founder-only gate.
- When a lane is blocked, record evidence and resume condition and work a
  different safe lane. If all lanes are blocked, pause the schedule and report
  once. Founder pause or quota exhaustion takes precedence.

## Current first step

N0a is underway. Two independent read-only reviewers were dispatched on
2026-10-22 for technical/release and product/growth scrutiny. The third
autonomy audit agent could not start because the agent thread limit was reached;
the integrator performs that audit. Their findings must be reconciled before
marking N0 complete. No new production feature, ad, payment or deploy has been
authorized by this planning step.

The existing Codex heartbeat was retargeted to this candidate and activated
on 2026-10-22, with a one-hour recurrence and expiry/stop conditions in its
prompt. The Dot handoff is prepared but has not been delivered or confirmed.
