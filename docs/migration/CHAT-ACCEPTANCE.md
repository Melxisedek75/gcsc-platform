# P3.1: participant-only server chat

Scope: canonical API and disposable local PostgreSQL only. Base ff17a049,
branch codex/chat-persistence-20260914. No native build, wallet changes or live IO.

## Confirmed gap and contract

`apps/mobile/lib/threads.ts` derives project-only ids (`p<projectId>`).
`components/ChatThreadView.tsx` adds messages to React state, not the server.
The canonical API/schema have no chat routes/tables. The new contract is additive;
the old project-only ids and device fixtures MUST NOT be imported as shared history.
Native and web consumers are not connected by this backend slice.

- A conversation belongs to the original project homeowner and one bidding
  contractor. Open with a real bid id; repeated bids for the same pair reuse the
  conversation. Server ids, sender identity, sequence and timestamps are authoritative.
- Both stored participants must be active, with the correct current roles.
  No admin-wide chat access. Another bidder on the same project is an outsider.
  Changing project ownership or deleting the bid relationship revokes access;
  a new owner never inherits the old conversation.
- Pending bid + open project, or accepted bid + in_progress project allows sends.
  Rejected/withdrawn bids and completed/closed projects are read-only. Existing
  authorized history and acknowledgements remain readable. No arbitrary recipients.
- PostgreSQL is required (503 in the JSON/demo mode). Text only, 1..4000 UTF-16
  code units after trimming, no NUL; valid JSON body <=32 KiB. Extra fields rejected.
- Every send requires a UUID `client_message_id`. Same thread/sender/key/text
  returns the original acknowledgement; changed text is a 409 conflict. Consumers
  must retain the same key after an uncertain response, not manufacture a new one.
- PostgreSQL lock waits are capped at 3 seconds and statements at 5 seconds.
  Lock/statement timeout or deadlock rolls the transaction back and returns 503;
  resending keeps the same message key. Well-formed Unicode is required.
- Thread-row locking serializes message sequences in commit order; cursor reads
  cannot permanently skip a concurrent uncommitted earlier message. Audit metadata
  and message commit atomically; audit has ids/sequence, never message text.
- All responses are no-store. Read/write limits are per stored user, not forwarded
  IP or arbitrary token text. No sockets, push, attachments, edits or read receipts.

## HTTP surface

All routes require the existing application Bearer JWT and fresh stored-user checks.

| Request | Response |
| --- | --- |
| POST /api/chat/threads `{bid_id:number}` | 201 new / 200 existing `{thread}` |
| GET /api/chat/threads?before=N&limit=N | `{threads,next_before,has_more}`, descending id, default50/max100 |
| GET /api/chat/threads/:id/messages?after=N&limit=N | `{thread,messages,next_after,has_more}`, sequence ascending, default after0/limit50, max100 |
| POST /api/chat/threads/:id/messages `{text,client_message_id}` | 201 new / 200 duplicate `{message,duplicate}` |

Thread: id, project_id, homeowner_id, contractor_id, title, counterparty
`{id,full_name,role}`, can_send, last_sequence, created_at, updated_at.
Message: id, thread_id, sequence, sender_id, client_message_id, text, created_at.
No email, phone, password, wallet, other bids or audit body in these responses.
401 unauthenticated; 403 inactive/unsupported role; 404 inaccessible/missing thread
or relationship; 400 invalid fields/ids/cursors; 409 read-only/key conflict;
413 oversized JSON; 429 rate limited; 503 PostgreSQL unavailable in demo mode.

## Verification checkpoint

- [x] Red test confirms missing canonical route.
- [x] Real PostgreSQL positive/negative, retry, concurrency, restart and rollback tests.
- [x] Mandatory root/API checks and JSON-mode fail-closed check.
- [ ] Independent review of the exact source candidate.
- [ ] Update owner checklist and continuation checkpoint.

Client integration and full registration/browser/API/DB acceptance remain open.
Retention/deletion policy, content moderation, spam controls across API replicas,
backup/restore and production sizing belong to later acceptance, not a PASS here.

## Initial parent evidence, 2026-09-14 (6df6f81b)

All commands from `C:/gcsc-platform/.worktrees/qa`, exit0 unless explicitly red.

- Red: `npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin`
  failed on absent chat route (404 vs expected401). Previous22 scenarios passed.
  Evidence `services/api/v3/.tmp/postgres-baseline-oIQu4C/result.json`.
- Same command, initial coverage: **36/36**, PostgreSQL18.4. Thirteen chat scenarios,
  twenty-two previous scenarios, one parent. Evidence
  `services/api/v3/.tmp/postgres-baseline-H7QWLF/result.json`,
  07:54:37Z..07:55:10Z, port54287; testExitCode0 and postgresExitCode0.
  Earlier intermediate expansions:31/31 then35/35, not the final coverage count.
