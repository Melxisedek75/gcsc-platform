# Paid project brief: local API candidate

Date: 2026-09-30. Scope: L07/L08 API read dependency, not checkout or production.
Initial sections record separate candidates; receiving integration is recorded
at the end. No push, external provider, real payment or real-wallet signing occurred.

## Exact inputs

Backend worktree: `C:/gcsc-platform/.worktrees/backend`, branch
`codex/backend-integration` on `eb760ed0` with pre-existing dirty security work.
That work was retained. Only a new details helper/route and focused test were
added in this slice; earlier unrelated files were not staged or reverted.

- Baseline `services/api/v3/pure-server.js` SHA-256:
  `cd30864a707a5664860e15b058c08425661e4bc846055bf692ed97a9f6913294`.
- Candidate source SHA-256:
  `6e7396beedee0d9d6604b3818eff8ae0b0600f75d6ffd59fe409dc4b5c314653`.
- New `services/api/v3/tests/project-paid-details.test.js` SHA-256:
  `5d95f9abef8d850a21561ff11051095bcba057ffb5d03f1d25cdbecbe63a288e`.
- Byte snapshots: backend `.tmp/paid-project-details-20260930/` files
  `baseline-pure-server.js` and `candidate-pure-server.js`.
- Snapshot diff: one runtime file, 66 inserted lines. These snapshots are local
  ignored evidence, not a committed backend release or independent approval.

## Behavior

`GET /api/projects/:id/details` reads an active owner's own project, or the
allowlisted brief of an open published project for its active paid contractor.
Contractor authority requires the exact project/buyer grant, status `paid`, a
provider reference and non-null verified timestamp. This endpoint does not
create or confirm that grant and does not turn a generic lead token into one.

PostgreSQL uses one parameterized statement joining the current user and matching
project/grant conditions in a single snapshot. JSON uses synchronous current
state checks. No valid JWT yields 401; all authenticated missing/denied/malformed
IDs yield the same 404. Every route response is private/no-store and varies by
Authorization without losing the existing Origin variation.

Paid responses contain exactly nine brief keys; structured location, contact,
attachments, owner identity, payment metadata, competitor bids and arbitrary
future columns are withheld. Raw title/description are owner-supplied private
brief text and may contain personal data: there is NO automatic PII scrubbing.
Contact/disclosure policy and owner-facing consent remain release gates. Public
previews and existing accepted-contract routes are unchanged. The response
contract is recorded in `../product/october-mvp-contract.v1.md`.

## Parent verification

From `backend/services/api/v3`, process-local test configuration (synthetic only):

```powershell
$env:NODE_ENV='test'
$env:JWT_SECRET='local-project-details-test-secret-not-for-deployment-20260930'
$env:DATABASE_URL=''
$env:XPR_TX_VERIFIER_ENABLED='false'
node node_modules\jest\bin\jest.js --runTestsByPath tests/project-paid-details.test.js --runInBand
node node_modules\jest\bin\jest.js --runInBand --silent
```

- Before route implementation: 30 failed, 1 passed (31 total), exit 1. The
  endpoint returned the generic absent-route 404, including for a paid buyer.
- After repair: 31/31, exit 0, local HTTP against the actual API with in-memory
  JSON state, not mocked HTTP responses. Only synthetic users/grants were seeded.
- Full Jest: 13 suites, 285/285, exit 0 (90.104 seconds). This excludes the
  package's explicit PostgreSQL/script-test exclusions, not an all-platform gate.
  A later three-line test-only guard rejects non-test mode or any ambient
  DATABASE_URL before API import. Focused 31/31 passed again after that guard;
  a separate `node -e` require with a dummy PostgreSQL URL confirmed rejection
  before importing the API. Runtime source is unchanged; the full285 result
  precedes only this test guard.
- `node --check services/api/v3/pure-server.js` and `git diff --check` from
  backend root: exit 0. Node 25.9.0 reports the existing `url.parse` deprecation.
- The initial backslash Jest pattern matched no tests and exited 1; it was not
  counted as red behavior or PASS. The recorded runs use `--runTestsByPath`.

Cases cover missing/invalid JWT, exact payload allowlist, owner draft, wrong
buyer/project, generic-token rejection, six non-paid states, missing proof
metadata, revocation, stale roles/inactive users, wrong owner/admin claim,
unpublished/closed/in-progress/escrow offers, malformed IDs and unchanged preview.

## Independent review and PostgreSQL

