# Project draft/publish/privacy: real PostgreSQL QA

Date: 2026-09-29. Scope: local QA branch `codex/wallet-proof-20260914`; no backend changes or integration.

## Candidate and command

- API source: `C:\gcsc-platform\.worktrees\backend\services\api\v3\pure-server.js` (dirty backend worktree, read-only for this run).
- Source SHA-256: `845bc5e034f860f6d657d9f74b4d8139e3b6822efcda4fd5a6d8298de88d0b2e`.
- PostgreSQL: 18.4, fresh loopback cluster created by the existing guarded runner.

From `C:\gcsc-platform\.worktrees\qa`:

```powershell
npm run test:postgres:guards
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin --project-publication
```

The opt-in suite snapshots the sibling backend API source and its two wallet modules into the disposable run directory. The runner pins the API SHA before launching the test; the test rejects a changed source. The default runner invocation still runs the original baseline.

## Results

- Publication suite against the listed backend SHA: 7/7 PASS, exit 0. Owner created a private draft; anonymous users, another homeowner and a contractor could neither discover it nor bid on it. Anonymous, foreign, inactive and demoted owners could neither create nor publish a draft with a stale token. The active owner published; public list/detail returned only `id`, normalized `title` and `category`, `budget_min`, `budget_max`, `timeline_days`, `status`, and `published_at`. The timestamp matched PostgreSQL. A directly inserted legacy bid on a second private draft could not be accepted; bid, project and escrow state remained unchanged.
- The added real-PostgreSQL check proves that no grant, a grant for another project, `pending`, and `revoked` all deny bid creation; a matching `paid` grant with provider reference and verification timestamp permits it. A PostgreSQL constraint rejects `paid` without `verified_at`. The test inserts only local fixtures; no checkout, provider callback, wallet signature or real payment was executed.
- A current owner cannot accept a prior bid from a disabled contractor. A deliberately failing `escrow_contracts` insert returned 500 and left project `open`, bid `pending`, and zero escrow records. Before the transaction fix, the same test failed: the project remained `in_progress`; red evidence is `services/api/v3/.tmp/postgres-baseline-jesh43/result.json`.
- Backend candidate Jest on the listed final SHA: 12 suites, 253/253 PASS, exit 0; fake-PG smoke, `node --check` and `git diff --check` PASS. The separate QA-branch PostgreSQL baseline 39/39 PASS does not run the backend candidate and must not be cited as that candidate's full PG workflow. Guard suite 5/5 and root `npm test` 24/24 are previous QA-branch evidence, not rerun for this follow-up.
- Final publication run report: `C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-YGfA7d\result.json`; TAP output: sibling `test-output.log`; copied-file hashes: sibling `api-files.sha256.json`.
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
