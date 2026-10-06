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
  sidebar Token and top Navbar. It does not yet exercise accepting discard,
  Back after real in-app history, or navigation during a delayed PUT. The
  reviewer found no source defect in those branches; add focused regressions.
- The real PostgreSQL runner stops its disposable cluster. It has not proved
  survival of a separate PostgreSQL process restart. The local API-instance
  restart check is separate.
- No real checkout/provider, payment, push, deployment or public release.

## Sign-off

- Reviewer decision: APPROVED for the exact locally integrated UI candidate.
- Unresolved P1/P2 findings: none.
- Remaining P3 test-coverage note: positive discard, browser Back and
  navigation while save is in flight.
