# AI Review Record

- Change ID: 2026-10-04-registration-roles-pg
- Repository: gcsc-platform
- Branch: codex/public-contractor-role-transition-pg-20261002
- Base commit: eaec4e58
- Head commit: 3ee96662ca4dfacf472a846761ada6ee9f5e4bdf
- Author AI: CODEX (QA lane)
- Reviewer AI: separate CODEX context 01a10aaa-bffe-7623-82f1-83251a09cdc1
- Author status: READY_FOR_REVIEW
- Reviewer decision: APPROVED for local test scope
- Required checks: PARENT_AND_REVIEWER_LOCAL_PASS
- Unresolved P0/P1 findings: 0 known in reviewed diff
- Live-risk decision: BLOCKED
- Deploy decision: BLOCKED

## Scope

Test-only local API/PostgreSQL registration of owner and contractor without a
verification provider. Assert unverified role and channel persistence, actual
registration JWT permissions, private draft denial, and public preview allowlist.
No SMS, email, browser registration or live account verification.

## Changed Files

- `tests/postgres-projects.integration.cjs`

## Verification

| Check | Result | Evidence |
|---|---|---|
| Candidate PostgreSQL baseline | 40/40 PASS, test/PG exit 0 | QA `services/api/v3/.tmp/postgres-baseline-h4hpqL/result.json` |
| Independent reviewer PostgreSQL baseline | 40/40 PASS, test/PG exit 0 | QA `services/api/v3/.tmp/postgres-baseline-vX3l5s/result.json` |
| Candidate syntax, diff, root `npm run check` | PASS | Author |
| Receiving cherry-picks `ad358862`/`63abced0`: PostgreSQL baseline | 40/40 PASS, test/PG exit 0 | Publication `services/api/v3/.tmp/postgres-baseline-c9HM9U/result.json` |
| Receiving root `npm run check` | PASS | Author |

## Findings

- First candidate run `1JTu7U` expected a roofing preview without setting the
  roofing category; it failed and is not counted as PASS.
- Reviewer identified P2 in `fcfaaa72`: status-only denials could miss a leaked
  body or unintended write. Follow-up `3ee96662` asserts exact generic bodies,
  unchanged PostgreSQL project count and complete preview allowlist.
- Reviewer first PG attempt stopped during initdb with `Query read timeout`;
  independent repeat `vX3l5s` passed.

## Sign-off

- Reviewer decision: APPROVED for exact `eaec4e58..3ee96662ca4dfacf472a846761ada6ee9f5e4bdf` (local test scope only)
- Independent reviewer evidence: QA `services/api/v3/.tmp/postgres-baseline-vX3l5s/result.json`; PostgreSQL baseline 40/40 PASS, test and PG exit 0
- Unresolved P1-P3 findings: none in the reviewed diff
- No approval for live accounts, real verification provider, public release or production deployment.
