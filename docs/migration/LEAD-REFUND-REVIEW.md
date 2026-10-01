# L12 signed refund observations review

- Change ID: 2026-10-01-lead-refund-observations
- Repository: gcsc-platform
- Branch: codex/lead-refunds-20260930
- Base commit: `6eefeb02fad298a8ec78049441a9195198048935`
- Head commit: `980225e3023e742045ddb2a717faf93468ccd840`
- Author AI: CODEX, parent context
- Reviewer AI: CODEX, independent context `01a0edd5-92a1-7b42-ac8f-88094d6f5637`
- Author status: READY_FOR_REVIEW
- Reviewer decision: APPROVED for local integration of `980225e3` only
- Required checks: PASS, author and independent reviewer
- Unresolved P0/P1 findings: 0; initial P2 resolved by independent re-review
- Live-risk decision: BLOCKED
- Founder evidence: NOT_REQUESTED; local-only scope
- Deploy decision: BLOCKED

This record follows the legacy `C:/gcsc/ai-review/TEMPLATE.md` fields. The
canonical monorepo `AGENTS.md` permits a separate Codex context for independent
review; no Claude subscription or self-approval is substituted for that gate.
The candidate is dormant local code, not a completed payment product or L12.

## Scope

Observe already-succeeded test-mode `refund.created` and `refund.updated` facts
authenticated from original bytes by the installed SDK. Never initiate a refund,
call the provider, infer eligibility or promise that funds reached a bank account.
The pinned SDK Refund shape has no required `livemode` field; test mode is enforced
on the signed Event. Expanded or absent PaymentIntent/charge references and
non-succeeded statuses are rejected. Reference: [Refund object](https://docs.stripe.com/api/refunds/object)
and [event types](https://docs.stripe.com/api/events/types).

Only an existing unique PaymentIntent binding selects the purchase. Refund
metadata cannot select another buyer/project. An immutable refund-ID binding
stores allowlisted purchase, intent, charge, amount, currency and provider time.
The shared inbox retains global event-ID/digest replay protection. Intake never
changes access; all binding/inbox writes roll back on mismatch.

A single observed refund equal to the original quote atomically marks the exact
entitlement and purchase `refunded`, processes the event and appends audit. A
partial succeeded refund revokes that entitlement and holds an active purchase
for review; partial events are not summed into an inferred full refund. This is
conservative access suspension, not an approved refund policy or 50/50 economics.
Existing terminal purchases are not moved into the active-purchase unique index.

Refund facts already in the inbox prevent an initial paid grant in either worker
order. Later paid callbacks do not revive refunded/revoked access. A refund for
an older purchase cannot touch a different/replacement entitlement. Closed
projects and disabled identities do not prevent observing the exact refund.
The transaction uses the existing project/identity/grant/purchase lock order and
rechecks binding after waits. Grant, purchase, event outcome and audit are atomic.

## Changed Files

- `package.json`
- `services/api/v3/database/lead-checkout-events.cjs`
- `services/api/v3/database/lead-checkout-fulfillment.cjs`
- `services/api/v3/database/schema-statements.cjs`
- `tests/lead-checkout-events.test.cjs`
- `tests/lead-checkout-refunds.test.cjs`
- `tests/postgres-lead-checkout.integration.cjs`

The application API `pure-server.js` is unchanged, SHA-256
`f24fdd7d20a658b8d8e60d14b5fe5db8b1b56260269f8c7aa2a3577b5f68ff77`.
No new route, provider request, secret, user data, installation or external IO.

## Verification

Author commands ran in `C:/gcsc-platform/.worktrees/legacy-preservation` using
existing Node 25.9.0, PostgreSQL 18.4 and Stripe 17.7.0 on Windows. All people,
projects, prices, signatures and payment/refund events are synthetic. PostgreSQL
and the actual API HTTP assertions use disposable loopback resources only.

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Focused tests | `npm run test:lead-checkout` | 32/32, exit 0, repeated | Includes three new refund-verification tests |
| Root/static | `npm run check` | 37+12+11 tests and syntax/static PASS, exit 0 | Author run before freezing candidate |
| API regression | `npm run test:api` | 15 suites, 301/301, exit 0 | Existing deprecation/negative-fixture output only |
| PostgreSQL baseline | `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin` | 39/39, runner/test/PG exits 0 | `postgres-baseline-bLn8Ff/result.json` |
| PostgreSQL lead path | `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/legacy-preservation/services/api/v3` | Final61/61 twice, runner/test/PG exits 0 | `postgres-baseline-Dh5qk9` and `postgres-baseline-lcSzRa`; initial59/59 in `DacnJ8`/`rs5Btf` |
| Frozen diff | `git diff --cached --check` | exit 0 | Seven explicit paths in `5074617a`; two-file correction `980225e3` |

Evidence directories above are under the candidate's `services/api/v3/.tmp/`.
The PostgreSQL runner writes `result.json`, `test-output.log`, source hashes and
acceptance JSON. All recorded API/database hashes in `rs5Btf` were compared with
the frozen source after the interruption and matched.

The actual HTTP regression verifies private details return 404 before payment,
200 after local signed-event fulfillment, and 404 after full or partial refund.
A bid succeeds with 201 before refund; a new bid is then refused with 403
`project_access_required`, while the original bid remains stored. No browser,
provider checkout, real payment or external refund is claimed by this fixture.

Other coverage: queued/concurrent ordering, concurrent identical deliveries,
different event IDs for the same refund, metadata non-authority, unknown intent,
over-quote/pre-purchase amounts/times, refund/event rebind rejection, old versus
replacement purchase, actual observed entitlement-lock wait and recheck, injected
failure at all four transactional writes, no downgrade of full-refund state,
tampered stored refund binding, reconnect and idempotent migration.

Initial tests failed on unsupported refund handling before implementation. A
single timestamp captured for each signed fixture avoids second-boundary races;
focused32/32 and PostgreSQL59/59 were rerun after that test-only adjustment.

## Findings

| Severity | Finding | Owner | Status |
| --- | --- | --- | --- |
| P2 | Intake accepts limited future event time, but fulfillment permanently marked it `review_required`, leaving an existing paid entitlement active even after clocks catch up | Parent CODEX | FIXED in `980225e3`; independently verified |

Initial independent reviewer inspected all seven files in `6eefeb02..5074617a`,
ran focused32/32, root37+12+11/static and PostgreSQL59/59, all exits 0. Evidence:
`postgres-baseline-HOTN4Z/result.json`, manifest SHA-256
`d89aaafe2dc1e5ddc8a3efa7a1fe40a74e7d0275f1a33c5ddbd25ed82b9011c3`.
The reviewer reproduced the timing defect with the actual SDK/worker and a strict
DB stub. Decision was CHANGES_REQUESTED, not approval despite green tests.

## Resolution Log

- 2026-10-01 UTC: resumed the saved test work, verified durable result files,
  exact source hashes and staged scope; froze the seven-file candidate.
- Independent reviewer resumed with this new exact diff, not the previous gate.
- Reviewer stopped before author corrections; no shared source writer.
- New PostgreSQL regressions reproduced both future-refund and future-payment
  rejection failures: `nAmAxZ`, 59/61, runner/test exit 1; database stopped.
- Split impossible pre-purchase time from a not-yet-due event. The latter throws
  `lead_fulfillment_event_not_due`, rolls back, and leaves the original inbox
  `received` with unchanged purchase, entitlement, digest, timestamps and audit.
  A future worker must retry with bounded backoff, not finalize or busy-poll it.
- Parent final scope: focused32/32; root37+12+11/static0; PG61/61 twice in
  `Dh5qk9` and `lcSzRa`, runner/test/PG exits 0; full API15suites301/301, exit 0.
  New cases cover full/partial refunds, concurrent exactly-once retry and no
  early paid grant. Only the worker's single DB clock read is advanced through
  a fixture connection wrapper; PostgreSQL locks, rows, rollback and writes are
  real. No system clock or stored signed event is changed to manufacture a pass.
- Correction frozen in `980225e3023e742045ddb2a717faf93468ccd840`; the same
  independent reviewer resumed on the new exact diff and approved the full local
  seven-file scope, not only the correction. No new confirmed findings.

## Reviewer Notes

- Reviewer independently inspected the final diff: YES, exact `6eefeb02..980225e3`
- Reviewer independently ran required checks on final diff: YES
- Public/live/legal/payment boundary reviewed: YES; dormant local slice only
- Final rationale: initial P2 resolved; future events remain retryable without
  partial mutation, then full/partial refund applies once under concurrent retry.

Independent final commands: `npm run test:lead-checkout` 32/32; `npm run check`
37+12+11 and syntax/static; the same scoped PostgreSQL command above 61/61;
`git diff --check 6eefeb02fad298a8ec78049441a9195198048935 980225e3023e742045ddb2a717faf93468ccd840`.
All exits 0, including test and PostgreSQL. Final evidence:
`postgres-baseline-A1UX2C/result.json`, manifest SHA-256
`e42dfaa4adb999c8f75c88e706a1e4a6ad77d241c1549fb36cd12d23b53a6d27`.
Parent inspected the result/log and independently compared all recorded source
hashes with the frozen candidate. Reviewer reported clean source, database stopped
and port53677 closed; reviewer has been closed, no active delegated worker.

## Sign-off

Transcribed from independent reviewer `01a0edd5-92a1-7b42-ac8f-88094d6f5637`,
not an author self-approval:

- Reviewer decision: APPROVED
- Scope: full dormant refund slice, exact `6eefeb02..980225e3`, seven files
- Finding `clock-skew-P2`: fixed
- New findings: none
- Required checks: PASS
- Live-risk decision: BLOCKED
- Deploy decision: BLOCKED

`AI_REVIEW_GATE=PASS` applies only to this canonical monorepo local dormant
integration. It is not provider, reconciliation, L11/L12, production or main
release approval. No legacy Claude-only deploy-validator pass is claimed.

## Local Integration

After approval, publication fast-forwarded `6eefeb02 -> 980225e3` without source
changes. Every receiving API/database source hash matches independent evidence.
Receiving `npm run test:lead-checkout` passed32/32, exit0. The receiving command:

```powershell
node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/publication/services/api/v3
```

passed61/61 with runner/test/PG exits0. Evidence is now in publication:
`services/api/v3/.tmp/postgres-baseline-HaAWpm/result.json`. It includes the real
local API details/bid denial and the controlled-clock regression. All test
processes finished. No remote push, main merge, deploy or provider activation.
Documentation/checkpoint changes are a separate scoped commit.

## Remaining Gates

L11/L12 remain open. Unknown PaymentIntent refunds received before Checkout
binding are rejected before persistence; delivery retries, durable unresolved
observations and provider reconciliation are not implemented. Do not claim
arbitrary provider out-of-order delivery is handled.

Pending/failed/canceled refunds, later failure after a succeeded observation,
disputes, async payment events and held-event resolution need separate handling.
No automatic regrant or refund initiation is authorized. Consumers must read
current entitlement; a replayed `paid_granted` receipt is historical only.

Raw-body HTTP/rate limits, private purchase DTOs, provider creation-timeout
recovery and actual test-provider/browser acceptance remain open. L10 price,
contact disclosure, eligibility, support, terms and refund-policy decisions still
gate activation. Legacy escrow is separate. No push, main merge or deployment.
