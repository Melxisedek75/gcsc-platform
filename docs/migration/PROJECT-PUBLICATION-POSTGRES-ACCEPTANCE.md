# Project draft/publish/privacy: real PostgreSQL QA

Date: 2026-09-29. Scope: local QA branch `codex/wallet-proof-20260914`; no backend changes or integration.

## 2026-09-30 follow-up: PostgreSQL login and legacy receipt repair

Parent resumed the released QA worktree from `f345b2fd` for regression coverage.
Backend source is now pinned to SHA-256
`01613262aaac5529cd11abfe298f9a399c2bd93fe52d22a45becda4973a3dd9a`.
Compared with the earlier `6e7396be...` source it fixes the missing
`normalizeUser` call in PostgreSQL wallet login and checks an existing legacy
job-posting receipt after ownership but before new-payment eligibility.
The QA branch does not contain these backend edits; the runner snapshots the
sibling backend source into its own fresh database directory.

The existing `--project-publication` command completed **16/16, exit0** in
`services/api/v3/.tmp/postgres-baseline-GkZJSQ`. `result.json` records
PostgreSQL18.4, source hash above and clean `postgresExitCode: 0` on port49674.
The previous14 checks remain green. Two new scenarios verify:

- A fresh login challenge, locally generated K1 signature and fixture authority
  hook authenticate exactly one active, verified PostgreSQL wallet binding.
  The JWT then reads `/api/auth/profile`; no password hash is exposed. Reusing
  the proof returns400. Missing, unverified, inactive, wrong-permission and
  ambiguous bindings each return401 with no token. Exactly one login audit row
  is recorded. The hook checks the generated key/account/permission, not a live
  XPR authority lookup. There is no phone, wallet SDK or broadcast acceptance.
- With the legacy flag explicitly enabled inside the disposable API only, one
  synthetic confirmed posting is persisted. After API restart, its replay
  returns409 in open/in_progress/completed states, without invoking a verifier.
  A fresh payment against that published project and a foreign project return400.
  One receipt and one posting remain. The ordinary default-disabled check still
  passes; no real transaction was sent or verified.

Red/diagnostic evidence is retained, not overwritten:
`hnQ1xN` reproduced the actual missing-function400 on login before the repair;
`yaLUFY` reached login200 but failed the test's incorrect `/api/auth/me` route.
The harness now uses the existing `/api/auth/profile`. Node subtest failures do
not reject `await t.test`, so the companion `publication-acceptance.json` now
reports `RUN_FINISHED`, not unconditional PASS; the runner's exit-code-bearing
`result.json` is the verdict. Assertions and the nonzero failure exit are retained.

The browser suite's explicit API pin was updated to the exact new hash, leaving
web pins unchanged. `igsJY4` correctly rejected the old pin before app startup;
it is not an application regression or a passed test. Final browser revalidation
`postgres-baseline-X3EAmR` passed1/1 with all five workflow checkpoints on the
new API hash and unchanged web `b1cda59b`. API responses are real, the grant is a
SQL fixture. No blocked external requests, page errors or failed requests;
expected denied HTTP403/404 remain in the console log. Edge/API/UI ports
60854/60847/60845 closed, Edge exit0, cleanupErrors[], PG port49946 stopped0.
Parent guard suite6/6, syntax/diff exit0; parent
backend full offline Jest13 suites292/292, exit0 (108.192s). These parent checks
are separate from independent review and do not authorize release.

Independent read-only reviewer `01a0edd5-92a1-7b42-ac8f-88094d6f5637`
returned `AI_REVIEW_GATE=PASS` for the accumulated backend delta relative to
`eb760ed0`, plus these QA repairs. It independently ran33/33 focused payment
tests, checked the PG result and verified the new manifest; full292/292 and
browser/PG acceptance remain parent evidence. It did not rerun the final browser
journey. Backend source is preserved in local commit
`c46bd1b45c40bf60bb683027c219b680e91c85f9` with unchanged SHA above. QA source
hashes reviewed: publication test
`70d112cb8a8bf5e88dd5e68c34e4bb962e5a0ff9aaf521669ec6246b36c14697`,
browser test `7565764536fda272646ef9a4603a908642b179e0ec7137fb366d1fe7abf4cb47`.
Provider, real-wallet, baseline hardening and receiving-tree acceptance are not
closed by this bounded source review. No merge, network publication or deploy.

## 2026-09-30: actual Edge -> React/ApiClient -> API -> PostgreSQL

