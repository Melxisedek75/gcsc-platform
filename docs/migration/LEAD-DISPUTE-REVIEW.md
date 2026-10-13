# L12 signed dispute observations review

- Change ID: 2026-10-01-lead-dispute-observations
- Repository: gcsc-platform
- Branch: codex/lead-disputes-20261001
- Base commit: `194e477590e85a9bfeaadf1be1570208e4486890`
- Head commit: `a9479e9631b3e762b90819113ced7188b9452753`
- Author AI: CODEX, parent context
- Reviewer AI: CODEX, independent context `01a0edd5-92a1-7b42-ac8f-88094d6f5637`
- Author status: READY_FOR_REVIEW
- Reviewer decision: APPROVED for local integration of `a9479e96` only
- Required checks: PASS, author and independent reviewer
- Unresolved findings: none confirmed in the exact reviewed six-file diff
- Live-risk decision: BLOCKED
- Founder evidence: NOT_REQUESTED; local-only scope
- Deploy decision: BLOCKED

Template fields follow `C:/gcsc/ai-review/TEMPLATE.md`. Canonical monorepo
`AGENTS.md` allows a separate Codex context, not author self-approval. Previous
refund approval does not approve this new diff. L11/L12 remain incomplete.

## Scope

Observe original-byte, SDK-authenticated test-mode `charge.dispute.created`,
`charge.dispute.updated` and `charge.dispute.closed`. Existing unique PaymentIntent
binding selects the purchase; metadata has no authority. Immutable dispute-ID
binding includes the exact purchase, intent, charge, amount, currency and provider
creation time. Global event ID/body-digest replay protection remains shared with
Checkout and refund events. Intake changes no entitlement and stores no raw body,
reason, evidence, customer email, balance transactions or arbitrary metadata.

The worker locks and rechecks the stored quote/binding and atomically suspends
only the corresponding entitlement, holds an active purchase, records the event
and appends audit. Even `won`/closed observations remain held until a separately
verified reconciliation path exists. This is conservative local access behavior,
not an approved dispute policy or assertion of bank settlement. Full-refund state
is not downgraded; older disputes cannot affect replacement purchases/grants.
Queued disputes prevent an initial paid grant. Repeated paid events never restore
revoked access. No dispute creation, evidence submission or money movement.

