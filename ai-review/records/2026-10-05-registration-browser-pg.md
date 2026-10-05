# AI Review Record

- Change ID: 2026-10-05-registration-browser-pg
- Repository: gcsc-platform
- Branch: codex/public-contractor-role-transition-pg-20261002
- Base commit: 3ee96662
- Head commit: f2cf2b6eed8773e8426fd672077f446eaa8c6018
- Author AI: CODEX (QA lane)
- Reviewer AI: separate CODEX context 01a10aaa-bffe-7623-82f1-83251a09cdc1
- Author status: READY_FOR_REVIEW
- Reviewer decision: PENDING_SIGNATURE
- Live-risk decision: BLOCKED
- Deploy decision: BLOCKED

## Scope

Test-only local Edge/API/isolated PostgreSQL journey through the actual
`AccountAccess` and `ProjectsPanel` components. Owner and contractor register
without a verification provider. Owner creates a private draft and publishes a
generic preview. Contractor sees neither the draft nor private details, and
signs in again after the QA shell reloads. No runtime or provider change.

## Changed Files

- `tests/postgres-project-sources.cjs`
- `tests/postgres-runner.test.mjs`
- `tests/postgres-project-browser.integration.cjs`

## Verification

| Check | Result | Evidence |
|---|---|---|
| Candidate Edge/API/isolated PostgreSQL | 1/1 PASS; test/PG exit 0 | QA `services/api/v3/.tmp/postgres-baseline-GOkncQ/result.json` |
| Independent reviewer Edge/API/isolated PostgreSQL | 1/1 PASS; test/PG exit 0 | QA `services/api/v3/.tmp/postgres-baseline-pbPdzY/result.json` |
| Candidate and reviewer runner tests | 11/11 PASS each | `node --test tests/postgres-runner.test.mjs` |
| Candidate root check | PASS | `npm run check` |
| Receiving cherry-pick `15e22d81`: Edge/API/isolated PostgreSQL | 1/1 PASS; test/PG exit 0 | Publication `services/api/v3/.tmp/postgres-baseline-oJuBiU/result.json` |
| Receiving runner tests and root check | 11/11 and PASS | `node --test tests/postgres-runner.test.mjs`; `npm run check` |

## Findings And Limits

- Initial candidate `wsgZha` lost in-memory React state after a QA shell reload;
  it failed and is not counted as PASS. The final case signs in as contractor
  after reload.
- This is local QA, not OTP/email/SMS delivery, live account verification,
  Android Chrome acceptance, a real payment or a deploy.

## Sign-off

- Reviewer decision: APPROVED for exact `3ee96662..f2cf2b6eed8773e8426fd672077f446eaa8c6018` (local QA scope only).
- Independent reviewer evidence: QA `services/api/v3/.tmp/postgres-baseline-pbPdzY/result.json`; Edge/API/isolated PostgreSQL 1/1 PASS, test and PG exit 0, browser/API/UI closed without errors; runner tests 11/11 PASS.
- Unresolved P1-P3 findings: none in the reviewed diff.
- No approval for live verification providers, real payment, public release or production deployment.
