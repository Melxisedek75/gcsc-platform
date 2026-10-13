# L12 unbound negative observations review

- Change ID: 2026-10-01-lead-unbound-observations
- Repository: gcsc-platform
- Branch: codex/lead-unbound-events-20261001
- Base commit: `ab00b5ed5829554f8fe3ed8e21949c67dbead3cd`
- Head commit: `91e494c99ecd54842499fd155f0e1bc781cd01ac`
- Author AI: CODEX, parent context
- Reviewer AI: CODEX, independent context `01a0edd5-92a1-7b42-ac8f-88094d6f5637`
- Author status: READY_FOR_REVIEW
- Reviewer decision: APPROVED for local quarantine `a4b3da1e` and test-only follow-up `91e494c9`
- Required checks: PASS, author and independent reviewer
- Unresolved findings: none confirmed in the exact reviewed four-file diff
- Live-risk decision: BLOCKED
- Founder evidence: NOT_REQUESTED; local-only scope
- Deploy decision: BLOCKED

Record follows fields in `C:/gcsc/ai-review/TEMPLATE.md`; canonical monorepo
`AGENTS.md` permits a separate Codex context for independent review. No inherited
dispute approval or self-approval applies to this new four-file candidate.

## Scope

Supported SDK-authenticated test refund/dispute observations whose PaymentIntent
has no local purchase binding are now retained in `project_access_unbound_events`.
Before this slice they were rejected without persistence. Neither metadata nor
the mere existence of an account-wide negative observation chooses a purchase.
Raw bodies, arbitrary metadata, evidence, customer contacts, headers and secrets
are not stored. No HTTP/provider connection or money movement is introduced.

Stored fields are constrained event ID/type/test mode, configured API version,
provider time, raw-body digest, PI/object/charge references, USD amount, object
creation time, nullable dispute status and local receipt time. Only already
supported succeeded-refund and seven-status dispute shapes pass existing signature
and payload validation. Unsupported events/currencies/statuses still fail closed.

An unknown-PI event returns internal `unbound`; duplicates return the same state
even if a Checkout binding appears later. It does not become a bound inbox fact,
choose a quote or issue/revoke an entitlement automatically. Promotion, evidence
verification, held-purchase resolution and scheduling remain separate work.

## Concurrency Contract

All current intake paths acquire a transaction-scoped event-ID advisory lock
before touching either inbox. Exact digest replay is idempotent; a changed body
conflicts, including cross-kind and cross-table concurrent collisions. Bound
inbox and quarantine cannot both accept the same ID through this trusted writer.
This is not a cross-table SQL UNIQUE constraint against arbitrary direct writes.
Any future promoter/writer must adopt the same lock and recheck both tables.

An intake classified as unknown acquires its PI advisory lock, inserts the
allowlisted quarantine and commits without taking any purchase lock under it.
Initial grant processing follows the established project/identity/grant/purchase
order, then acquires that PI lock and rechecks quarantine before deciding. A
previously committed or currently committing quarantine prevents the initial
grant for that PI: event/pending purchase require review, outcome
`unbound_negative_event`. Unrelated and replacement PIs are unaffected.

If initial grant processing commits first, this slice does not retrospectively
resolve the later quarantined observation or infer an access revocation. That
case still needs the separately gated reconciliation path. Known-PI event
processing retains the existing quote/tuple checks and refund/dispute behavior.

## Changed Files

- `services/api/v3/database/lead-checkout-events.cjs`
- `services/api/v3/database/lead-checkout-fulfillment.cjs`
- `services/api/v3/database/schema-statements.cjs`
- `tests/postgres-lead-checkout.integration.cjs`

`pure-server.js` remains unchanged at SHA-256
`f24fdd7d20a658b8d8e60d14b5fe5db8b1b56260269f8c7aa2a3577b5f68ff77`.
No dependency, provider, price, card-only Checkout policy or external IO change.

## Author Verification

