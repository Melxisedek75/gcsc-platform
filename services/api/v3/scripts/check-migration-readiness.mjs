import fs from 'node:fs';
import { migrationStatements, renderSchemaSql, schemaDigest } from '../database/migrate-schema.cjs';

const api = fs.readFileSync(new URL('../pure-server.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const errors = [];
if (!api.includes("require('./database/migrate-schema.cjs')") || !api.includes('await migrateSchema(getPgPool())')) {
  errors.push('API startup must use the canonical schema migrator');
}
if (pkg.scripts['db:migrate'] !== 'node scripts/migrate-postgres.mjs') {
  errors.push('db:migrate must use the canonical SQL exporter, not historical v2 migrations');
}
if (migrationStatements.length < 1 || !renderSchemaSql().endsWith('COMMIT;\n')) {
  errors.push('Canonical transaction is missing');
}
console.log('GCSC canonical migration readiness check (local/static only)');
console.log('Schema: v3/database/schema-statements.cjs');
console.log('Executor/export: v3/database/migrate-schema.cjs');
console.log(`Statements: ${migrationStatements.length}; SHA256: ${schemaDigest}`);
console.log('Historical *.sql files are retained for provenance; do not run the old v2/Express sequence.');
console.log('Production readiness is NOT established: live schema inventory, backup/restore and release approval remain required.');
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('migration readiness ready: canonical local recipe available');
}