The opt-in `--project-browser` journey passed against the final frozen web
commit `b1cda59be1d9e37cf2d282a5570444424e163798`, not the superseded
`1f68f2e949ea666b6761814bed40234d796b6c0c` candidate. Only QA tests, runner
and documentation changed, starting from QA commit
`011f30c9df929efe317a4ddd06f771ddd677e3aa`. Backend and web sources were read-only.

Exact SHA-256 pins, checked before/after bundling and again after the final run:

| Source | SHA-256 |
| --- | --- |
| Backend `services/api/v3/pure-server.js` | `6e7396beedee0d9d6604b3818eff8ae0b0600f75d6ffd59fe409dc4b5c314653` |
| October-web `apps/web/src/pages/dashboard/ProjectsPanel.tsx` | `316b708a56eada68e0b1f18df23d197e4a5b2e5ba6f3e91bace2de50633ba044` |
| October-web `apps/web/src/services/api.ts` | `a51b71f7d0cbdf22850b6285c243471e28e905c8031d613303da3b23cc1649fd` |

From `C:\gcsc-platform\.worktrees\qa`:

```powershell
node --check scripts/run-postgres-baseline.mjs
node --check tests/postgres-runner.test.mjs
node --check tests/postgres-project-browser.integration.cjs
npm run test:postgres:guards
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin --project-browser --playwright-dir C:\Users\rivne\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules
git diff --check
```

Final checks: syntax/diff exit 0; guards **6/6**; browser journey **1/1** with
**five sequential acceptance checkpoints**, exit 0. The existing baseline and
14/14 project-publication suites were not changed or rerun for this task.
Installed tools only: Node 25.9.0, esbuild 0.27.2 from October-web's existing
node_modules, Playwright 1.62.1, Edge 154.0.4258.37 and PostgreSQL 18.4.
No install or provider request was used.

The test mounts the actual `ProjectsPanel` and actual `ApiClient` in two
isolated browser contexts, using synthetic SQL users and locally signed fixture
JWTs. Only HTML and the esbuild bundle are fulfilled by browser routing. API
requests continue to the real loopback server; other traffic is aborted.
The fresh UI-origin reservation, API listener and Edge control listener use
port 0. Only that disposable UI origin is added to the test process's CORS
configuration and granted browser `local-network-access`. No API security
header, authentication check, response or storage method is mocked. This is
not evidence of a production CORS configuration or its browser permission UX.

The existing runner still strips ambient DB/provider/Node configuration and
checks PostgreSQL PID and canonical data directory before creating its database.
The test additionally requires that exact disposable directory and an empty
public schema. Bound: one 90-second test, 120-second runner child deadline,
two role contexts, five checkpoints, fewer than 100 API requests, bounded UI/SQL
waits and `finally` shutdown. No existing/live database or destructive cleanup.

Verified checkpoints:

1. Owner UI saves a private draft and publishes it; SQL confirms ownership,
   `published=false`/null timestamp then `published=true`/publication timestamp.
   The contractor cannot discover the draft.
2. Unpaid contractor views only the preview; real protected GET returns 404.
   Private title, description and address are absent, no proposal controls and
   no SQL bid exists.
3. A matching synthetic SQL `paid` grant permits the exact nine-key brief.
   Structured address stays hidden. Actual UI `POST /api/bids` returns 201;
   PostgreSQL stores the exact project, contractor, amount, days and message.
4. Owner UI reads that persisted proposal through the real project API.
5. SQL revocation while the composer is open makes the real POST return 403.
   The brief/composer clears, revalidation returns 404, and SQL still has only
   the original bid, zero payment receipts and zero escrow contracts.

Final evidence directory:
`C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-wZruXv`.
It contains `result.json`, `browser-acceptance.json`, `test-output.log`,
`postgres.log`, copied API hashes, the bundle and three screenshots.
`status=PASS`, `testExitCode=0`, `postgresExitCode=0`, `edgeExitCode=0`;
20 actual API requests, all five checkpoints completed, no blocked external
attempt, request failure, page exception or cleanup error. Console records
only the expected HTTP 404/403/404 negative cases. Node's `DEP0169` warning is
retained, not suppressed. The copied API hash matches the pin; the source-input
manifest hashes real files and records esbuild virtual inputs separately.

The final ports were PG **63496**, UI **63501**, API **63503**, Edge **63504**.
`browser-acceptance.json` confirms all three non-PG ports closed; PG log ends
with `database system is shut down`. Independent post-run PowerShell check:

