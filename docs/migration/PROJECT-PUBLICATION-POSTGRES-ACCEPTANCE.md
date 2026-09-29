# Project draft/publish/privacy: real PostgreSQL QA

Date: 2026-09-29. Scope: local QA branch `codex/wallet-proof-20260914`; no backend changes or integration.

## Follow-up: publication review findings, not yet PostgreSQL-accepted

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
