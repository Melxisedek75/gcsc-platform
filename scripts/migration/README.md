# One-time local migration evidence

The snapshot/import scripts record the exact 2026-09-06 local procedure. They have
hard-coded source/output paths and refuse existing outputs; do not run them as a
routine build, heartbeat or CI step. Review and parameterize before a future migration.

snapshot-sources.mjs preserves local refs, eligible dirty files and upstream mirrors.
import-sources.mjs copies allowlisted source blobs, retains source branches and
writes the per-file provenance/exclusion manifest. Neither script pushes, deletes,
changes repository access, deploys or reads credential values intentionally.

Normal validation is `npm run check`. A new import requires renewed source,
secret/license and independent review, not merely rerunning a historical script.