Read-only reviewer `01a0edd5-92a1-7b42-ac8f-88094d6f5637` completed the
byte-snapshot delta review: **source/local JSON PASS**, no confirmed defects
in the 66-line slice. This is not whole-backend or integration approval.
The reviewer inspected the single-statement authorization snapshot, synchronous
JSON checks, allowlist, no-store/Vary headers, uniform denials and the test guard
before API import. Runtime and final test hashes above matched before/after.

Independent command: the focused Jest command above with the documented
process-local environment, 31/31, exit 0. This independent execution preceded
the test-only guard; the final guard was source-reviewed. The post-guard31/31,
dummy-URL guard check and full285/285 remain parent evidence; full285 preceded
the guard. Reviewer did not run real PostgreSQL and explicitly retained the
raw-text disclosure/consent and provider-verification gates.

QA writer `01a0edde-2fc0-7652-8376-9f3bf6215c25` owns only the separate QA
worktree, initially clean at `ce54d60a`. A fresh measurement found C: free space
4,839,354,368 bytes, changing the old 103 MB/ENOSPC condition.

Parent inspected the resulting native PostgreSQL 18.4 evidence directly:
`qa/services/api/v3/.tmp/postgres-baseline-UDoa3d/result.json` pins source
`6e7396be...` and records PASS, testExitCode 0, postgresExitCode 0, port 64524,
started 08:09:46Z and finished 08:09:57Z on 2026-09-30. `test-output.log` records
14/14 PASS (13 child scenarios plus parent). The expected fixture escrow-insert
exception is part of a passing rollback case, not a failed production action.

New real-SQL cases cover the owner draft details and exact nine-field paid brief,
uniform denied reads, wrong buyer/project, pending/revoked grants, stale roles,
disabled accounts and private caching. The same run retains owner-disable
publication/old-receipt races, bid authorization races, accepted-bid rollback
and draft privacy. An earlier run `postgres-baseline-mLH9zL/result.json` also
records PASS for the same source and clean shutdown; it is not red evidence.

QA commits: `3bdc36d1` adds the scoped tests/evidence and
`011f30c9df929efe317a4ddd06f771ddd677e3aa` clarifies the first-run evidence.
QA worktree is clean. Both runs passed 14/14; the evidence checklist alone was
adjusted before the final rerun, with no backend repair. Commands from QA root:

```powershell
node --check tests/postgres-project-publication.integration.cjs
npm run test:postgres:guards
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin --project-publication
git diff --check
```

Guards 5/5, syntax/diff exit 0. QA verified both cluster ports (63077 and 64524)
closed and the final cluster's `postmaster.pid` absent. Parent verified the
runtime source hash unchanged after QA. Full QA record:
`C:/gcsc-platform/.worktrees/qa/docs/migration/PROJECT-PUBLICATION-POSTGRES-ACCEPTANCE.md`.
None of these tests performs a provider checkout/payment.

## Web consumer candidate

October-web commit `1f68f2e949ea666b6761814bed40234d796b6c0c`, relative to
`74e5618d058f4d360c22053b292d34fa9564568e`, consumes the nine-key paid brief.
It no longer requires a nonexistent `access_status` response field. Only a
successful protected read enables the proposal form; preview metadata cannot
grant access. `getProjectDetails` validates the project ID and response types,
keeps the allowlisted fields and requests `cache: no-store` with the current JWT.

An account/role-keyed panel drops previous private state before rendering the
new identity. Separate latest-request gates discard stale details and proposal
callbacks. Selecting or rechecking a project clears previous private data;
denial, network failure and invalid responses cannot restore it. Bid denial
clears the brief/form. An uncertain POST is not automatically retried. Revocation
is observed on the next read/write, not pushed in real time; the client cannot
recall information previously disclosed to an authorized reader.

Source hashes:

- `apps/web/src/pages/dashboard/ProjectsPanel.tsx`:
  `1800579b9831054efffc72ab41990a1f7e8ee26f86d14350f01a8360d0370ff7`.
- `apps/web/src/services/api.ts`:
  `a51b71f7d0cbdf22850b6285c243471e28e905c8031d613303da3b23cc1649fd`.
- `apps/web/scripts/verify-paid-project-browser.cjs`:
  `27cb2f0dad01a3f20e347e82aa68e0b6a5d34bf9753c066a922f374159c6adb3`.

Parent commands from October-web `apps/web`, all exit 0:

