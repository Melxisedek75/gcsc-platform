import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderSchemaSql } from '../database/migrate-schema.cjs';

export function main(args = process.argv.slice(2)) {
  if (args.length !== 1 || args[0] !== '--print-sql') {
    throw new Error('No database was changed. Use db:migrate -- --print-sql to export the canonical SQL. Applying it requires a separately selected database, verified backup and release approval.');
  }
  process.stdout.write(renderSchemaSql());
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
