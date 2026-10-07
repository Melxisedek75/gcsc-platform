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

An independent read-only review of exact `a1ff006f` found a P2 test
regression: the older fake-PostgreSQL storage smoke submitted `hello` bytes as
a PDF and expected HTTP 201. QA commit `8d09e95f` replaces that fixture with
synthetic `%PDF-` bytes, teaches the fake database to accept the empty
checkout-binding migration, and permits testing an exact external server root.
The storage smoke passed both against QA's own source and with
`GCSC_SMOKE_SERVER_ROOT` set to the clean backend `a1ff006f` worktree; syntax,
diff, and API syntax checks passed. The same reviewer inspected `8d09e95f`
without new P1-P3 findings and confirmed its P2 was addressed, but did not
rerun the smoke. This is not formal `AI_REVIEW_GATE=PASS`. The fake database
and header-only PDF fixture do not establish real PostgreSQL behavior or
complete PDF validity.

QA test-only commits `5eff7540`, `3a624afe`, `320d346b`, and `27c0a44c`
extend the existing real React/Edge document-review fixture. After rejection,
the contractor selects a distinct synthetic PDF; the test checks the exact
POST body, submitted status, visible replacement name, and downloaded
replacement bytes. A file over 1.5 MB must show a local error without another
POST, including during selection and a bounded two-second observation after.
Final Edge runs at 1280 and 390 px passed twice (`documents-ui-dfLpyj`,
`documents-ui-GMbYkB`) with no page errors; syntax and diff checks passed.
Independent read-only review found two initial P2 gaps and a P3 timing gap;
the reviewer confirmed each was closed in the final diffs with no new P1-P3.
The reviewer did not rerun Edge. This is mock HTTP UI evidence, not a single
browser/API/real-PostgreSQL journey or formal gate approval.

QA test-only commits `460fb3c8`, `fdff6b4f`, and `2b71453d` extend the
isolated real PostgreSQL suite against exact clean backend `a1ff006f`.
The disposable test row is marked rejected with reviewer metadata in SQL;
its owner resubmits distinct PDF bytes through the API. Assertions cover the
same document ID, incremented revision, new hash/bytes/name, cleared note and
reviewer metadata, submitted status, old-revision denial, and unrelated-user
denial on the new revision. Invalid MIME, forged bytes, and oversized requests
must leave the stored file, MIME, size, revision, and review state unchanged.
Final PG18.4 suite 1/1 passed twice (`postgres-baseline-tH3F0P`,
`postgres-baseline-MWPlGG`), test/PostgreSQL exits 0; syntax/diff checks
passed. Independent read-only review found test coverage gaps in two rounds;
the reviewer confirmed all P2/P3 findings closed on exact `2b71453d` with
no new P1-P3. The reviewer did not rerun PostgreSQL. Rejection is a SQL
fixture, not an exercised admin-review UI, and this is not a combined
browser/API/PG journey or formal gate approval.

QA test-only `bcbdba3c` adds an opt-in real Edge `CompliancePanel` -> exact
backend `a1ff006f` API -> disposable PostgreSQL 18.4 journey. Source roots
for API and web are explicitly selected and hashed; the runner strips ambient
provider/database settings. A synthetic contractor uploads PDF-signature bytes
through the actual React form, then a SQL reviewer fixture rejects the row.
The contractor reloads the panel, submits distinct replacement bytes, sees
the new name and submitted status, and downloads those exact bytes. The test
checks persisted owner, revision, hash, bytes, cleared review fields, old
revision 409, unrelated contractor 404 without filename/bytes, and no bytes
in list/compliance responses. Selecting >1.5 MB remains client-side and
leaves the row unchanged. Final `postgres-baseline-fr51XW` passed 1/1,
test/PostgreSQL exits 0 and cleanup errors empty; earlier passing runs were
`sdfHka`, `wBg2UU`, `1lE0r1`, and `CGIcSj`. Runner parser 16/16 and QA root
check passed. Root check first exposed a stale provenance adaptation SHA for
the prior fake-PG fixture; this commit corrected that record, then root check
passed. Independent read-only reviewer found a response-privacy gap and an
overstated transitive-source hash report. The latter was removed; 404/list/
compliance privacy assertions were added, including the final filename check.
The reviewer inspected `CGIcSj` but did not rerun the final test. This is not
formal `AI_REVIEW_GATE=PASS`.

Remaining L05a: formal gate, receiving integration, real admin-review UI in
the combined journey, removal behavior, and a real file scanning policy.
The SQL reviewer fixture is not an admin action, and header signatures do not
prove files are safe.
