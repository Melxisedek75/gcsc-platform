# AI Review Record

- Change ID: 2026-10-05-private-draft-api-restart-pg
- Repository: gcsc-platform
- Branch: codex/public-contractor-role-transition-pg-20261002
- Base commit: ad2314c7
- Head commit: 919dfe6f085cfc72134dd2cc450c950f6758aee3
- Author AI: CODEX (QA lane)
- Reviewer AI: separate CODEX context 01a10aaa-bffe-7623-82f1-83251a09cdc1
- Author status: READY_FOR_REVIEW
- Reviewer decision: PENDING_SIGNATURE
- Receiving status: BLOCKED_BY_ENOSPC
- Live-risk decision: BLOCKED
- Deploy decision: BLOCKED

## Scope

Test-only local PostgreSQL check that a private owner draft persists after the
HTTP API is closed, the module reloaded and storage reopened against the same
database. Exact empty list and generic denial bodies limit private leakage.
This does not restart the PostgreSQL process or implement draft editing.

## Changed Files

- `tests/postgres-projects.integration.cjs`

## Verification

| Check | Result | Evidence |
|---|---|---|
| Candidate PostgreSQL baseline | 41/41 PASS, test/PG exit 0 | QA `services/api/v3/.tmp/postgres-baseline-JzoQ6V/result.json` |
| Independent reviewer PostgreSQL baseline | 41/41 PASS, test/PG exit 0 | QA `services/api/v3/.tmp/postgres-baseline-6xPSC5/result.json` |
| Candidate root `npm run check` | PASS | Author |
| Publication receiving PostgreSQL baseline | FAIL: ENOSPC, test exit 1, PG exit 0 | Publication `services/api/v3/.tmp/postgres-baseline-WNlwaL/result.json` |
| Publication receiving root check | Not verified after ENOSPC | No PASS claim |

## Findings And Limits

- Reviewer found P2 in first candidate `4b6ab7a0`: status-only private
  denial could conceal a leaked body. Follow-up `919dfe6f` asserts exact
  generic 404 bodies and exact empty list for the other owner.
- Publication cherry-picks `bcb4a457`/`9d8a67da` are local only. They do not
  satisfy receiving acceptance until disk space permits a successful repeat.
- No full L06, PostgreSQL process restart, live account, provider, payment or
  release approval.

## Sign-off

- Reviewer decision: APPROVED for exact `ad2314c7..919dfe6f085cfc72134dd2cc450c950f6758aee3` (QA diff only).
- Independent reviewer evidence: QA `services/api/v3/.tmp/postgres-baseline-6xPSC5/result.json`; PostgreSQL baseline 41/41 PASS, test and PG exit 0.
- Publication receiving `WNlwaL` is FAIL (test exit 1, PG exit 0), not PASS; the record attributes it to ENOSPC, while `result.json` does not independently identify the cause. Receiving acceptance remains open.
- Unresolved P1-P3 findings in the reviewed QA diff: none. No approval for full L06, live accounts, providers, payment or deployment.
