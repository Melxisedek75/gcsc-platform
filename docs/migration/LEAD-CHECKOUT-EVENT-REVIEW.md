# L12 signed Checkout event intake review

Date: 2026-09-30. This slice is a dormant local intake and persistence boundary,
not payment fulfillment, a complete webhook endpoint or completion of L12.

## Candidate

- Base: `e810e244`, including independently reviewed L11 foundation `0d839c99`.
- Candidate: `09123295464f7a888fda31500865da466ad92daf`.
- Branch: `codex/lead-webhook-20260930`.
- Worktree: `C:/gcsc-platform/.worktrees/legacy-preservation`, parent sole writer.
- `database/lead-checkout-events.cjs` SHA-256:
  `44af4966febb8f97895b2a62be388f525fe004c07e8dd3511476650644fb51d9`.
- `database/lead-checkout-binding.cjs` SHA-256:
  `14ff5f845ebaf89c82a7684b7724c83d1a360abea89a8efc9e5ea83a93336fdc`.
- `database/lead-checkout.cjs` SHA-256:
  `49441897d027e7bc777e75d098f62c73236bea64fc7f1bb0c912c01e47a84ac7`.
- `database/schema-statements.cjs` SHA-256:
  `78e4e4aa9c48e09269fa389cde32e58a849ca41b833e57d6fc3341b0f73b7452`.
- API `pure-server.js` remains unchanged at `f24fdd7d...`; no route imports the
  intake or exposes its arguments. No HTTP or payment feature is enabled.

## Behavior and boundaries

The installed Stripe 17.7.0 webhook helper verifies original bounded raw bytes
using an explicit synthetic test configuration in tests. No Stripe client API
call is made. The wrapper rejects live/connected/context events, other configured
API versions, unsupported types, malformed bindings, invalid UTF-8/BOM, stale or
future/ambiguous timestamps and invalid signatures. SDK errors do not propagate
their payload/header. Event/session mode, purpose, quote, project, buyer, expiry
and provider references must match the server's stored purchase.

Only `checkout.session.completed` and `checkout.session.expired` are accepted by
this slice. Allowlisted IDs/status and a raw-body digest are persisted; no raw
payload, customer email, arbitrary metadata, signature or webhook secret. One
session and one PaymentIntent cannot bind to two purchases, including receipt
before attachment. Bindings and inbox insertion roll back together. Valid older
attached purchases are backfilled, and conflicting associations stop migration.

Duplicate identical events are durable/idempotent; changed same-ID bytes conflict
instead of replacing evidence. That includes formatting-only changes and is a
documented fail-closed limitation to reconcile before provider acceptance. Both
expired and completed facts can be retained in either order. Unavailable-project
events are retained for future reconciliation, not fulfilled. Every inserted
event is `received`; purchase remains `pending`; no entitlement/refund is issued.

## Parent checks

Commands run from the candidate worktree, Windows / Node 25.9.0 / PostgreSQL 18.4.
No installation, new provider, real signing, credential read, network payment or
live database was used. All parent processes below completed.

- `node --test tests/lead-checkout-events.test.cjs`: initial missing-module RED.
  Later UTF-8/BOM negative case was RED (7/8); decoder normalization ambiguity
  fixed by explicitly rejecting BOM before SDK verification. This is not a claim
  of a Stripe payment bypass or a production vulnerability.
- `npm run test:lead-checkout`: final 25/25, exit 0 (8 signed-event cases,
  6 foundation cases, 11 runner/source guards; table-driven negatives included).
- `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/legacy-preservation/services/api/v3`:
  initial intake `KPemml` 24/24; expanded negative `rTw25W` 24/26 RED on
  cross-purchase session/PaymentIntent reuse. Fixed with shared unique bindings.
  `insJA9` 27/27; final runtime `9V8hdt` 27/27 and expanded acceptance `2GYErK`
  29/29, runner/test/PostgreSQL exits 0. Last two include identical runtime hashes;
  final adds late-intent conflict rollback and conflicting backfill rejection.
- `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin`:
  `O0Haiu`, 39/39, runner/test/PG exits 0. Existing injected audit-failure output
  is expected; it tests rollback, not a silently ignored failure.
- `npm run test:api`: 15 suites, 301/301, exit 0. Existing URL parser warning;
  no new failure. These API tests do not expose the new module through HTTP.
- `npm run check`: root 37/37, mobile-build 12/12, wallet-restore 11/11,
  syntax/static PASS; exit 0.
- `git diff --cached --check`: exit 0 before candidate commit.

Exact evidence and per-module hashes:
`services/api/v3/.tmp/postgres-baseline-2GYErK/result.json` in the candidate
worktree. Temporary clusters stopped. Locally signed fixtures prove this code's
cryptographic/persistence behavior, not delivery or payment by Stripe.

## Independent review

Agent `01a0edd5-92a1-7b42-ac8f-88094d6f5637` independently inspected all eight
files in immutable `e810e2449ae8020f049531b7cc84cb316bc0192a..09123295`.
No confirmed findings. Runtime hashes matched before and after; worktree clean.

- `npm run check`: exit 0, root 37/37, mobile-build 12/12, wallet-restore
  11/11, syntax/static PASS.
- `npm run test:lead-checkout`: exit 0, 25/25.
- The same scoped PostgreSQL command: 29/29, runner/test/PG exit 0;
  `postgres-baseline-sKFxyH/result.json`, PostgreSQL stopped, port 54768 closed.
- `git diff --check e810e244 09123295464f7a888fda31500865da466ad92daf`: exit 0.

`AI_REVIEW_GATE=PASS` only for dormant local L12 intake integration. Parent
inspected the independent result.json and per-module hashes; reviewer closed.
Hard-kill around COMMIT and external provider delivery remain untested. The new
SDK unit suite is in explicit `test:lead-checkout`, not the dependency-light
root `check`; both commands are required for this scope. No payment activation
or complete-L12 approval follows from this verdict.

Local publication was fast-forwarded `e810e244 -> 09123295` after this PASS,
preserving the exact reviewed source. Coordination/report files are a separate
checkpoint. No GitHub push, `main` update, production deployment or provider
activation was performed. The completed reviewer was closed.
Receiving publication `npm run test:lead-checkout` also passed 25/25, exit 0,
after this fast-forward; no runtime edits followed review.

## Remaining acceptance

1. Atomic fulfillment/reconciliation: claim a verified event under the established
   project/identity/purchase/binding lock order; recheck current owner/buyer and
   project; validate immutable quote; write purchase state, entitlement, event
   outcome and audit together. Replay after each injected crash cannot double grant.
2. Decide/implement refund, dispute, revocation and async-failure handling. Do not
   infer economic policy from this inbox or implement the future 50/50 auction
   refund in the October fixed-price path. Closed/withdrawn/late-paid cases need
   an explicit reconciliation state rather than silently granting or refunding.
3. Bounded raw-body HTTP parser, route auth/rate limits/private DTOs, server-owned
   test provider/price/return-origin configuration, recovery for create timeout or
   completed session before attachment. The helper's 64 KiB check alone is not
   an HTTP stream limit; the old escrow webhook remains separate.
4. Actual provider test deliveries and desktop/mobile browser payment journey,
   then independent exact-source release review and L10 founder/legal/provider
   decisions. No production key/payment or deployment is authorized by this record.
