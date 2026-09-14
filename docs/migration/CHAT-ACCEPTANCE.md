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

## Parent evidence, 2026-09-14

All commands from `C:/gcsc-platform/.worktrees/qa`, exit0 unless explicitly red.

- Red: `npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin`
  failed on absent chat route (404 vs expected401). Previous22 scenarios passed.
  Evidence `services/api/v3/.tmp/postgres-baseline-oIQu4C/result.json`.
- Same command, final coverage: **36/36**, PostgreSQL18.4. Thirteen chat scenarios,
  twenty-two previous scenarios, one parent. Final evidence
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
