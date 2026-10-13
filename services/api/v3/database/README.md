# Canonical PostgreSQL Schema

`pure-server.js` is the active API. Its schema is defined once in
`schema-statements.cjs`; `migrate-schema.cjs` owns transaction, lock and preflight.
The same ordered statements can be exported without starting the API:

```powershell
npm run db:migrations:check
npm run db:migrate -- --print-sql
```

`db:migrate` without `--print-sql` refuses to run. Exporting does not connect to a
database or read DATABASE_URL. Application startup still invokes this schema
through initStorage when PostgreSQL is explicitly configured.

This repeatable bootstrap/upgrade supports fresh databases and the tested
canonical v3 additive/legacy-action shapes. It is not a versioned conversion of
all old databases. Known incompatible v2/Express shapes are rejected. Never
change the preflight merely to force an unknown database through it.

The adjacent historical `.sql` files are provenance, not the active migration
sequence. In particular, do not combine `init.sql` or `schema_v3_migration.sql`
with the canonical recipe. Future upgrades must preserve existing data and have
fresh/upgrade/rollback coverage; destructive changes need separate migration work.

Acceptance: root `npm run test:postgres:schema` and `npm run test:postgres:local`
with an explicit PostgreSQL binary path. The latter creates and stops a new
owned loopback cluster. See `docs/migration/POSTGRES-BASELINE.md` at repo root.
Local/static readiness is not production approval: existing schema inventory,
backup/restore, independent review and explicit release approval remain required.
