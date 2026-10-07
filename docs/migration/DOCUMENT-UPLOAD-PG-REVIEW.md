# Contractor document upload: isolated PostgreSQL evidence (2026-10-07 UTC)

Status: isolated backend and QA candidates only. No integration approval,
antivirus scan, or live-service test.

QA commit `a88b0003` adds an opt-in fresh PostgreSQL 18.4 suite for document
upload and private download. Synthetic `example.invalid` contractors are used;
no user files or external provider are contacted. The suite checks a valid
PDF upload, persisted owner binding, list response without file bytes, owner
download, stranger denial, declared-MIME mismatch, forged PDF bytes, early
oversize rejection, unchanged stored row count, corrupt stored MIME denial,
and disabled-owner denial.

The combined backend working-tree source SHA-256
`f6de538612f97c216e20b57993e19747113d7c5398506815aa7c094a7e400232`
passed 1/1 with test/PostgreSQL exits 0 (`postgres-baseline-3nZbTz`). Current
publication source SHA-256
`154436a6394e851e93538e834d20841034dada529ba7a3efa1d3c871471ebf12`
failed as expected: mismatched declared MIME was accepted with HTTP 201
instead of 400 (`postgres-baseline-Jvcowp`, test exit 1, PostgreSQL exit 0).
The latter comparison stops at the first mismatch and does not establish
whether later assertions pass on publication. Runner parser 15/15 and QA root
check passed.

A first candidate run (`postgres-baseline-ezFYs7`) timed out while the local
PostgreSQL runner created its disposable database, before suite execution.
PostgreSQL shut down cleanly. The runner's local probe query timeout was
increased from 3 to 15 seconds; the subsequent candidate and publication
runs reached the suite. This is test infrastructure only.

The L05a backend candidate was isolated in commit `a1ff006f` (only
`pure-server.js` and its document tests). Its clean committed source has the
same SHA-256 as the passing working-tree snapshot. Focused document Jest
18/18, full API Jest 354/354 with a dummy local JWT secret, syntax and diff
checks passed. QA reran the isolated PostgreSQL suite against this exact clean
commit: 1/1 `postgres-baseline-sdmq62`; project-publication 33/33
`postgres-baseline-Ydttzf`; all test/PostgreSQL exits 0.

Remaining L05a: independent review/formal gate, receiving integration, UI
upload/resubmission acceptance, and a real file scanning policy. Header
signatures do not prove files are safe.