```powershell
$run = 'C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-wZruXv'
$ports = @(63496,63501,63503,63504)
@(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in $ports }).Count
Test-Path -LiteralPath "$run\cluster\postmaster.pid"
```

Results: **0 listeners**, **False** PID-file existence. Earlier successful
runs `TDbqtI` and `HYy2ZO` each passed the same five checkpoints with exits
0/0/0; their PG/UI/API/Edge ports were respectively
51891/59713/59715/64621 and 56591/56596/56598/56599, all checked stopped.
The final run additionally includes failure-only visible-form/validation
diagnostics. All evidence remains local and Git-ignored.

### Preserved harness failures and exact repairs

All run names below are under the same `services/api/v3/.tmp/postgres-baseline-`
prefix and retain `result.json` plus `browser-acceptance.json`. Each failed test
exited 1, each PG exited 0; every launched Edge exited 0. All listed ports were
checked non-listening and all cluster PID files absent. None required app edits.

| Run | Evidence and repair |
| --- | --- |
| `sDd6yD` | Old panel SHA `1800579b...`: manifest tried to read `<define:import.meta.env>` as a file. No Edge or API journey ran. Initial repair excluded angle-bracket virtual inputs; not old-candidate acceptance. |
| `uLn8Q9` | Final panel SHA: same manifest mistake for `(disabled):crypto`; zero steps/API requests. Enumerated actual esbuild inputs, then explicitly excluded both `<...>` and `(disabled):...` namespaces (including stdin), while still requiring the pinned panel/client in the real-file hash manifest. These two results are harness failures, not API red results. |
| `86eLnr` | Edge reached GET 200, then owner POST 403. The random same-origin UI address was not in the API's import-time CORS allowlist. Response text was not captured, so the precise rejection body is not claimed. Added a separately reserved port-0 UI origin to the test-only CORS environment before importing the API; browser request headers were not rewritten. |
| `8aQshP` | First-owner-POST timeout with no API requests. This run lacked console/request-failure/visible-form evidence, so its exact browser error was not recorded. Added those diagnostics and an origin-scoped loopback permission; `TDbqtI`/`HYy2ZO` passed. |
| `ZoOJgc` | Controlled repeat of the intercepted-HTML setup with only loopback permission temporarily removed, after the two green runs. Both fetches failed `net::ERR_FAILED`; console explicitly says `Permission was denied for this request to access the loopback address space`; visible form says `Failed to fetch`, native `validation=[]`, API requests remain empty. This confirms the permission cause for this harness configuration, not all plain localhost pages. Restored the scoped permission; final `wZruXv` passed. |

The test now captures console errors, request failures and, on failure, visible
text plus native validation messages for at most two pages. The diagnostic
permission removal is not in the committed test.

Limitations: actual component/ApiClient/API/SQL acceptance, not full-app routing,
login/registration, CSS/layout/mobile acceptance or a production build. The
component harness intentionally omits application CSS. Paid grants are direct
synthetic SQL fixtures, not provider/payment acceptance. No checkout, wallet,
network provider, settlement, bid acceptance, escrow/milestone workflow,
deployment, merge or whole-MVP approval is claimed. The parent's 22/22
synthetic-HTTP browser results and accepted-project read review are separate
evidence, not additional real-PG cases here. Earlier blocked/red history below
is unchanged.

## 2026-09-30: paid-details acceptance on the current source

The previously recorded `initdb` ENOSPC condition changed. The QA-only suite
was extended without changing the runner guards or the backend candidate.
Current `pure-server.js` SHA-256:
`6e7396beedee0d9d6604b3818eff8ae0b0600f75d6ffd59fe409dc4b5c314653`.

From `C:\gcsc-platform\.worktrees\qa`:

```powershell
node --check tests/postgres-project-publication.integration.cjs
npm run test:postgres:guards
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin --project-publication
git diff --check
```

The final opt-in run on fresh local PostgreSQL 18.4 passed **14/14**; the
previous owner publication, legacy receipt and bid/escrow concurrency checks
remained in the same full suite. The new tests verify an active owner can read
their own private draft, while anonymous callers receive 401 and other owners,
contractors, inactive owners and stale-role owners receive the same private 404.
For an open published offer, only a matching, currently active contractor with
a verified `paid` entitlement receives exactly the nine-key brief:
`id`, `title`, `description`, `category`, `budget_min`, `budget_max`,
`timeline_days`, `status`, `published_at`. It contains no structured location,
contact, attachment, homeowner, bid or payment fields. A grant for another
project, no grant, `pending`, `failed`, `expired`, `refunded`, `revoked`, stale
contractor role, inactive contractor, unpublished draft and closed offer all
return the same 404 body. The 200, 401 and 404 details responses have
`Cache-Control: private, no-store` and `Vary: Authorization`. Direct SQL checks
confirm details reads create no bids or payment records.

