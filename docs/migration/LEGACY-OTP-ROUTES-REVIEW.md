# Legacy OTP routes: local source finding (2026-10-07 UTC)

Status: OPEN, backend-only remediation candidate plus synthetic local HTTP
checks. No live provider, real user account, external request, or actual email
was used. This is not an independently reviewed fix or a release-gate approval.

## Evidence

- `services/api/v3/pure-server.js` registers `POST /api/register`,
  `POST /api/verify`, `POST /api/login`, and `POST /api/login/verify` in the
  active `routes` dispatcher. These legacy paths are separate from the
  provider-aware `/api/auth/*` flow.
- Legacy register/login create six-digit OTPs and call local `sendEmail()`.
  That helper logs the destination, subject, and extracted code, returns a
  resolved promise, and does not send email. The endpoints nevertheless reply
  `OTP sent`. Legacy verify can mark a user verified after that code is read
  from the local OTP store.
- The newer `/api/auth/register` checks provider readiness and, for the web
  client's `preferred` mode, creates an unverified account when unavailable.
  The legacy routes do not share that readiness gate.

## Local reproduction

With `DATABASE_URL` cleared, a dummy test JWT secret, intercepted `gcsc.db`
reads/writes, and captured console output, a synthetic POST to the active
server on `127.0.0.1` returned:

```json
{"status":200,"message":"OTP sent","otpLogged":true,"recordCreated":true}
```

The six-digit value was deliberately not printed or retained in this evidence.
The process exited successfully and no provider request occurred. This proves
the local route behavior, not production reachability or external log access.

## Risk and next step

The old paths can misrepresent delivery and put authentication codes in server
logs. Treat them as an unresolved auth/privacy boundary. Backend lane should
first add focused local HTTP tests with a synthetic address and no provider:
legacy calls must neither claim delivery nor expose an OTP in logs, and must
not create a verified account. Then make the narrow backend change, run full
API and local PostgreSQL checks, and request independent review. Keep existing
API clients and migrations under review; do not enable a new provider or send
real user data. No production/integration decision follows from this note.

## Local backend candidate (2026-10-07 UTC)

Backend commit `1bcd16b0` contains only the OTP-route change, focused
`security-boundaries.test.js` regression, and API auth documentation. Its
source hunk was staged separately from the preexisting L05a document-upload
changes; after the commit, only L05a source/test edits remain unstaged.
In `C:\gcsc-platform\.worktrees\backend`, the four legacy routes now return
HTTP 410 before parsing input, OTP creation, token issuance, or user mutation.
The log-only `sendEmail()` helper was removed. The current web client uses
`/api/auth/*`; API documentation in the backend candidate was updated. Older
external clients may need migration and must not be assumed compatible.

`services/api/v3/tests/security-boundaries.test.js` exercises all four routes
over local HTTP with synthetic `example.invalid` data, including preexisting
legacy OTP fixtures. It checks HTTP 410, no token, unchanged users/OTP count,
and no OTP in console output. Focused 9/9 PASS, full API Jest 341/341 PASS,
`node --check`, `git diff --check`, and staged diff-check PASS. Full Jest and
PostgreSQL checks used the combined working-tree snapshot, not the isolated
commit blob. The QA isolated PostgreSQL 18.4
project-publication suite ran against backend `pure-server.js` SHA-256
`554cc013e74398a19dab63d3be63baf11032d6fee2fce3a33a138cdbbbddb9bd`:
33/33 PASS, test/PG exit 0, evidence
`C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-gNoZ8M\result.json`.
That suite covers project privacy, roles, bid access and wallet identity but
does not directly exercise the retired OTP routes in PostgreSQL mode. The
backend worktree was already dirty with the separate L05a document-size/MIME
candidate in `pure-server.js`
and `profile-documents.test.js`; these edits were preserved. The isolated auth
commit is not integrated and has not passed the formal gate.

QA test-only commit `4cb4f1e8` adds an opt-in isolated PostgreSQL 18.4 suite
for all four legacy routes with synthetic fixtures, confirms no persisted user
or new OTP, no token and no OTP in captured logs. Runner option parser 13/13,
QA root check and diff-check PASS. Against backend source SHA-256
`554cc013e74398a19dab63d3be63baf11032d6fee2fce3a33a138cdbbbddb9bd`,
targeted PG1/1 PASS, test/PG exit 0, result `postgres-baseline-MWIuf1`.
Against current publication source SHA-256
`154436a6394e851e93538e834d20841034dada529ba7a3efa1d3c871471ebf12`,
the same opt-in suite failed as expected: `/api/register` returned 200 instead
of 410, result `postgres-baseline-Tj56nm`, test exit 1 and PG exit 0. Both
clusters were stopped by the runner. This distinguishes the candidate from
the current integrated source; it is not approval to integrate. Independent
review and formal CODEX/CLAUDE gate remain open.

## Exact committed source acceptance

A disposable detached worktree at backend commit `1bcd16b0` was used only for
read-only QA and then removed after confirming it was clean. Against its
`pure-server.js` SHA-256
`4c02c10232292fcd0bb3f12e15b192633944505338eb0bdf9c75e619690e670e`,
the opt-in local PostgreSQL 18.4 legacy OTP suite passed 1/1
(`postgres-baseline-8u1V28`) and project-publication/privacy suite passed
33/33 (`postgres-baseline-OGMyBg`); test and PostgreSQL process exit codes
were zero in both result files. Neither fixture database was live or retained
as a running server. The separate full Jest 341/341 result still refers to
the backend working tree with unstaged L05a upload changes. Independent review
and formal gate remain open; no integration, push, or deployment followed.
