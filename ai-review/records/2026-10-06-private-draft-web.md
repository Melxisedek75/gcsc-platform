# AI Review Record

- Change ID: 2026-10-06-private-draft-web
- Repository: gcsc-platform
- Branch: codex/monorepo-publication
- Candidate commits: `7103e902` (October-web source cherry-pick), `979130af` (navigation guard and acceptance)
- Source UI commit: October-web `65312daa`
- Author AI: CODEX (publication coordinator)
- Reviewer AI: separate CODEX context `01a1101b-09dd-7df3-8d7c-4414e586e62f`
- Reviewer decision: APPROVED for local candidate; no remaining P1/P2
- Live-risk decision: BLOCKED
- Deploy decision: BLOCKED

## Scope

Owner edits an open private draft through the reviewed API using a versioned
request. A 409 keeps local text until explicit comparison and retry. Unsaved
edits require confirmation before leaving a dashboard section, signing out,
or changing routes through the shared Navbar or browser history. Saving blocks
navigation. The app retains hash URLs with a data-backed router.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Independent source/test review | APPROVED; prior Navbar P2 and real-bootstrap P2 closed | Reviewer context `01a1101b-09dd-7df3-8d7c-4414e586e62f` |
| Root checks, API route contracts and web build | PASS | `npm run check`, `npm run check:integration-contracts`, `npm --prefix apps/web run build` |
| Scoped ESLint, runner source guards | PASS | Four changed web source files; `node --test tests/postgres-runner.test.mjs` 12/12 |
| Actual main/App/Navbar/Edge/API/isolated PostgreSQL | PASS twice, 1/1 each, test/PG exits 0 | `postgres-baseline-llsPCH/result.json`, `postgres-baseline-80TkfV/result.json`; main.tsx is a pinned bundle input |
| Registration role and paid-project browser regressions | PASS, 10/10 and 21/21 | Local Edge with synthetic API fixtures; no provider payment |
| Auth-channel validator, dashboard validator, chat UI and web states | PASS | Local checks; chat UI output `apps/web/.tmp/chat-ui-xGz3rt` |

## Remaining Boundaries

- The browser journey rejects leaving on Cancel, desktop/mobile section,
  sidebar Token and top Navbar. A follow-up test now exercises accepting
  discard on Cancel, confirms no PUT and unchanged PostgreSQL fields, then
  reopens and saves. Another follow-up holds the PUT before the API receives
  it and confirms Navbar navigation is blocked with an alert while saving;
  PostgreSQL remains unchanged until the request is released. It does not yet
  exercise accepting Back after real in-app history. The
  reviewer found no source defect in those branches; add focused regressions.
- The real PostgreSQL runner stops its disposable cluster. It has not proved
  survival of a separate PostgreSQL process restart. The local API-instance
  restart check is separate.
- No real checkout/provider, payment, push, deployment or public release.

## Sign-off

- Reviewer decision: APPROVED for the exact locally integrated UI candidate.
- Unresolved P1/P2 findings: none.
- Follow-up positive-discard test-only diff independently APPROVED by the same
  reviewer with no P1-P3. Edge/API/PG1/1 twice `e4YqVf`/`zLF67H`, test/PG
  exits 0, runner12/12 and root check PASS. Reviewer independently ran
  `node --check` and `git diff --check`, not the browser journey.
- Delayed-PUT follow-up test-only diff initially had a P2 harness hang/cleanup
  risk, then was independently APPROVED with no P1-P3 after bounded intercept
  waiting and unconditional release/await/unroute. Edge/API/PG1/1 twice
  `RoJrl5`/`8AW4zl`, test/PG exits 0, runner12/12 and root check PASS.
  Reviewer independently ran syntax/diff checks and inspected saved run
  reports, not the browser journey.
- Follow-up test-only diff confirms accepted Navbar About discard with no PUT
  or PostgreSQL change, then returns through Dashboard and selects the saved
  project. Browser Back from the resulting real SPA history is rejected with
  the unsaved title intact. A first run `XoLqDi` failed because the selected
  project resets on Dashboard reentry; the test now explicitly selects it.
  Edge/API/PG1/1 twice `zhPHIL`/`E4Ug4A`, test/PG exits 0, runner12/12 and
  root check PASS. Independent reviewer APPROVED with no findings; reviewer
  checked saved reports and syntax/diff, not a fresh browser run.
- Accepted browser Back after real in-app history is now covered by a further
  test-only diff. The browser confirms discard, lands on `#/token`, sends no
  PUT, leaves the PostgreSQL row unchanged, and reopens the saved draft before
  the existing delayed-PUT path. The first route choice (`#/about`) exposed
  an unrelated `SplitText is not defined` page crash in `mQocKp`; changing
  the fixture route to Token reached the final allowlist and required three
  exact local image paths. Final Edge/API/PG1/1 twice `IBfHCk`/`uC1w0Z`,
  test/PG exits 0, empty blocked/page/request/cleanup errors, runner12/12
  and root check PASS. Independent reviewer APPROVED with no P1-P3; personally
  checked syntax/diff and saved evidence, not a new browser run. The About
  crash is not fixed or included in this approval.
- PostgreSQL process restart is independently covered by the separate
  `2026-10-06-private-draft-pg-process-restart.md` review record. Formal
  CODEX/CLAUDE integration and live-risk gates remain open.
