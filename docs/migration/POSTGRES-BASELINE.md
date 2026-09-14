# Local PostgreSQL acceptance slice

Date: 2026-09-13 (America/Los_Angeles). Priority: P1.5 / P2.6.
The owner deferred mobile/WebAuth and disk archival. This slice verifies existing
API storage without changing wallet, payment or application runtime code.

## Reproduce

Use Node >=20 and the existing locked dependencies in services/api/v3. The runner
requires a local PostgreSQL bin directory with postgres, initdb and pg_ctl. It does
not install software or require Docker, psql or pg_isready.

```powershell
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
results. Independent review is pending for this new test infrastructure.

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
