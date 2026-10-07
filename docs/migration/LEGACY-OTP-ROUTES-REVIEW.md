# Legacy OTP routes: local source finding (2026-10-07 UTC)

Status: OPEN, source review only. No live provider, user account, OTP, or external
request was used. This is not an independently validated security finding or a
release-gate approval.

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

## Risk and next step

The old paths can misrepresent delivery and put authentication codes in server
logs. Treat them as an unresolved auth/privacy boundary. Backend lane should
first add focused local HTTP tests with a synthetic address and no provider:
legacy calls must neither claim delivery nor expose an OTP in logs, and must
not create a verified account. Then make the narrow backend change, run full
API and local PostgreSQL checks, and request independent review. Keep existing
API clients and migrations under review; do not enable a new provider or send
real user data. No production/integration decision follows from this note.
