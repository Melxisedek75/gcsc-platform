# Project draft/publish/privacy: real PostgreSQL QA

Date: 2026-09-29. Scope: local QA branch `codex/wallet-proof-20260914`; no backend changes or integration.

## Candidate and command

- API source: `C:\gcsc-platform\.worktrees\backend\services\api\v3\pure-server.js` (dirty backend worktree, read-only for this run).
- Source SHA-256: `a38589e559a32d8023bdd176c7f54a4b38703e9b19fb9355d9198e631197f365`.
- PostgreSQL: 18.4, fresh loopback cluster created by the existing guarded runner.

From `C:\gcsc-platform\.worktrees\qa`:

```powershell
npm run test:postgres:guards
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin --project-publication
```

The opt-in suite snapshots the sibling backend API source and its two wallet modules into the disposable run directory. The runner pins the API SHA before launching the test; the test rejects a changed source. The default runner invocation still runs the original baseline.

## Results

- Publication suite: 5/5 PASS, exit 0. Owner created a private draft; anonymous users, another homeowner and a contractor could neither discover it nor bid on it. Anonymous, foreign, inactive and demoted owners could not publish. The active owner published; public list/detail returned only `id`, normalized `title` and `category`, `budget_min`, `budget_max`, `timeline_days`, `status`, and `published_at`. The timestamp matched PostgreSQL. A directly inserted legacy bid on a second private draft could not be accepted; bid, project and escrow state remained unchanged.
- Existing PostgreSQL baseline: 39/39 PASS, exit 0. Guard suite: 5/5 PASS, exit 0. Root `npm test`: 24/24 PASS, exit 0.
- Final publication run report: `C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-ebtDaA\result.json`; TAP output: sibling `test-output.log`; copied-file hashes: sibling `api-files.sha256.json`.
- Baseline run report: `C:\gcsc-platform\.worktrees\qa\services\api\v3\.tmp\postgres-baseline-w51Scs\result.json`.
- Both reports record `postgresExitCode: 0`; after each run, ports 62908 and 61926 had no listener. The clean shutdown removed each cluster's `postmaster.pid`.

This is local API/real PostgreSQL evidence for the exact source hash, not browser/mobile, wallet, payment, production, deployment or independent-review acceptance. The legacy bid was a fixture inserted only into the fresh disposable database. `.tmp` evidence is local and ignored by Git; rerunning produces a new directory and candidate hash.
