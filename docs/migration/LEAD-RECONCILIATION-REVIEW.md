# L12 held-purchase quarantine reconciliation review

- Change ID: 2026-10-01-lead-held-reconciliation
- Repository: gcsc-platform
- Branch: codex/lead-quarantine-reconcile-20261001
- Base commit: `45156d25838b92fb11ab89e8efb27e6992bea9f8`
- Head commit: `af6c9409b8ce035120c56911e384f76ccdf343dc`
- Author AI: CODEX, parent context
- Reviewer AI: CODEX, independent context `01a0edd5-92a1-7b42-ac8f-88094d6f5637`
- Author status: READY_FOR_REVIEW
- Reviewer decision: APPROVED for local dormant source `1bcd894f` and test-only `af6c9409`
- Required checks: PASS, author and independent reviewer
- Unresolved findings: none confirmed in the exact reviewed diffs
- Live-risk decision: BLOCKED
- Founder evidence: NOT_REQUESTED; local-only scope
- Deploy decision: BLOCKED

Record follows `C:/gcsc/ai-review/TEMPLATE.md`. It is not a full L12,
provider, payment, browser or production approval.

## Scope

`reconcileUnboundLeadEvent(pool, eventId)` is an explicitly invoked internal
transaction. It handles only a signed-test refund/dispute fact already in the
minimal quarantine and a purchase already held by a signed paid event with
`unbound_negative_event`. It requires a later exact PaymentIntent binding,
matching immutable paid-event quote snapshot, causal timestamps, eligible
amount and no current entitlement. The provider metadata never selects a
purchase. An unbound, changed, superseded or otherwise inconsistent fact
remains quarantined.

The transaction takes the shared event advisory lock, then project/grant/
purchase/binding locks in fulfillment order, then the PI advisory lock. It
inserts the refund/dispute object binding and bound inbox fact, preserves the
original receive time, removes the duplicate quarantine location and writes
one minimal audit record atomically. The signed digest and fact identifiers
remain in the bound inbox/binding/audit. Replays return `already_promoted`.
No entitlement is issued or revoked by promotion itself. Existing fulfillment
must separately process the promoted fact; its quote/PI/refund/dispute guards
are unchanged. No HTTP route, scheduler or provider call was added.

The deliberately narrow eligibility rule excludes an existing paid/revoked
grant and purchases without an already held paid fact. Those cases still need
an independently reviewed resolution path. No automatic access restoration
follows a won/closed dispute.

## Verification

Commands ran from `C:/gcsc-platform/.worktrees/legacy-preservation` unless
noted. PostgreSQL 18.4 and signed events are synthetic/disposable loopback.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run test:lead-checkout` | 39/39, exit 0 | Author and reviewer, both commits |
| `npm run check` | 37+12+11 and static/syntax exit 0 | Author and source reviewer |
| `npm run test:api` | 15 suites, 301/301, exit 0 | Author; module not activated in API |
| PG baseline runner | 39/39, test/PG exits 0 | `postgres-baseline-WIkjCO/result.json` |
| PG lead runner (below), initial source | 98/98, test/PG exits 0 | Parent `XvoMjl`, reviewer `mE0jkg`, receiving `bqX52D` |
| PG lead runner, test-only follow-up | 101/101, test/PG exits 0 | Parent `yJjWQC`, reviewer `eZUj8X`, receiving `g5NIGA` |

```powershell
node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/legacy-preservation/services/api/v3
```

Tests first: missing module failed (`PIuoNL`); the first implementation
failed its positive fixture because an event may bind a session without
duplicating its ID in the purchase row (`DxQOe8`). The corrected guarded
comparison passed 95/95 (`D02eiv`), then concurrency, audit rollback and
lost-COMMIT cases passed 98/98. Reviewer APPROVED exact
`45156d25..1bcd894f`, noting four negative-test gaps but no confirmed P1-P3.
Test-only `af6c9409` covered foreign metadata, quote drift, existing grant
and refund-object collision; reviewer separately APPROVED exact follow-up.

Receiving `g5NIGA` has the same eleven API/database SHA-256 values as
reviewer `eZUj8X`; the test file SHA-256 is
`121d70d5c8f2c5096b5c687dd970e92b69f922612c4a4875df2dcd429baace23`.
Source manifest digests differ only by worktree path. No test thresholds or
production guards were weakened. No push, deploy, provider IO or real money.

## Remaining gates

Reconciliation of an already active grant, missing paid evidence, mismatched
or superseded purchase, multiple negative observations, refund/dispute status
resolution and provider confirmation remain open. The promoted inbox fact is
not automatically fulfilled; due bounded retry is a separate dormant module.
Private purchase HTTP DTO, SDK timeout recovery, browser/test-provider E2E,
founder policy and live-risk approval remain required. L11/L12 stay open.
