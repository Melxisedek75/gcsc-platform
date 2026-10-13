# L11 lead Checkout foundation review

Date: 2026-09-30. Scope: dormant local test-only foundation, not completion of
Checkout, a paid grant, L11/L12 or the October release.

## Candidate and ownership

- Base: `c46f449f1ca690a38868f8d5681965f3f8e22d99`.
- Candidate: `0d839c99cfca16fb41cc710098c6a2cbe434cb69`.
- Branch: `codex/lead-checkout-20260930`.
- Worktree: `C:/gcsc-platform/.worktrees/legacy-preservation`; parent sole writer.
  Completed integration refs and ignored prior evidence were retained.
- Runtime `pure-server.js` unchanged: SHA-256
  `f24fdd7d20a658b8d8e60d14b5fe5db8b1b56260269f8c7aa2a3577b5f68ff77`.
- New `database/lead-checkout.cjs`: SHA-256
  `d4d2a3d21cf9d17c380b6d7d2e2ab1d93fbbd1b4413645343463b0feb9209b5f`.
- Additive `database/schema-statements.cjs`: SHA-256
  `8ddb1ddedcd5ad3b8fd810890a97dc30233f45e713d827689e1f3e5f95cef683`.

## Implemented boundary

Internal functions reserve a buyer/project purchase with a server-owned test USD
quote, stable provider retry key and fixed expiry. Concurrent retries serialize
without another active purchase. Both reservation and session attachment check
locked current project/owner/buyer eligibility. Only a matching unpaid/open
synthetic test-session shape can be attached; no function grants paid access.

Buyer-scoped reads hide stale/ineligible URLs; a pending reservation does not
automatically expire into a second payable purchase. Any existing entitlement
blocks repurchase pending explicit refund/repurchase policy. The private project
text and contact are not in the generated request. IDs/metadata would still be
provider data if the adapter were enabled.

The table is additive and the schema runner uses its existing canonical migration
transaction. The internal adapter is not imported into an HTTP route. No SDK,
secret, provider request, webhook delivery, email, payment, signature, public
deployment or remote push was performed. Hiding a local URL is not cancellation
of a provider session already copied by someone.

## Parent evidence

All commands from the candidate worktree on Windows, Node 25.9.0,
PostgreSQL 18.4. Only installed dependencies/binaries were used.

1. `node --test tests/lead-checkout.test.cjs`: initial RED, missing module,
   exit 1. The runner opt-in test also initially rejected the missing flag.
2. `npm run test:lead-checkout`: 17/17 PASS, exit 0 (6 adapter tests and 11
   runner/source-isolation guards, with table-driven rejection cases).
3. `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin --lead-checkout --api-root C:/gcsc-platform/.worktrees/legacy-preservation/services/api/v3`:
   - RED: `postgres-baseline-TeyX49`, 9/11; missing current eligibility in
     attachment and stale URL after project closure. Test exit 1; not a PASS.
   - Corrected: `postgres-baseline-cOhDGt`, 14/14; test exit 0, PostgreSQL exit 0.
   - Stable repeat: `postgres-baseline-tdpaGT`, 14/14; test/cluster exits 0.
4. `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin`:
   39/39 baseline PASS, `postgres-baseline-brIsKh`, test/cluster exits 0.
   Existing injected audit-failure output is an expected rollback test.
5. `npm run test:api`: 15 suites, 301/301 PASS, exit 0. Existing URL parser
   deprecation warning remains; mocked verification is not provider evidence.
6. `npm run check`: exit 0; root 36/36, mobile-build 12/12, wallet-restore
   11/11, syntax/static PASS. An added sixth input-validation unit test then
   passed within focused 17/17; no runtime change followed this root run.
7. `git diff --cached --check`: exit 0 before candidate commit.

PostgreSQL evidence is under the candidate's
`services/api/v3/.tmp/postgres-baseline-*/result.json`, with explicit source
manifest hashes. Temporary clusters were stopped. These tests use synthetic
users, price policy and provider responses; they do not buy a lead.

## Independent review

Reviewer `01a0edd5-92a1-7b42-ac8f-88094d6f5637` received the frozen
`c46f449f..0d839c99` scope and commands. It independently inspected all eight
files and runtime imports, and verified the module/schema hashes before/after.

- `npm run check`: exit 0, root 37/37, mobile 12/12, wallet restore 11/11,
  syntax and static checks PASS on final source.
- `npm run test:lead-checkout`: exit 0, 17/17.
- Same explicit `--lead-checkout` PostgreSQL command: 14/14, runner/test/PG
  exit 0; `postgres-baseline-xxy08j/result.json`, port 55450 closed.
- `git diff --check c46f449f 0d839c99`: exit 0; worktree stayed clean.
- No confirmed Critical/High/Medium finding. Remaining coverage gap: attach
  retries are tested sequentially, not simultaneous attach/attach; transaction
  lock serialization was inspected. Add that case in the next acceptance slice.

`AI_REVIEW_GATE=PASS` for this dormant foundation's local publication integration
only. Reviewer closed. The parent inspected the independent result.json and
matching manifest hashes. This approval does not enable HTTP or payments and
does not close the following gates.

Local publication was fast-forwarded `c46f449f -> 0d839c99` after this review,
without source changes. Coordination/report documents are a separate checkpoint;
no GitHub push, `main` update or deployment occurred.

## Next dependent acceptance

1. Signed raw-body test webhook boundary: wrong/missing signature, wrong secret,
   changed byte, stale timestamp, live/connected account and unknown event reject.
2. Durable event identity plus payload digest; replay, changed-payload same-ID,
   concurrency and process restart must never cause another grant.
3. Atomic current eligibility/quote validation, purchase state, event outcome and
   project-specific entitlement. Inject failures at each write and retry safely.
4. Fail-closed handling for refunded/revoked/expired and late paid events. An
   unavailable project cannot be fulfilled; record a reconciliation requirement
   without inventing an automatic refund percentage or initiating a refund.
5. Authenticated no-store HTTP DTOs and rate limits, then a gated installed SDK
   adapter. Server configuration supplies price/origin/account, never the caller.
6. Provider test-mode acceptance and actual browser journey only after separate
   approved configuration. L10 price/buyer cap/verification/disclosure/refund/tax
   and provider-account decisions remain mandatory before real payments.

The product contract carries the detailed boundary. Do not expose a Checkout
button or mark L11/L12 complete based on this foundation.
