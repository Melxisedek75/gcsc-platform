# L12 atomic lead fulfillment review

Date: 2026-09-30. Scope is a dormant local worker, not a complete payment product.

## Candidate and scope

- Base: `71243960` (reviewed intake plus coordination checkpoint).
- Candidate: `d7709d0298b8b459f9e10c5212cd697e930445f3` (six files).
- Worktree: `C:/gcsc-platform/.worktrees/legacy-preservation`.
- Branch: `codex/lead-fulfillment-20260930`, parent sole writer.
- New internal entrypoint: `database/lead-checkout-fulfillment.cjs`.
- No new HTTP route, provider request, API key, payment, deployment or refund.

## Decision contract

The worker accepts a stored inbox event ID only, never client-supplied paid flags,
identity, amount or redirect parameters. Intake now records the verified quote
and original purchase timestamp in an allowlisted snapshot. Existing inbox rows
are not backfilled with invented verification evidence: missing snapshots enter
reconciliation. The additive schema retains all existing rows.

Lock order is project, sorted owner/buyer identities, entitlement, purchase,
provider binding and event. Hints are rechecked after locking. A new paid grant
requires the stored test-mode event, exact quote/session/PaymentIntent, a pending
purchase, current published/open project without escrow and both currently active
roles. Existing grants, including revoked/refunded grants, are never overwritten.

Grant, purchase state, event outcome/timestamp and one minimal audit record commit
in the same transaction. Retrying the same event returns its stored outcome and
does not recreate access or an audit. Another paid event for the same binding
cannot double-grant. A stale expired event after a paid grant does not revoke it.

Closed/withdrawn projects, changed identities, quote/intent mismatches, missing
legacy evidence, unpaid completion and late payment enter `review_required`.
This conservative slice also quarantines a payment processed after the quote
expiry, even if its provider timestamp was timely; a reconciler must handle it.
Paid and expired facts already queued together reconcile in either processing
order. No automatic external refund, settlement or promise of reimbursement.

A verified expired unpaid session can expire a pending purchase. A later paid
event for that terminal purchase is recorded for review without moving it back
into the active-purchase unique index or displacing a replacement purchase.
Processed results are event-processing receipts, not current access DTOs; current
authorization must still read the entitlement and current user/project state.

## Author evidence

Environment: existing Node 25.9.0, PostgreSQL 18.4, installed Stripe 17.7.0, Windows.
All SDK signatures, people, projects, prices and grants are synthetic. No installs
or external network were used. Commands run from the candidate worktree.

- `npm run test:lead-checkout`: 29/29, exit 0.
- `npm run check`: root37/37, mobile-build12/12, wallet-restore11/11,
  API syntax/static PASS, exit 0.
- `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/legacy-preservation/services/api/v3`:
  initial missing-feature RED `nTmspA` 29/44; implementation `bw1BKj` 44/44.
  Added conflict-order regression RED `KcnqoW` 44/45 (granted despite already
  queued expired fact). Fixed by checking contradictory durable facts while
  holding the purchase lock; final `bKnvyF` 45/45, test/PG/runner exits 0.
- PG coverage includes actual observed lock waits, reconnect/schema rerun,
  concurrent replay, wrong buyer/project/quote/intent, no regrant after revoke,
  rollback injection at each of four writes, actual termination of the worker's
  disposable PostgreSQL connection before COMMIT and simulated lost acknowledgement
  after successful COMMIT. This is not OS/power-loss or external-provider evidence.
- `npm run test:api`: 15 suites, 301/301, exit 0. Existing URL parser deprecation
  and negative-fixture console output; no new failure.
- `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin`:
  baseline `7rWGpV`, 39/39, test/PostgreSQL/runner exits 0. Expected injected
  audit-failure output tests rollback rather than ignoring an error.
- `git diff --cached --check`: exit 0 before freezing candidate `d7709d02`.

Evidence paths are under the candidate's `services/api/v3/.tmp/` with the
`postgres-baseline-` prefix and `result.json` containing source hashes and exits.

## Independent gate

Independent read-only reviewer `01a0edd5-92a1-7b42-ac8f-88094d6f5637` inspected
all six files in exact `712439608a06549d55279b008868b26cf153171b` through
`d7709d0298b8b459f9e10c5212cd697e930445f3` plus surrounding API predicates and
lock order. No confirmed findings. Source hashes before/after matched; clean tree.

- `npm run test:lead-checkout`: 29/29, exit 0.
- `npm run check`: 37+12+11, syntax/static checks, exit 0.
- The same scoped PostgreSQL command: 45/45, runner/test/PG exits 0.
  `postgres-baseline-w26j8W/result.json`; PostgreSQL stopped, port49676 closed.
- `git diff --check 71243960 d7709d0298b8b459f9e10c5212cd697e930445f3`: exit 0.

Parent inspected independent evidence and verified every recorded API/database
source hash against the frozen candidate. Reviewer is closed; no active worker.

`AI_REVIEW_GATE=PASS` only for local dormant fulfillment integration. Not approval
for external provider activation, real payment, complete reconciliation or L12.

Publication fast-forwarded `71243960 -> d7709d02` after independent PASS without
runtime changes. Receiving `npm run test:lead-checkout` passed 29/29, exit 0.
Coordination/contract evidence is a separate docs checkpoint. No remote push,
main update, deployment or payment feature activation took place.

## Remaining work

L11/L12 remain open. Next slices: conservative async-failure/refund/dispute and
revocation contracts; reconciliation procedure for held events; bounded raw-body
HTTP adapter with authentication/rate limits/private DTOs and server-owned test
configuration; provider creation-timeout recovery; actual test-provider delivery
and browser acceptance. L10 price, contact disclosure, buyer limits, terms and
provider/legal decisions still gate real payments. No 50/50 auction refund policy
is imported into this fixed-price October path. Legacy escrow remains separate.