Final report: `C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-UDoa3d\result.json`.
The same directory holds `test-output.log`, `publication-acceptance.json` and
`api-files.sha256.json`; the copied `pure-server.cjs` SHA matches the candidate.
`status=PASS`, `testExitCode=0`, `postgresExitCode=0`. After shutdown, port
64524 was not listening and `cluster/postmaster.pid` was absent. Guards passed
5/5; syntax and diff checks exited 0.

The first run on the same source is
`C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-mLH9zL\result.json`:
it also passed 14/14 with `testExitCode=0` and `postgresExitCode=0` (port
63077). Its TAP contains `[ERROR] fixture escrow insert failure` because the
atomicity test deliberately installs a trigger that rejects an escrow insert;
the API returns 500 and the test verifies transaction rollback. This was an
expected negative case, not a first-run failure, and required no backend repair.
Only the QA evidence-check list was updated before the final `UDoa3d` rerun.
The parent reports a separate narrow independent source review of the new
+66-line endpoint as PASS with no findings; this QA run did not repeat that
review or perform integration.

Paid entitlements in this test are synthetic SQL fixtures, not proof of a real
payment or provider callback. No wallet, live database, network provider,
browser/mobile client, production deployment or independent review was tested.
The nine-key projection does not redact contact information a user might type
into the free-form `description`. This result does not approve the whole MVP or
erase the earlier blocked and red results below.

## Historical follow-up: publication review findings before disk recovery

An independent read-only review of the previous backend SHA
`78331e5226b3a4e3236256375e2c8a125624f379a73b253c7103252a6b74f584`
found two additional publication bypasses: a concurrent owner disable after the
free-publish route check, and confirmed old `job-posting` receipts publishing
without checking current owner/project eligibility. The backend owner added a
transactional owner row lock and guarded receipt publication. New candidate
SHA-256: `cd30864a707a5664860e15b058c08425661e4bc846055bf692ed97a9f6913294`.

This QA branch now contains two real-PostgreSQL race tests using
`pg_blocking_pids` for those paths. **They have not passed or failed against the
new source:** the first runner attempt ended in `initdb.exe: No space left on
device`, before any test ran. That attempt still pinned the **old** source SHA,
not the new candidate. The report is
`services/api/v3/.tmp/postgres-baseline-BMWLhS/result.json`. C: had about
103 MB free. There were 39 stopped generated test clusters (~2.1 GB), but
removal was denied by the tool policy; no alternate deletion was attempted.
The backend owner's local Jest run passed 254/254 tests and fake-PG smoke,
syntax, diff checks passed; this does not replace the real-PG race checks.
Independent re-review of the new SHA was unavailable due to agent capacity.
Keep this candidate out of integration until disk space, exact-SHA real-PG
checks and independent review are resolved.

## Candidate and command

- API source: `C:\gcsc-platform\.worktrees\backend\services\api\v3\pure-server.js` (dirty backend worktree, read-only for this run).
- Source SHA-256: `78331e5226b3a4e3236256375e2c8a125624f379a73b253c7103252a6b74f584`.
- PostgreSQL: 18.4, fresh loopback cluster created by the existing guarded runner.

From `C:\gcsc-platform\.worktrees\qa`:

```powershell
npm run test:postgres:guards
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin --project-publication
```

The opt-in suite snapshots the sibling backend API source and its two wallet modules into the disposable run directory. The runner pins the API SHA before launching the test; the test rejects a changed source. The default runner invocation still runs the original baseline.

## Results