```powershell
node node_modules/typescript/bin/tsc -b
node node_modules/eslint/bin/eslint.js src/pages/dashboard/ProjectsPanel.tsx src/services/api.ts
node scripts/validate-dashboard-live-workflow.mjs
$env:NODE_PATH='C:\Users\rivne\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:GCSC_BROWSER_CHANNEL='msedge'
node scripts/verify-paid-project-browser.cjs
npm run build
```

From October-web root: `npm run test:web-jobs-bids-states` 4/4,
`node scripts/check-web.mjs` and `git diff --check` exit 0. Build transformed
2983 modules in 1m10s; existing stale Browserslist and large-chunk warnings remain.
No dependencies were installed or updated.

Initial complete browser suite on old source: 16 failed / 1 passed, exit 1;
the paid brief did not render and the protected request was absent. A prior
harness attempt with missing import-meta test definitions was interrupted and
is not red behavior evidence. After implementation: 17/17, then expanded 20/20,
unfiltered, actual React/ApiClient with synthetic HTTP in Edge 154.0.4258.37.
Bundle SHA-256 `d52744a63a3cab86a32857508321c204391e4f654c4b535d2aed1e99d5057c17`.
The expanded run includes extra-field narrowing, inert HTML-like brief text,
uncertain submission and same-account role change. This is not real API/DB or
visual acceptance; no styles or payment provider were exercised.

### Independent finding and repair

RIVIERA `01a0f0fd-0955-72e0-aa60-0caf8a412362` returned
`AI_REVIEW_GATE=CHANGES_REQUIRED` for `1f68f2e9`: Medium regression at
`ProjectsPanel.tsx:350`. An accepted contractor's in-progress/completed project
description was stripped when legacy escrow actions were disabled, even though
the existing authorized project route returned it. Independent Git-pinned
browser checks: base 2/2 PASS, candidate 0/2. The original 20-case suite,
types/lint/static/gate tests passed independently but missed this regression.

Parent confirmed the server contract in `isAcceptedProjectContractor` and
reproduced 0/2 with permanent tests before repairing it. Commit
`b1cda59be1d9e37cf2d282a5570444424e163798` keeps the server-authorized accepted
project read separate from both paid-lead access and the legacy action flag.
It does not add escrow actions or allow a new bid. Both regression tests include
a denied refresh, which removes the previously visible private description.

Final ProjectsPanel SHA-256:
`316b708a56eada68e0b1f18df23d197e4a5b2e5ba6f3e91bace2de50633ba044`.
ApiClient hash unchanged. Final harness SHA-256:
`fafabba5a0cb15ce2d75dca21b366a6c450e2b838e3bde5a5c2baf8a82d4d6e0`.
Final bundle SHA-256:
`32be74dea62dc97a9568e41a1ef7217474b3c2fde528ea4e1d4491619087d6b1`.
Parent expanded browser22/22, TypeScript, focused ESLint, dashboard static,
web-state4/4 and diff checks exit0. Final build exit0, 2983 modules, 38.24s,
same pre-existing warnings. RIVIERA independently closed the Medium on exact
`b1cda59b`, with no new confirmed findings: `AI_REVIEW_GATE=PASS` for this slice.
Independent final commands: complete unfiltered browser22/22, TypeScript
`-p tsconfig.app.json --noEmit --incremental false`, focused ESLint `--no-cache`,
dashboard validator, harness syntax and exact-delta `git diff --check`, all exit0.
This remains source/DOM with synthetic HTTP, not real DB or whole-MVP approval.

### Actual browser, API and PostgreSQL evidence

Parent directly inspected QA `services/api/v3/.tmp/postgres-baseline-wZruXv/`
`result.json`, `test-output.log` and `browser-acceptance.json`. Run started
09:05:40Z and finished 09:06:03Z on 2026-09-30: PASS, 1/1 integration test with
five workflow checkpoints; testExitCode0, PostgreSQL18.4 exit0. It pins final
web hashes above and backend `6e7396be...`. Actual React ProjectsPanel/ApiClient
made real HTTP requests to the isolated canonical API with a fresh PostgreSQL
database. Only users/JWTs and the paid grant were synthetic fixtures; API
responses were not mocked.

- Owner created a draft via UI; PostgreSQL confirmed owner and private state.
  Contractor could not see the draft. Owner published via UI and SQL confirmed it.
- Unpaid contractor received protected404, with no private text or bid controls.
- A fixture-created matching paid grant enabled the nine-key brief. The UI
  proposal POST returned201 and PostgreSQL stored the exact buyer/project,
  amount1500, timeline12 and synthetic message. Owner read that proposal via UI.
