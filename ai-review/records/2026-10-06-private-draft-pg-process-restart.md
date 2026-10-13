# AI Review Record

- Change ID: 2026-10-06-private-draft-pg-process-restart
- Repository: gcsc-platform
- Branch: codex/monorepo-publication
- Scope: test-only isolated PostgreSQL process restart for L06
- Author AI: CODEX (publication coordinator)
- Reviewer AI: separate CODEX context `01a1100e-6250-7b73-8372-493928ae1151`
- Reviewer decision: APPROVED for this test-only diff; no remaining P1-P3
- Live-risk and deploy decisions: BLOCKED

## Evidence

The opt-in `project-draft-edit` suite stops the local API and its pool, restarts
the disposable PostgreSQL cluster with its own `pg_ctl`, requires a different
postmaster PID and the same data directory, reconnects, and verifies that the
owner's edited title, description and location survive. The runner stops the
current postmaster PID, including after restart, and records that it changed.

| Check | Result |
|---|---|
| Local PG 18.4 process restart | 5/5 `HzcBFJ`, `AqlC1J`, `MC7jwO`; each `postgresRestarted=true`, test/PG exits 0 |
| Independent reviewer run | 5/5 `Jddllj`; `postgresRestarted=true`, test/PG exits 0, no `postmaster.pid` after shutdown |
| Shared runner regression | baseline PG41/41 `pYPGH7`; Edge/API/PG browser1/1 `iAOYXs`; test/PG exits 0 |
| Static/regression checks | runner12/12, root check, syntax and `git diff --check` PASS |

The first restart used inherited stdio and took about 60 seconds; the narrow
test harness fix uses ignored stdio and checks the spawn error. Reviewer found
a cross-platform P2 in a Windows-only `pg_ctl.exe` assertion. The final
assertion follows the runner's platform-specific executable name, and the
reviewer approved the corrected diff. Linux/macOS were not run.

No existing PostgreSQL cluster, live database, provider, payment or deployment
was touched. This approval is not a formal CODEX/CLAUDE source gate or full
L06 acceptance.