- Publication suite against the listed backend SHA: 10/10 PASS, exit 0. Owner created a private draft; anonymous users, another homeowner and a contractor could neither discover it nor bid on it. Anonymous, foreign, inactive and demoted owners could neither create nor publish a draft with a stale token. The active owner published; public list/detail returned only `id`, normalized `title` and `category`, `budget_min`, `budget_max`, `timeline_days`, `status`, and `published_at`. The timestamp matched PostgreSQL. A directly inserted legacy bid on a second private draft could not be accepted; bid, project and escrow state remained unchanged.
- The added real-PostgreSQL check proves that no grant, a grant for another project, `pending`, and `revoked` all deny bid creation; a matching `paid` grant with provider reference and verification timestamp permits it. A PostgreSQL constraint rejects `paid` without `verified_at`. The test inserts only local fixtures; no checkout, provider callback, wallet signature or real payment was executed.
- A current owner cannot accept a prior bid from a disabled contractor. A deliberately failing `escrow_contracts` insert returned 500 and left project `open`, bid `pending`, and zero escrow records. Before the transaction fix, the same test failed: the project remained `in_progress`; red evidence is `services/api/v3/.tmp/postgres-baseline-jesh43/result.json`.
- A held, uncommitted project close, paid-access revocation or contractor disable now blocks concurrent bid creation; after commit, the API returns 404 or 403 and stores no bid. The initial race test failed against SHA `845bc5e034f860f6d657d9f74b4d8139e3b6822efcda4fd5a6d8298de88d0b2e`: the old API returned 201 while the close transaction was still open (`services/api/v3/.tmp/postgres-baseline-Fy1Ik7/result.json`). The contractor-disable case failed against intermediate SHA `decbef8cfbb9d773760a5719f52e1061e0f209017cd09d814344ba50554ac373` (`services/api/v3/.tmp/postgres-baseline-rYsyPn/result.json`). The new transaction locks the project, exact paid entitlement and active contractor through bid insert.
- Acceptance now rechecks the owner, contractor and required document rows inside its PostgreSQL transaction. The contractor test first failed on the intermediate SHA above: a concurrent disable still allowed status 200 and escrow creation (`services/api/v3/.tmp/postgres-baseline-tZ2CBV/result.json`). Independent review of SHA `2f67e7977d26db9674d54a14f269049a5171b35b2f326ead8769919f601f7b8c` found an owner-role race; a new test reproduced status 200 while the owner-disable transaction was open (`services/api/v3/.tmp/postgres-baseline-91MxUx/result.json`). The final run confirms an API query is blocked by the fixture's PostgreSQL row lock before commit, then returns 409 and rolls back the project update. This does not prove every financial workflow race is closed.
- The legacy `/api/payment/job-posting` returned 409 on the prior SHA when a wallet-free owner attempted the obsolete XPR charge (`services/api/v3/.tmp/postgres-baseline-ohpUVU/result.json`). It now returns 410 with `legacy_job_posting_disabled` by default, without creating a payment record. Prior receipt reconciliation remains available; the opt-in legacy route's mocked tests are separately exercised in Jest. This is no live payment-provider validation.
- Backend candidate Jest on the listed final SHA: 12 suites, 253/253 PASS, exit 0; fake-PG smoke, `node --check` and `git diff --check` PASS. The separate QA-branch PostgreSQL baseline 39/39 PASS does not run the backend candidate and must not be cited as that candidate's full PG workflow. Guard suite 5/5 and root `npm test` 24/24 are previous QA-branch evidence, not rerun for this follow-up.
- Final publication run report: `C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-rTfuJV\result.json`; TAP output: sibling `test-output.log`; copied-file hashes: sibling `api-files.sha256.json`.
- QA-branch baseline run report: `C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-9J3Op2\result.json`.
- Both reports record `postgresExitCode: 0`; after each run, ports 62908 and 61926 had no listener. The clean shutdown removed each cluster's `postmaster.pid`.

This is local API/real PostgreSQL evidence for the exact source hash, not browser/mobile, wallet, payment, production, deployment or independent-review acceptance. The legacy bid was a fixture inserted only into the fresh disposable database. `.tmp` evidence is local and ignored by Git; rerunning produces a new directory and candidate hash.

The earlier 5/5 publication run used backend SHA-256
`a38589e559a32d8023bdd176c7f54a4b38703e9b19fb9355d9198e631197f365`.
It did not cover paid-entitlement enforcement; its local report remains at
`services/api/v3/.tmp/postgres-baseline-ebtDaA/result.json`.
The intermediate 6/6 paid-entitlement run used SHA-256
`b02aadbccb6b7126ec9a15410c4781f68eec67e330f79815f419ca48aa1bd9ec`;
its report remains at `services/api/v3/.tmp/postgres-baseline-GMzrc1/result.json`.
The 7/7 atomicity run before the stale-owner creation guard used SHA-256
`f6492cbbc745f22316e799ed0474e0b26dc38574385b75691ff559fba99b4e63`;
its report remains at `services/api/v3/.tmp/postgres-baseline-HoMu11/result.json`.