Existing Windows Node 25.9.0, PostgreSQL 18.4 and Stripe 17.7.0. All provider
events/signatures, identities, quotes and projects are synthetic. PostgreSQL
connections and existing actual-API assertions are disposable loopback tests.
Commands below ran from `C:/gcsc-platform/.worktrees/legacy-preservation`.

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Focused | `npm run test:lead-checkout` | 35/35, exit 0 | Existing signature/body/negative-shape and runner guards |
| Root/static | `npm run check` | 37+12+11, syntax/static PASS, exit 0 | No CLI bypasses |
| API regression | `npm run test:api` | 15 suites, 301/301, exit 0 | Existing fixture/deprecation output only |
| PG baseline | `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin` | 39/39, runner/test/PG exits 0 | `postgres-baseline-SaIn1Y/result.json` |
| PG lead path | Command below | Final83/83 twice, runner/test/PG exits 0 | `ZFZPgB`, `AnoKgy` |
| Frozen diff | `git diff --cached --check` | exit 0 | Four explicit paths, frozen `a4b3da1e` |

```powershell
node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/legacy-preservation/services/api/v3
```

All PG evidence is in candidate `services/api/v3/.tmp/postgres-baseline-*/`.
Tests first: `c1LLYO` was 74/82, exit 1, eight new cases failed on missing unbound
handling. Two old unknown-PI rejection assertions were replaced by positive
quarantine/non-authority tests; known-PI quote/time rejection remains enforced.
Implementation initially passed82/82 twice (`Wab1Mz`, `uoGyfO`). Added a ninth
case for lost COMMIT acknowledgement; final source/tests passed83/83 twice.
All database processes stopped with exit 0, including the initial red run.

The final PG manifest is
`c450c9b90e1bdb07c92c24703e43c02dd24e0a25651e0ac76b67be4546e831f1`.
Parent inspected both final result files and compared every recorded API/database
hash with frozen source; all match. No source edits during independent review.

New coverage: allowlisted persistence and no inferred binding/grant; reconnect
and migration rerun; six concurrent deliveries; changed-body replay; foreign
metadata and exact-PI grant blocking; cross-table IDs in both orders/concurrently;
cross-kind collision; rejected live/connected/unsigned facts; actual observed
lock wait before grant; insert rollback; lost successful COMMIT acknowledgement
and exact retry over a new connection; over-quote quarantine without an inferred
refund; no impact on a new purchase with another PI. Existing bound refund,
dispute, future-clock, authorization and actual API denial regressions still pass.

## Independent Review

The separate read-only reviewer inspected exact
`ab00b5ed5829554f8fe3ed8e21949c67dbead3cd..a4b3da1e5410c3d60d546392d91f6b3d6e7e4a53`
and returned APPROVED for this four-file dormant quarantine slice, with no
confirmed defects. This is a new review, not the previous dispute approval.

Independent sequential commands: `npm run test:lead-checkout` 35/35,
`npm run check` 37+12+11 and syntax/static, and the scoped PG command above 83/83;
all exits 0. Own evidence: `postgres-baseline-9ouNLY/result.json`, test/PG exits0,
manifest `c450c9b90e1bdb07c92c24703e43c02dd24e0a25651e0ac76b67be4546e831f1`.
The parent read the result/log and compared all API/database source hashes with
the frozen source, plus the reviewer's test hash. All matched.

| File | Reviewer before/after SHA-256 |
| --- | --- |
| events | `6a75fc8e9c1c18a755b193644c0660de5272a61b980c4795181ccf3ae798ee77` |
| fulfillment | `b9b062432bb6c3bd8f98f855fc8d5b0fe26a31f4f4d4e0d04173bea4b4c9cb87` |
| schema | `fcde62df24b98a83641e2be6492e2d0647f6020617eec4520fd3ad50ed37ba6a` |
| PG tests | `e9da040629ed34cec53406c51fe945e849d946276a88b34b634aead0ccd10f1f` |

Review covered allowlisting, cross-table/cross-kind collisions, event/PI/purchase
lock order, post-wait reads, rollback, lost COMMIT acknowledgement, no replay
promotion and preserved known-PI validation. Reviewer confirmed unchanged HEAD,
clean source, diff check exit0, PG stopped0, port58027 closed and no remaining
owned test/PG process. Reviewer closed after reporting; no source/docs edits.

## Sign-off

Transcribed from independent context `01a0edd5-92a1-7b42-ac8f-88094d6f5637`:

- Reviewer decision: APPROVED
- Scope: exact four-file `ab00b5ed..a4b3da1e`, dormant local quarantine only
- New confirmed findings: none
- Required checks: PASS
- Live-risk decision: BLOCKED
- Deploy decision: BLOCKED