Installed Stripe 17.7.0 status contract remains pinned. Reference:
[Dispute object](https://docs.stripe.com/api/disputes/object) and
[event types](https://docs.stripe.com/api/events/types). Current documentation
also lists `prevented`; it is not in the installed SDK contract and is rejected
here. Null/expanded references, unknown intents, amounts above the quote,
non-USD and unsupported statuses/events are rejected before persistence.
These omissions require separate reconciliation/delivery handling before
activation. Card-only Checkout policy is unchanged; no async method expansion.

## Changed Files

- `package.json`
- `services/api/v3/database/lead-checkout-events.cjs`
- `services/api/v3/database/lead-checkout-fulfillment.cjs`
- `services/api/v3/database/schema-statements.cjs`
- `tests/lead-checkout-disputes.test.cjs`
- `tests/postgres-lead-checkout.integration.cjs`

The refund intake tuple checks share a hard-coded fact-table configuration with
disputes; SQL identifiers cannot come from event metadata or a raw payload.
Refund regressions are included in the expanded suite. Migration adds a dispute
binding table and inbox allowlist/shape constraints using the existing repeatable
transactional migration, without a synthetic historical-event backfill.

`pure-server.js` is unchanged, SHA-256
`f24fdd7d20a658b8d8e60d14b5fe5db8b1b56260269f8c7aa2a3577b5f68ff77`.
No HTTP routes, provider activation, installation, real data or secret access.

## Author Verification

Commands in `C:/gcsc-platform/.worktrees/legacy-preservation`; existing Node
25.9.0, PostgreSQL 18.4 and Stripe 17.7.0 on Windows. All identities, quotes,
signatures and provider events are synthetic; real PostgreSQL and API HTTP
requests use disposable loopback resources, not an external payment service.

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Focused | `npm run test:lead-checkout` | 35/35, exit 0 | Three new dispute verification tests |
| Root/static | `npm run check` | 37+12+11, syntax/static PASS, exit 0 | Same required commands as reviewer |
| API regression | `npm run test:api` | 15 suites, 301/301, exit 0 | Existing deprecation/negative-fixture output |
| PG baseline | `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin` | 39/39, runner/test/PG exits 0 | `postgres-baseline-8tRqZ4/result.json` |
| PG lead path | Command below | 74/74, runner/test/PG exits 0 | `TrRdVt`, `1E265c`, `i20eS5` |
| Frozen diff | `git diff --cached --check` | exit 0 | Six explicit paths frozen as `a9479e96` |

```powershell
node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/legacy-preservation/services/api/v3
```

Evidence directories are under candidate `services/api/v3/.tmp/`, with prefix
`postgres-baseline-`. Each successful result includes source hashes and stopped
PostgreSQL status. Manifest SHA-256:
`617669a72278696c0c764f029a88b5c6f166438b31f6ed3641a8c0a6de3eb7d8`.

Tests first: focused dispute tests 1/3, exit 1; PostgreSQL 60/74, exit 1 in
`DT1p7w`, because dispute events were unsupported. No tests were weakened.
One subsequent run `f1jytS` failed before test execution: unchanged three-second
probe query timeout during `CREATE DATABASE gcsc_test_baseline`; test log empty,
database stopped with exit 0. It is NOT counted as a passing run. After API tests
finished, two sequential identical commands passed 74/74 (`1E265c`, `i20eS5`)
without timeout, environment or runner changes. This does not fix or conceal the
existing bounded runner setup sensitivity on a busy Windows machine.

Coverage includes migration/reconnect, allowlisted storage, all seven statuses,
won-first and out-of-order facts, queued/concurrent paid processing, identical
deliveries, global event/refund collisions, immutable tuple conflicts, metadata
non-authority, replacement grants, disabled identities/closed projects, observed
row-lock waits, four transactional failure points, full-refund monotonicity,
future-event retry and tampered binding. Clock fixtures replace only the worker's
single DB clock read; actual PostgreSQL locks, rows and writes remain real.

The actual local API regression checks all full-refund, partial-refund and dispute
scenarios: private details 404 before a grant, 200 after it, 404 after observation;
initial bid 201, later bid 403 `project_access_required`, original bid preserved.
This proves local API denial, not a browser/provider end-to-end checkout.

## Independent Review

The separate read-only reviewer inspected the full exact
`194e477590e85a9bfeaadf1be1570208e4486890..a9479e9631b3e762b90819113ced7188b9452753`
diff and returned APPROVED for local dormant integration, with no confirmed
defects. The review specifically covered PI/quote and immutable tuple binding,
the shared refund/dispute intake, lock order, rollback/replay, replacement and
full-refund preservation, no won/closed regrant, queued initial-grant prevention
and the absence of HTTP/provider activation.

Independent sequential commands: `npm run test:lead-checkout` 35/35,
`npm run check` 37+12+11 and syntax/static, and the same scoped PostgreSQL command
above 74/74. All exits 0. Own PG evidence: `postgres-baseline-cOHJe4/result.json`,
test/PG exits 0, manifest hash `617669a72278696c0c764f029a88b5c6f166438b31f6ed3641a8c0a6de3eb7d8`.
The parent read that result/log and independently compared all recorded API and
database source hashes with the frozen candidate; every hash matched.

| Source | SHA-256 verified before/after independent tests |
| --- | --- |
| events | `9e448bd619dcbec5d163b38f14134489df8cab0bd0bedaa38815257c4b73138b` |
| fulfillment | `29e488b32a03241c9068a803b94188f3a31b28a4872f19209875a85d011cf59d` |
| schema | `7bc6948d1a2fc4c1930bf3bfa22b478d84b59652cdadc355736a5ff14ba1ed7b` |

Reviewer confirmed unchanged HEAD, clean source, `git diff --check` exit 0,
PostgreSQL stopped with exit 0, port 58400 closed and no remaining owned test/PG
processes. Source/documents were not edited. Reviewer closed after the completed
report. No author self-approval or inherited refund-only approval was used.

## Sign-off

Transcribed from independent context `01a0edd5-92a1-7b42-ac8f-88094d6f5637`:

- Reviewer decision: APPROVED
- Scope: exact full six-file `194e4775..a9479e96` local dormant dispute slice
- New findings: none confirmed
- Required checks: PASS
- Live-risk decision: BLOCKED
- Deploy decision: BLOCKED

`AI_REVIEW_GATE=PASS` is limited to canonical local integration. It does not
approve a complete L12, provider delivery, HTTP activation, main or release.

## Local Integration

After independent approval, canonical publication fast-forwarded
`194e4775 -> a9479e96` without source changes. Receiving
`npm run test:lead-checkout` passed 35/35, exit 0. The receiving command:

```powershell
node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/publication/services/api/v3
```

passed 74/74, runner/test/PG exits 0. Evidence is under publication:
`services/api/v3/.tmp/postgres-baseline-NJ5pQW/result.json`. Every API/database
hash in both receiving and independent evidence matches the current source.
The receiving manifest hash differs because its declared root is publication:
`88a6e9ab5f7f94b5e3ea14756be83936243b124602dbf69cca15674330051532`.
All owned test processes finished, reviewer closed. Checkpoint/docs are separate
from the approved source commit. No remote push, main merge, deploy or activation.

## Remaining Gates

Unknown-PI/unbound deliveries, expanded/null references, amount/currency
differences, unsupported status and `funds_withdrawn`/`funds_reinstated` events,
provider reconciliation, pending/failed/canceled/later-failed refunds and held
event resolution remain open. No automatic regrant. Consumers must consult the
current entitlement and clear cached details after access loss; historical
receipts are not permissions and copied buyer data cannot be recalled.

Raw-body HTTP/auth/rate limits, private purchase DTO, bounded retry worker,
provider create-timeout recovery and actual test-provider/browser acceptance are
not implemented by this slice. Price/contact/eligibility/refund/provider terms
still require L10 decisions before activation. No push, main merge or deploy.
