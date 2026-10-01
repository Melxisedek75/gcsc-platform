# L12 bound-inbox retry review

- Change ID: 2026-10-01-lead-bound-retry
- Repository: gcsc-platform
- Branch: codex/lead-retry-20261001
- Base commit: `a10f91442091c712b62b02c7291f06adbd17bc61`
- Head commit: `e98c08391cbd109d62add6d8abd8efd24a9b4110`
- Author AI: CODEX, parent context
- Reviewer AI: CODEX, independent context `01a0edd5-92a1-7b42-ac8f-88094d6f5637`
- Author status: READY_FOR_REVIEW
- Reviewer decision: APPROVED for local dormant retry after P2 repair
- Required checks: PASS, author and independent reviewer
- Unresolved findings: none confirmed in the final diff
- Live-risk decision: BLOCKED
- Founder evidence: NOT_REQUESTED; local-only scope
- Deploy decision: BLOCKED

Record follows `C:/gcsc/ai-review/TEMPLATE.md`. The independent reviewer
checked both the original candidate and exact repair, not just a prior slice.

## Scope and contract

`sweepDueLeadCheckoutEvents(pool, options)` is a dormant, explicitly invoked
batch over the already bound, signed-test inbox. It selects only `received`
facts whose provider timestamp is due by the PostgreSQL clock. It never
ingests an event, promotes the unknown-PI quarantine, chooses a purchase from
metadata, starts a scheduler, contacts a provider or exposes an HTTP route.
It delegates all entitlement/purchase changes to the existing atomic
`fulfillLeadCheckoutEvent` worker.

The optional event-ID selection is validated and parameterized; each batch
is limited to 1..50. PostgreSQL stores event ID, attempts, ready/parked state,
next time, 30-second lease, UUID fencing token and allowlisted error kind,
not raw body, contact or provider metadata. A future event is not selected;
`lead_fulfillment_event_not_due` remains retryable if encountered. Temporary
DB/connection errors back off with a five-attempt cap. Unexpected errors
park for manual investigation. A recovered connection cannot permanently
park a valid paid event on its first failure. An expired worker cannot write
over a newer lease. A lost fulfillment COMMIT acknowledgement is checked
against committed event status before scheduling another attempt.

This is not exactly-once execution of arbitrary side effects: the existing
fulfillment transaction and event/audit idempotency provide the current
DB-only safety. A future deployment runner needs explicit operations policy,
monitoring and review. Parked events require manual handling; this module
does not automatically unpark or infer that a charge should be repeated.

## Verification

Commands ran from `C:/gcsc-platform/.worktrees/legacy-preservation` unless
noted. All PG fixtures are synthetic on disposable loopback PostgreSQL 18.4.

| Check | Final result | Evidence |
| --- | --- | --- |
| `npm run test:lead-checkout` | 37/37, exit 0 | Author and reviewer |
| `npm run check` | 37+12+11, static/syntax exit 0 | Author and reviewer |
| `npm run test:api` | 15 suites, 301/301, exit 0 | Author; earlier 300/301 WebAuth timeout not counted PASS |
| PG baseline runner | 39/39, test/PG exits 0 | `postgres-baseline-ZmliCd/result.json` |
| PG lead runner (below) | 93/93, test/PG exits 0 | Author `KZkCQx`, reviewer `Lp1VBU` |
| Receiving focused and PG lead | 37/37 and 93/93, test/PG exits 0 | Publication `postgres-baseline-DZdIOa/result.json` |

```powershell
node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/legacy-preservation/services/api/v3
```

Tests first: missing implementation failed; stale-lease regression failed
91/92 (`NfWUND`), then passed 92/92 (`HlroPR`). The reviewer found a P2:
`ECONNRESET` after claim parked an event permanently. The new recovered-DB
regression failed 92/93 (`jvpEFa`); the exact repair `e98c0839` passed
93/93 (`KZkCQx`). Reviewer independently repeated 93/93 (`Lp1VBU`), focused
and root checks and APPROVED the final `a10f9144..e98c0839` diff. No test
thresholds, mandatory checks or production clock guards were weakened.

The receiving publication snapshot recorded the same ten API/database file
SHA-256 values as the review snapshot, including retry module
`403c61f043289068b929fc14b8c64f2729ff193ebe540affa4bf1326e53226a9`.
Manifest digest differs only by source-root path. `pure-server.js` remains
`f24fdd7d20a658b8d8e60d14b5fe5db8b1b56260269f8c7aa2a3577b5f68ff77`.
No push, deploy, provider IO or real payments were performed.

## Remaining gates

Unknown-PI quarantine promotion, held-purchase reconciliation, supported
refund/dispute lifecycle, private authenticated purchase DTO, bounded HTTP
intake, provider timeout recovery and test-provider/browser acceptance remain
open. L11/L12 are not complete and this review is not release approval.
