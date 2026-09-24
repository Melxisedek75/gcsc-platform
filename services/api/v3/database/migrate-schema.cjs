const { createHash } = require('node:crypto');
const { statements } = require('./schema-statements.cjs');

const preflight = `DO $gcsc$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('projects', 'category'), ('projects', 'timeline_days'),
      ('bids', 'message'), ('bids', 'proposed_timeline_days'),
      ('milestones', 'title'), ('milestones', 'verified_by')
    ) AS required(table_name, column_name)
    WHERE to_regclass(format('%I.%I', current_schema(), required.table_name)) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns AS actual
        WHERE actual.table_schema = current_schema()
          AND actual.table_name = required.table_name AND actual.column_name = required.column_name
      )
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'milestones' AND column_name = 'milestone_index'
  ) THEN
    RAISE EXCEPTION 'Unsupported legacy schema: audited data conversion is required' USING ERRCODE = '0A000';
  END IF;
END
$gcsc$`;

// Both entrypoints use the same transaction, lock, preflight and ordered SQL.
const migrationStatements = Object.freeze([
  "SET LOCAL lock_timeout = '15s'",
  "SET LOCAL statement_timeout = '60s'",
  'SELECT pg_advisory_xact_lock(1195594579, 1)',
  preflight,
  ...statements,
]);
const schemaDigest = createHash('sha256').update(migrationStatements.join(';\n')).digest('hex');

function renderSchemaSql() {
  return `-- GCSC pure-server repeatable schema, sha256 ${schemaDigest}\n`
    + '-- Only fresh or explicitly tested canonical v3 databases; not an arbitrary legacy conversion.\n'
    + ['BEGIN', ...migrationStatements, 'COMMIT'].map(sql => `${sql};`).join('\n\n') + '\n';
}

async function migrateSchema(pool) {
  const client = await pool.connect();
  let failure;
  try {
    await client.query('BEGIN');
    for (const sql of migrationStatements) await client.query(sql);
    await client.query('COMMIT');
    return { schemaDigest, statementCount: migrationStatements.length };
  } catch (error) {
    failure = error;
    try { await client.query('ROLLBACK'); } catch { /* Discard a broken connection below. */ }
    throw error;
  } finally {
    client.release(failure);
  }
}

module.exports = { migrateSchema, renderSchemaSql, migrationStatements, schemaDigest };