`AI_REVIEW_GATE=PASS` applies only to local canonical integration. It does not
approve cross-table SQL uniqueness, a promoter, reconciliation, scheduler,
HTTP/provider activation, actual delivery, complete L12, main or production.

## Receiving Failure and Test Repair

After approved `a4b3da1e` fast-forwarded into publication, focused35/35 passed,
but receiving PG `6Nw04u` failed82/83 (test1, PG0). The refund rollback test
started from `review_required`, not `paid`. This run is not a receiving PASS.

A read-only SELECT using single-user mode on that already-stopped disposable
cluster, with no network listener, exited0 and showed the unexpected checkout
event at Unix1790832988 before its purchase `2026-10-01T05:36:29.000574Z`.
The stored outcome was `invalid_event_time`. The synthetic builder sampled
Node Date.now independently of the PostgreSQL creation timestamp, at a second
boundary. Production correctly held the impossible pre-purchase event.

Test-only repair `91e494c99ecd54842499fd155f0e1bc781cd01ac` over `a4b3da1e`
uses the later of sampled Node seconds and the known reservation seconds for
synthetic post-purchase paid/refund/dispute observations. Explicit invalid/future
timestamp overrides are unchanged. The refund rollback test now asserts its
initial `paid_granted` setup before injecting failures.

A deterministic regression mocks Date.now to one millisecond before the purchase
second while building all three facts synchronously, restores it in finally
before any IO, then checks timestamps and actual PG paid fulfillment. It failed
83/84 before the helper repair (`9QhtLa`, test1/PG0). Final candidate passed84/84
twice sequentially (`y6WTCf`, `PjXd0q`, runner/test/PG0), focused35/35 and root
37+12+11/static0. Neither product time validation nor runner timeouts changed.
All API/database hashes and candidate manifest remain exactly as reviewed above;
final test SHA-256 is
`af4725a92065fc25ca1663e2d12984d670042f74e7a20b3a639d590c80679928`.
Baseline39/39 and API301/301 evidence above is reused for unchanged runtime.

The independent reviewer was resumed read-only for exact
`a4b3da1e..91e494c9` and separately returned APPROVED, no confirmed findings.
Independent focused35/35, root37+12+11/static0 and PG84/84 all exited0;
own evidence `postgres-baseline-tnuAun/result.json`, test/PG0. Parent inspected
the result/log and verified all runtime hashes and the final test hash above.
Reviewer confirmed unchanged HEAD, clean tree, port59314 closed and no owned
test/PG process, then was closed. This is a separate test-repair sign-off,
not a silent extension of the prior approval. `AI_REVIEW_GATE=PASS` applies to
the combined exact local candidate `91e494c9`; all live/deploy gates remain.

## Local Integration

Approved exact commits were fast-forwarded in publication:
`ab00b5ed -> a4b3da1e -> 91e494c9`. The first receiving failure above was
repaired through a separately reviewed commit, not hidden by an unchanged rerun.
Receiving focused35/35 passed on `a4b3da1e`; its runtime remained byte-identical
through the test-only repair. Final receiving command from publication:

```powershell
node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/publication/services/api/v3
```

Result:84/84, runner/test/PG exits0, evidence
`services/api/v3/.tmp/postgres-baseline-wqqY2s/result.json` and test-output.log.
Parent verified all nine recorded API/database hashes against independent
`tnuAun` and current receiving files, plus final test hash `af4725a9...` above.
Receiving manifest is
`90872ce4e46f71c74038f737b321cd3a6785124ec6947f651b0c51144d0fae88`;
the source-root path differs from the candidate manifest, not any source bytes.
All owned test/PG sessions finished; reviewer closed. No provider connection,
actual payment/refund/dispute, push, main merge or public deployment occurred.

## Remaining Gates

No automatic quarantine promotion, payment evidence retrieval, durable retry
scheduler, held-purchase resolution, cleanup/retention policy or operator UI.
Before HTTP activation, add bounded authenticated parsing/rates, private DTOs,
reconciliation and capacity/retention controls for unmatched account-wide events.
Never expose `unbound` as payment success or discard unresolved negative facts
just to unblock an initial grant.

Unsupported refs/types/statuses, remaining refund lifecycle, provider timeouts
and test-provider/browser delivery remain open. L10 owner/provider/legal choices
and L11/L12 completion are not implied. No live money, secrets, push, main merge
or deploy. Self-check and local synthetic evidence are not provider acceptance.