- After SQL revocation, an already-open proposal was rejected403; reread was404.
  Private text/form disappeared and SQL still contained only the first bid.
  Payment receipts and escrow records stayed at zero.
- No blocked external requests or page errors. HTTP403/404 console messages
  are expected denial cases, not successful requests. API/UI/Edge ports
  63503/63501/63504 closed; Edge exited0, PG port63496 stopped0; cleanupErrors[].

QA commit `f345b2fd60df2cc8f359618b50fb7ab989baccfb` adds the opt-in test and
guarded runner; parent also repeated guard suite6/6, exit0. Reproduction from
QA root (installed tools only):

```powershell
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin --project-browser --playwright-dir C:\Users\rivne\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules
```

The test uses two browser contexts and cross-origin loopback API requests with
an exact process-local CORS allowlist and `local-network-access` permission
granted only to the disposable UI origin. No persistent browser settings or
server security checks were weakened. Before this setup correction, the
intercepted-HTML harness could not reach the first POST. The controlled
`ZoOJgc` diagnostic reproduced the explicit loopback-permission denial with
that permission removed, no requests reaching the API and `Failed to fetch`
in the form. This is not evidence that production CORS or its permission UX
works. Earlier manifest failures and CORS/permission failures remain in QA's
report, not mislabeled application-red or PASS. Successful `TDbqtI` and
`HYy2ZO` precede final `wZruXv`; all have clean shutdown evidence.

This is scoped local data-flow acceptance, not registration/provider checkout,
real payment, wallet, CSS/layout/mobile-device acceptance or a release. Full
commands and diagnostics are in QA's `PROJECT-PUBLICATION-POSTGRES-ACCEPTANCE.md`.
When integrating QA, do not overwrite the canonical publication checklist with
the older QA-branch checklist; reconcile that commit's evidence here instead.

### Whole-backend finding and follow-up repair

Independent reviewer `01a0edd5-92a1-7b42-ac8f-88094d6f5637` reviewed the
entire accumulated dirty backend on `eb760ed0`, including14 dirty files and62
input files. On `6e7396be...` it returned `CHANGES_REQUIRED`: one confirmed
Medium regression in legacy job-posting replay. First confirmation returned200,
but the same tx returned400 instead of409 after publication. Exactly one receipt
and posting remained: this was not duplicate payment or a paid-access bypass.
The review independently passed full Jest285/285 and confirmed source/manifest
stability. Initial patch hash:
`cce6780d9e15bbf7f52964eec2a4ecab061e0adbd38ecaf8ef53debe553a9ca2`.
Local evidence: backend `.tmp/l01-backend-review-20260930/`.

Parent added7 regression cases; before repair3 replay cases failed and4 safety
cases passed. The route now checks authentication, current role, verified wallet
and project ownership before looking up the receipt, then enforces eligibility
for a new payment. Full payment suite33/33 PASS. Default legacy enablement remains
off. The same review also reproduced a pre-existing PostgreSQL wallet-login
crash: `findUserByVerifiedWallet` called missing `normalizeUser`. Parent replaced
it with the existing `normalizeStoredUser`; no signature rules changed.

Final frozen API SHA-256:
`01613262aaac5529cd11abfe298f9a399c2bd93fe52d22a45becda4973a3dd9a`.
Parent full offline Jest:13 suites292/292, exit0 (108.192s), synthetic JWT,
no DATABASE_URL and external connections blocked. QA PostgreSQL18.4
`postgres-baseline-GkZJSQ`:16/16, testExitCode0/postgresExitCode0. New tests prove
local K1 challenge/login, token/profile, single-use proof, five binding denials,
one login audit, and persisted legacy replay after restart without a second
receipt. These are generated test keys and an authority hook, not actual WebAuth
or on-chain authority acceptance. The original14 project/privacy/race checks pass.

Earlier `hnQ1xN` is the real missing-function login red; `yaLUFY` is a harness
route mistake after successful login, fixed to `/api/auth/profile`. Companion
publication metadata now says RUN_FINISHED and points to exit codes, because
Node subtest failure alone does not prevent writing that companion file. Browser
`igsJY4` correctly rejected the old API pin before startup; only that explicit pin
was changed before repeating the same unchanged web journey. Final browser
`postgres-baseline-X3EAmR`:1/1 and five checkpoints PASS on API01613262 and
webb1cda59b; actualHTTP/SQL, no blocked external requests, page errors or failed
requests. Expected403/404 console messages remain. Edge exit0, all test ports
closed, cleanupErrors[], PGexit0.

