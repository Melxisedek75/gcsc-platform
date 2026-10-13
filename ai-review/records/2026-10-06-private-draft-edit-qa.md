# AI Review Record

- Change ID: 2026-10-06-private-draft-edit-qa
- Repository: gcsc-platform
- Branch: codex/public-contractor-role-transition-pg-20261002
- Base commit: 964cd181
- Head commit: b38e3610
- Author AI: CODEX (QA lane)
- Reviewer AI: separate CODEX context 01a11007-866c-73f1-8e0d-69fb8a9f1686
- Author status: READY_FOR_REVIEW
- Reviewer decision: APPROVED (test-only exact diff)
- Live-risk decision: BLOCKED
- Deploy decision: BLOCKED

## Scope

Opt-in isolated PostgreSQL tests for owner-only private draft replacement and
local Edge/API/PostgreSQL browser coverage for create, edit, stale version,
explicit conflict retry, publication and lead privacy. The selected backend is
an exact working-tree snapshot with `pure-server.js` SHA-256
`30ee422b7c68a2e3781abfc417e3980c7d38e7b5fa86b1897e1c74dd30d4027a`;
it also includes unrelated uncommitted L05a work. No backend, web, provider or
payment implementation is approved by this record.

## Changed Files

- `scripts/run-postgres-baseline.mjs`
- `tests/postgres-runner.test.mjs`
- `tests/postgres-project-draft-edit.integration.cjs`
- `tests/postgres-project-browser.integration.cjs`

## Verification

| Check | Result | Evidence |
|---|---|---|
| Candidate isolated PostgreSQL draft edit | 5/5 PASS; test/PG exit 0 | QA `services/api/v3/.tmp/postgres-baseline-hS4pA0/result.json` |
| Candidate Edge/API/isolated PostgreSQL | 1/1 PASS twice; test/PG exit 0 | QA `services/api/v3/.tmp/postgres-baseline-i7ZUL3/result.json`, `postgres-baseline-4wHu66/result.json` |
| Candidate runner and root checks | 12/12 and PASS | `node --test tests/postgres-runner.test.mjs`; `npm run check` |
| Independent reviewer isolated PostgreSQL draft edit | 5/5 PASS; test/PG exit 0 | QA `services/api/v3/.tmp/postgres-baseline-ghV7nN/result.json` |
| Independent reviewer Edge/API/isolated PostgreSQL | 1/1 PASS; test/PG exit 0; Edge/API/UI closed | QA `services/api/v3/.tmp/postgres-baseline-BbZikw/result.json`, `browser-acceptance.json` |
| Independent reviewer runner and root checks | 12/12 and PASS | `node --test tests/postgres-runner.test.mjs`; `npm run check` |
| Publication receiving cherry-picks `60c15509..fa95650f`: runner and root checks | 12/12 and PASS | `node --test tests/postgres-runner.test.mjs`; `npm run check` |
| Publication receiving baseline PostgreSQL | 41/41 PASS; test/PG exit 0 | Publication `services/api/v3/.tmp/postgres-baseline-7cMUKx/result.json` |
| Publication receiving opt-in PostgreSQL draft edit | 5/5 PASS; test/PG exit 0 | Publication `services/api/v3/.tmp/postgres-baseline-coYE3t/result.json` |
| Publication receiving Edge/API/isolated PostgreSQL | 1/1 PASS; test/PG exit 0; Edge/API/UI closed | Publication `services/api/v3/.tmp/postgres-baseline-34utSP/result.json`, `browser-acceptance.json` |

## Findings And Limits

- Earlier informal read-only reviews found P2 gaps in denial-body assertions,
  unchanged published state, broad PUT allowlist and confirmation-before-retry.
  Follow-up commits `1e5af966`, `9380c66d`, `a7e735af` and `b38e3610`
  closed them; the final independent reviewer found no new issue.
- This is local test-only acceptance against selected candidate sources and
  receiving publication test-only acceptance. It is not a clean backend source commit, a live
  payment, provider setup, public deployment or full L06 sign-off.

## Sign-off

- Reviewer decision: APPROVED for exact `964cd181..b38e3610` (test-only QA scope).
- Reviewer context: `01a11007-866c-73f1-8e0d-69fb8a9f1686`.
- Reviewer independently inspected the diff and ran all four checks listed above.
- Unresolved P1-P3 findings: none in the reviewed test-only diff.
