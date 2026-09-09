# PostgreSQL baseline - 2026-09-09

Status: local API PASS; real PostgreSQL NOT RUN. Independent review pending.

Existing postgres-storage-smoke.js and postgres-workflow-smoke.js use fake Pool
implementations; these do not prove SQL compatibility or real database behavior.
payment-receipts-postgres.test.js is the real database suite, excluded by default.
Its beforeEach truncates tables. Added local-test-database.cjs validation before
storage initialization: literal IPv4/IPv6 loopback, gcsc_test_* database name,
PostgreSQL scheme and no URL options/fragment. This reduces accidental targeting;
operator must still supply a newly created isolated database, never a forwarded
production port. No database connection or table cleanup was performed this run.

Evidence:
- npm ci --ignore-scripts --no-audit --no-fund: installed 587 API packages.
- node scripts/run-api-tests.mjs: 3 suites, 87/87 PASS (QA baseline, not backend candidate).
- node --test tests/local-test-database.test.mjs tests/migration.test.mjs: 9/9 PASS.
- git diff --check: PASS.
- Docker Desktop started locally with hidden window. Initial daemon pipe absent;
  subsequent bounded docker info timed out at 15 seconds. PostgreSQL not started.

Next: inspect Docker engine readiness and local diagnostics; create a dedicated
loopback-only disposable PostgreSQL database when available. Run the existing
receipt suite with an explicit test URL through a sanitized environment. Preserve
production configuration and do not read .env files. Do not label mocks as SQL tests.
