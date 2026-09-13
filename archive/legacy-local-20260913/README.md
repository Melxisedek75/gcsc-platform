# Preserved local candidates

Captured from the old backend/store working trees on 2026-09-13. These files are
historical candidates, not runtime imports, migrations to execute, or deployment
configuration for the monorepo. `manifest.json` records every preserved file hash.
Git treats the two frozen source subtrees as binary snapshots to retain original
CRLF/trailing whitespace; `git diff --text` can inspect them when needed. Integrity
tests and the secret scan read the actual bytes. Active source rules are unchanged.

The old `pure-server.js` is retained to recover individual changes. Replacing
`services/api/v3/pure-server.js` with it would remove newer wallet/payment security
changes. Preserve current runtime behavior during any future selective port.

The renovation implementation contains simulated analysis and generated visuals.
It has no renovation test suite in its source checkout. Reconcile startup SQL
with the stronger CHECK constraints in `renovation-module-migration.sql`, then
test ownership, validation and advisory-only behavior before enabling any route.
`renovation-migration.sql` is a superseded no-op, retained for completeness only.

`founder-action-packet.test.js` refers to missing package/workflow commands. Its
presence does not establish a passing test or an operational founder action.
`gcsc-store/vercel.json` needs an explicit deployment root before activation.

The originals, local full-history migration bundles and Google Drive source
snapshots are retained. This directory preserves the 12 dirty files; it does not
claim to contain every ignored file, credential, submodule or Git revision.

Run `npm run test:legacy-preservation` to verify the archived bytes. See
`docs/migration/LOCAL-RECOVERY-2026-09-13.md` for provenance and the integration queue.
