# Local PostgreSQL acceptance slice

Date: 2026-09-13 (America/Los_Angeles). Priority: P1.5 / P2.6.
The owner deferred mobile/WebAuth and disk archival. This slice verifies existing
API storage without changing wallet, payment or application runtime code.

## Reproduce

Use Node >=20 and the existing locked dependencies in services/api/v3. The runner
requires a local PostgreSQL bin directory with postgres, initdb and pg_ctl. It does
not install software or require Docker, psql or pg_isready.

```powershell
Set-Location C:\gcsc-platform\.worktrees\qa
npm run test:postgres:guards
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin
npm run check
npm run test:api
```

The absolute binary directory above is this workstation's existing PostgreSQL
18.4 installation, not a source dependency on an older repository. Supply the
appropriate binary directory on another workstation.

## Isolation

- Each run creates a new cluster beneath services/api/v3/.tmp/postgres-baseline-*.
- Loopback-only PostgreSQL, random port and random disposable password; no ambient
  database URL, provider credentials or Node injection settings reach the tests.
- Verify the spawned PID and PostgreSQL data directory before creating a database.
- The database must be empty. Tests never truncate or migrate an existing database.
- The canonical pure-server.js is copied byte-for-byte into the run directory so
  its hardcoded JSON database path cannot read/write the original gcsc.db.
- The API is imported, bound to an ephemeral loopback port and closed after tests.
  Its standalone chain-verifier/reconciler startup path is not invoked.
- PostgreSQL is stopped in finally. Disposable data, source SHA-256 and result.json
  remain in the run directory as local evidence. No cleanup of old files occurs.

## Scope And Results

The first successful run used real PostgreSQL 18.4. All 8 scenarios (9 Node test
results including the parent) passed; PostgreSQL and test processes exited 0.
Evidence: services/api/v3/.tmp/postgres-baseline-ZUU0yU/result.json (port 52286).
The general npm run check passed 43 tests plus syntax/static checks. The isolated
API regression runner passed all 159 tests across five suites, exit 0. Those API
regressions still use their existing mocks and are distinct from the nine real-PG
results. Independent review APPROVED the exact source commit below.
Node runtime: v25.9.0 on Windows. Node20 CI was not run during this local slice.

1. HTTP health reports PostgreSQL; repeated runtime schema setup retains users.
2. Anonymous users and contractors cannot create homeowner projects.
3. Project creation persists the authenticated owner and an audit event.
4. My-projects separates owners; discovery filters category and location.
5. Anonymous/homeowner bids and bids for missing projects are rejected.
6. Contractor bid, audit and personal listings persist; payload cannot select owner.
7. Actual PostgreSQL rejects unknown roles/orphan bids; concurrent duplicate SQL
   receipt writes produce one row and one unique-constraint error.
8. Recreating the API module and database connections reads the existing project
   and bid even though the new in-memory arrays are empty.

Initial failed run: PostgreSQL itself started, but this local binary distribution
has no pg_isready. The runner now probes through the existing pg driver instead.
The failed cluster was shut down normally and retained as evidence.

## Limits

Fixture users and application JWTs are generated locally. Registration, email/SMS,
wallet ownership/signing, payment endpoint idempotency, receipt reconciliation,
bid acceptance/escrow, UI, phone, backup/restore and production are not covered.
Schema checks exercise initStorage, not every standalone SQL migration or upgrade.
API module restart is not an OS-process or database-server crash recovery drill.
Node reports the pre-existing url.parse deprecation warning; it is not suppressed.
P2.6 remains partial until its migration, workflow/race and restore checks pass.

## Next Confirmed Gap

`node services/api/v3/scripts/check-migration-readiness.mjs` exits 1: it expects
services/api/database/schema.sql, deliberately excluded from the active import
(original blob 66f697b6790fb9e9f88249ac75dd82f21ce954f4, retained in provenance).
The v3 SQL file explicitly requires the v2 schema first. Do not remove this gate
or blindly copy the legacy schema into deployment: reconcile it with initStorage
and verify fresh/upgrade paths in separate disposable databases.
The installed minimal PostgreSQL distribution also lacks pg_dump and pg_restore;
those utilities are required for the existing backup/restore scripts and have not
been downloaded in this slice.

## Historical Baseline (2026-09-09)

The following evidence predates this real PostgreSQL slice and remains useful for
understanding why the mock suites cannot close database acceptance:

Existing postgres-storage-smoke.js and postgres-workflow-smoke.js use fake Pool
implementations. payment-receipts-postgres.test.js is excluded by default and its
beforeEach truncates tables. local-test-database.cjs was added to validate literal
IPv4/IPv6 loopback, gcsc_test_* names and absence of URL options/fragment. A fresh
isolated database is still required; a forwarded production port is not safe.

Historical commands: API npm ci installed 587 packages; run-api-tests passed 3
suites / 87 tests; local database guards plus migration tests passed 9/9; diff
check passed. Docker was started with a hidden window but daemon access timed out
after 15 seconds. No real PostgreSQL was started and no SQL cleanup occurred then.
The current native-binary runner makes Docker recovery unnecessary for this slice.

## Independent Review

Reviewer: Beauvoir, separate Sol/high execution
01a09e82-0111-7803-ba04-dac9514c52a5. Verdict: APPROVED, no findings.
Range: a0834ac7917c3de57ebc02fb542814561469bca2..
e9f954fbb105ba4f6e05ff54c860ecaffec6ff28.
Independently repeated guards4/4 and PostgreSQL18.4 baseline9/9 with exit0;
services/api/v3/.tmp/postgres-baseline-dm5Jg3/result.json records testExitCode0
and postgresExitCode0. Checked normal database shutdown, no surviving test
processes, matching API snapshot SHA-256 and unchanged canonical gcsc.db.
Root43/43 and API159/159 are parent evidence, not repeated by the reviewer.
Subsequent changes are documentation/checkpoint only. Source is on the candidate
branch; it has not been merged or deployed.
