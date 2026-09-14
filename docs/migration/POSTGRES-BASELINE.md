# Local PostgreSQL acceptance slice

Date: 2026-09-13 (America/Los_Angeles). Priority: P1.5 / P2.6.
The owner deferred mobile/WebAuth and disk archival. The original baseline below
did not change runtime code; the following migration follow-up changes schema
initialization only, not wallet/payment business behavior.

## Canonical Migration Follow-Up

Branch: codex/postgres-migrations-20260913, based on
57b8ff21f6da14ff0028394d393b17ea311260db. Independent review is pending.

- Reproduced SQLSTATE23514 against the unmodified runtime: legacy action values
  were updated before the CHECK constraint allowing only those old values was
  removed. Evidence: .tmp/postgres-baseline-ngU9n4/result.json; PostgreSQL stopped0.
- Moved all90 SQL statements, without semantic edits, into
  services/api/v3/database/schema-statements.cjs. Only DROP/UPDATE ordering changed.
  API initStorage and the SQL exporter share database/migrate-schema.cjs.
- Migration uses one connection, BEGIN/COMMIT, advisory transaction lock, bounded
  lock/statement waits, rollback on error and release/discard of the connection.
  Bootstrap admin remains a separate step after successful schema initialization.
- Known v2/Express shapes fail preflight with0A000 before DDL. This is not a generic
  conversion of every historical schema. Old SQL files remain untouched as history.
- db:migrate no longer executes the obsolete psql chain. With no argument or
  --apply it refuses execution. --print-sql exports a transaction without reading
  credentials, importing the API, contacting a database or applying it.
- Migration readiness checks the canonical local recipe and explicitly states
  that production readiness is not established. Live schema inventory and a
  successful backup/restore drill are still release prerequisites.

Verified commands from the QA worktree:

```powershell
npm run test:postgres:schema
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin
npm run check
npm run test:api
npm --prefix services/api/v3 run test:pg-storage
```

Results: schema5/5 + static readiness PASS; PostgreSQL18.4:15/15 (14 scenarios plus
parent), root48/48 + readiness/syntax/static PASS, API159/159 in5 suites PASS,
fake-PG storage smoke PASS. Node25.9.0; Node20 CI still unverified.
Real DB evidence: services/api/v3/.tmp/postgres-baseline-7Ow6Av/result.json,
testExitCode0 and postgresExitCode0. The retained canonical-schema.sql and
api-files.sha256.json identify the SQL and copied source used in that run.

New real-PG cases prove: all four legacy action conversions retain rows; SQL export
and API startup produce identical columns/constraints/indexes; repeat execution;
additive upgrade preserves users/projects/receipts; invalid data rolls back DDL,
converted values and CHECK removal; two simultaneous migrations serialize; the
actual old database/init.sql is rejected without changing its schema.
No payment was broadcast or financial contract accepted; all rows are fixtures.

### Additional Test Findings

The first API159 run overlapped an old fake-PG workflow and produced EBUSY on the
checkout JSON file (158/159). That legacy workflow deleted its hardcoded QA
gcsc.db at start/end. Two other Jest suites also used that same ignored file.
The affected Jest suites now isolate JSON IO like the existing payment fixtures;
the workflow uses unique copied API/schema files with sanitized environment and
retains its own scratch data. The checkout JSON file is absent after the legacy
cleanup; the corrected tests do not recreate/read/delete it. No production DB or
publication-worktree data was accessed. The corrected API159 run passed.

The extra `npm --prefix services/api/v3 run test:pg-workflow` remains FAIL at bid
acceptance:400 wallet_missing, not a migration failure. Its fixture supplies
metadata but no verified ownership. This is independently reproducible using the
pre-change57b8ff21 API byte snapshot in the same isolated wrapper (fixtures
gcsc-fake-pg-workflow-eSp6ii vs current Pp3VXD). Assertions and ownership checks
were not weakened. Full workflow acceptance remains open under P3.1/P2.2.

Next: obtain matching pg_dump/pg_restore for a local backup/restore drill when
available; meanwhile continue non-wallet product persistence/permission checks.
No migration integration, source push, mobile build or deployment is authorized
by this test result alone.

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

## Original Baseline Scope And Results

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

## Original Baseline Limits

Fixture users and application JWTs are generated locally. Registration, email/SMS,
wallet ownership/signing, payment endpoint idempotency, receipt reconciliation,
bid acceptance/escrow, UI, phone, backup/restore and production are not covered.
Schema checks exercise initStorage, not every standalone SQL migration or upgrade.
API module restart is not an OS-process or database-server crash recovery drill.
Node reports the pre-existing url.parse deprecation warning; it is not suppressed.
P2.6 remains partial until its migration, workflow/race and restore checks pass.

## Original Migration Gap (Addressed By Follow-Up Above)

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