- `npm run test:api`: **168/168**, seven Jest suites, exit0 (66.847s).
  Four new cases prove PostgreSQL-required 503 on all chat routes in JSON mode.
- `npm run check`: **48/48** plus migration readiness, API syntax and static web PASS.
- `npm --prefix services/api/v3 run test:pg-storage`: PASS (fake storage regression).
- `git diff --check`: PASS.

The PostgreSQL audit-error stack is an intentional injected trigger failure:
HTTP500, rollback and subsequent retry are asserted. It is not an unhandled failing
test. No live credentials, external network or existing user database were used.
Fixture identities/JWT and direct fixture bid states are NOT registration, lead
purchase or real bid-acceptance evidence. Pending-bid chat follows the current
contractor thread intent; paid-lead/contact eligibility must be reconciled with
P2.5 before pilot, not inferred from the existence of a bid or a chat message.

No UI changed, so no new browser/device/build claim. The next available slice is
web chat consumer integration using this contract and local browser/API/PG checks;
  native/WebAuth work remains deferred.

## Independent review and corrections

Copernicus (separate Sol/high context01a09eeb-1f84-7660-89a8-4b4df185cd0c)
reviewed ff17a049..6df6f81b715ce13516cc9f0b3c33a4a59335c50b: CHANGES REQUIRED.
Independently repeated PG36/36, API168/168, root48/static, fake storage and diff checks.

- P1: list query bypassed bounded transactions. Parent reproduced the timeout,
  also found the initial user lookup used an unbounded query, and routed both
  through the same bounded transaction path. Existing callers retain the default
  user lookup; only chat supplies the bounded lookup.
- P2: Buffer decoding replaced invalid UTF-8 bytes before validation. Parser now
  uses a fatal TextDecoder before JSON.parse; escaped unpaired UTF-16 surrogates
  remain rejected by the separate string validation.
- New regression tests first failed: raw bytes C3 28 incorrectly returned201;
  chat_threads/users table locks each exhausted the HTTP timeout instead of503.
  Red evidence `services/api/v3/.tmp/postgres-baseline-8RYvhV/result.json`.
- After correction, PG **39/39**:16 chat +22 previous +parent. Evidence
  `services/api/v3/.tmp/postgres-baseline-AQkDzs/result.json`, port64269,
  08:11:53Z..08:12:29Z. Test and PostgreSQL process both exited0.
- Final root48/static/readiness checks repeated PASS. API168/168 in7 suites
  repeated PASS (51.031s); fake storage and diff checks PASS. Focused independent
  re-review is recorded below once completed; no self-approval.

## Web consumer candidate (2026-09-23)

Candidate `2ff61777` on `codex/web-chat-integration-20260923` extends the existing
configured web API client with the four typed routes and adds participant-only Chat
to Dashboard. Conversations open from stored bid ids in ProjectsPanel/BidsPanel,
never from a typed recipient. Messages render as plain text in server sequence order;
only the visible conversation polls. Account changes clear local thread, message and
pending-send state. An uncertain send retains its text and UUID and retry reuses the
same idempotency key until the server acknowledges it.
Thread and message lists expose bounded server-cursor continuation controls rather
than unbounded reads. Fresh 401/403/404 history responses mark the selected thread
read-only and stop its polling loop instead of repeatedly querying revoked access.

Verification from `C:/gcsc-platform/.worktrees/web-chat`, all exit0:

- `node --test tests/api-config.test.mjs`: **16/16**, including exact chat routes,
  application Bearer token and unchanged message UUID/body.
- `tsc -b apps/web --pretty false`: PASS.
- scoped ESLint for all changed web files: PASS.
- Vite production build: **2979 modules**, ChatPanel emitted as a lazy chunk.
- `npm run check:web`: all three static migration validators PASS.
- `node scripts/check-chat-ui.mjs --playwright-dir C:\\Users\\rivne\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules`:
  Edge headless at 1280x900 and 390x844, real React ChatPanel with isolated mock
  HTTP; contractor and owner browser contexts share acknowledged history, read-only
  and forbidden states are enforced, no horizontal overflow, uncertain 503 then retry with the
  same UUID, one delivered bubble, cursor-loaded conversation switching without
  stale message leakage and no page errors. Evidence is regenerated under
  `apps/web/.tmp/chat-ui-*/result.json` and is intentionally not committed.

This browser smoke is not real API/PostgreSQL acceptance. Remaining: the same two-identity journey against
the canonical API and disposable PostgreSQL, outsider/stale-access verification there,
independent review of the exact web candidate, and owner-checklist integration.
Native UI/APK and wallet callbacks remain separate and deferred.