Independent final reviewer returned `AI_REVIEW_GATE=PASS` for the whole
accumulated backend candidate relative to `eb760ed0`, retaining the declared
baseline limitations. It independently repeated payment33/33, checked PG
result/hash/exit codes and verified that only the API and payments test changed
among the prior62 inputs. It inspected both new QA test diffs; full292/292,
PG16/16 and finalbrowser remain parent evidence. Final browser was still running
at reviewer closeout, so its PASS above is not labeled independent.
Reviewer context is closed; no review process is waiting in the background.

Preserved local commits, with reviewed source hashes unchanged:
- Backend: `c46bd1b45c40bf60bb683027c219b680e91c85f9`, clean, exactly14
  manifest-verified files staged, including the dated historical audit.
- QA: `1bceb8f58dac6840eae614788d72da8b06af0a66`, clean, after `f345b2fd`;
  two tests and evidence only, no replacement of the canonical checklist.
- Web: `b1cda59be1d9e37cf2d282a5570444424e163798`, previously approved.

Follow-up backend manifest:
`.tmp/l01-backend-followup-01613262/manifest.json`, tracked patch SHA-256
`36b54036659b4db03001d012d06830a6859411ad2f2c2c2c2b6e22965fccd0ee`.
QA publication test hash:
`70d112cb8a8bf5e88dd5e68c34e4bb962e5a0ff9aaf521669ec6246b36c14697`;
browser test hash:
`7565764536fda272646ef9a4603a908642b179e0ec7137fb366d1fe7abf4cb47`.

This removes the source-review obstacle for this candidate only. Wallet-binding
atomicity, JSON receipt durability, legacy private-read cache headers, actual
provider settlement and full receiving-tree acceptance remain outside this PASS.
Do not enable or advertise those paths based on this report.

## Open gates

Provider Checkout/webhook, durable real payment confirmation, complete pilot
acceptance, contact/price/refund policy and reviewed publication integration
remain open. The scoped backend source review above passed, but not a full
production security audit. No existing mainnet,
production or live database was used by the parent checks. Source-only or local
DB evidence cannot approve a real payment or production release.

Historical next step: reconcile the five confirmed receiving-tree conflicts documented in
INTEGRATION-ORDER-2026-09-22.md, preserving its migrations/profile/chat fixes,
then revalidate the combined exact candidate. No branch was merged. The UI must
not offer an unimplemented checkout or treat fixture grants as sales.

## Receiving integration on 2026-09-30

Worktree `C:/gcsc-platform/.worktrees/legacy-preservation`, branch
`codex/october-integration-20260930`, started from publication `656a6469`.
Local backend merge `445a54b4` passed independent receiving-tree review;
see `BACKEND-RECEIVING-INTEGRATION-REVIEW.md` for the exact tree and evidence.
API SHA-256 is `f24fdd7d20a658b8d8e60d14b5fe5db8b1b56260269f8c7aa2a3577b5f68ff77`.
Canonical migrations, document/admin ACL and participant chat remain present.
Parent and independent reviewer passed 301/301; parent real PG baseline39/39,
and receiving project suite16/16 (`postgres-baseline-ihRpjb`) passed with
test and shutdown exit0. This does not close real-wallet/payment gates.

QA merge `034f6225` includes `2e6fc4fa` guarded explicit source roots, module
hashes and disposable snapshot support. Source/read guards12/12 pass. Earlier
QA run `9hbuOD` used receiving API plus the separate October-web, not the combined
UI checkout. No claim of combined UI acceptance is based on that run alone.

Incoming October-web `b1cda59b` merged without content conflicts, pending final
combined review. Its five changed runtime files remain byte-identical to that
independently reviewed candidate. Updated adaptation entries retain original
source blobs; root npm commands expose PG guards/schema/local suites and include
the validator/root/schema regressions in default tests. No dependencies changed.

Parent receiving checks so far: `npm run check` exit0 (31 root,12 mobile guards,
11 wallet restore, static/syntax); `npm --prefix apps/web run build` exit0;
lint exit0 with the existing DecryptText warning; auth validator exit0;
web states4/4; real-React synthetic registration browser10/10. Paid browser22
and real receiving API/UI/PostgreSQL journey are running/pending; no PASS yet.
The registration fixture does not contact an actual email/SMS provider.

Whole-MVP L01/L08/L09/L22/L23, provider checkout/webhook, disclosure policy,
voice/AI, marketing/video and production approval remain open. This candidate
is local; publication branch/main and public websites are unchanged.
