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

QA follow-up `1544c673` replaces the SQL rejection fixture with the real
`AdminDocumentReviewPanel` in a separate admin browser context. An admin
downloads the initial file, enters a reason, and clicks Reject. The test
requires PUT 200, persisted reviewer ID/note/time, then contractor reload,
replacement and download as above. Admin-list JSON must contain the target
document metadata but no file bytes. PG18.4/Edge/API 1/1 passed twice
(`H9cr8o`, `jkabob`), test/PostgreSQL exits 0, cleanup errors empty; runner
16/16, QA root check, syntax and diff checks passed. Independent read-only
review found a P3 admin-list privacy assertion gap; the exact assertion was
added and final `KGDB1z` passed 1/1 with test/PostgreSQL exits 0. Reviewer
did not rerun that final follow-up and this is not formal gate approval.

Remaining L05a: formal gate, receiving integration, removal behavior, and a
real file scanning policy. Header signatures do not prove files are safe.

QA test-only `cdb91234` adds two browser-selected invalid uploads to the
same combined journey: HTML bytes presented as PDF and PDF bytes declared as
PNG. Each actual API POST must return 400, the React panel must show the API
error, and the PostgreSQL file/revision/review fields must remain unchanged.
The existing >1.5 MB selection still makes no additional POST. Final
`postgres-baseline-Lfmvwc` passed Edge/API/PG1/1 with test/PostgreSQL exits 0;
`E8xH69` passed before the visible-error assertion. Syntax and diff checks
passed. This narrow follow-up has no independent review or formal gate.

L07 follow-up: `AdminDocumentReviewPanel` kept previously loaded document
metadata visible after the reviewer account lost its admin role and a new
list request returned 403. QA `e3336300` reproduced this against current
publication web with real Edge/API/disposable PostgreSQL (`yhRmWf`, RED at
visible filename count 1). A one-line clear-on-error candidate still let an
older held 200 restore that metadata after the 403 (`aN0Xkx`, RED). Isolated
October-web candidate `c0156070` clears the list on load failure and ignores
out-of-order results using a latest-request counter. The QA fixture holds
an authorized list response until after demotion and the newer 403, then
releases it and waits for network idle plus two render frames. Exact committed
QA/web source passed Edge/API/PG1/1 `tVWFFa`, test/PostgreSQL exits 0,
cleanup errors empty; earlier candidate passes `uaMCsP`, `yddOJG`, `gG27oe`.
October-web TypeScript/Vite build, scoped ESLint and diff check, plus QA
runner16/16/root check/syntax/diff checks passed. Independent read-only review
found the race, confirmed no remaining P1-P3 after the fix, and did not rerun
the final test. This proves clearing after a fresh 403 in the isolated panel;
without a push signal or refresh it cannot remove data already displayed at
the exact instant a role changes. The full Dashboard route, formal gate,
integration, push and deploy remain open.

L07 adjacent admin panels: QA `f2a5c97d` extended the same pinned-source
Edge/API/disposable PostgreSQL run to Audit Log and demo financing prechecks.
The previous October-web panels retained private event/context text after
demotion and a fresh 403 (RED `ZtEaoW` for audit, `piTbfE` for finance).
October-web `494821ac` clears each list on failed loads and filter changes,
and ignores older responses. The fixture holds an authorized 200 until after
the newer 403, then checks that private sentinels never reappear. Final exact
QA/web candidate Edge/API/PG1/1 `ju3qQ7` PASS, test/PostgreSQL exits 0,
cleanup errors empty. QA root check, runner16/16, source/syntax/diff checks,
web TypeScript/Vite build and scoped ESLint passed. An independent read-only
review found the held audit response did not initially contain the asserted
sentinel and identified a filter-change window; both were corrected before
the final test, but the final diff was not re-reviewed. This is isolated-panel
acceptance only, not instant revocation without a new request, full Dashboard
acceptance, formal CODEX/CLAUDE approval, integration, push or deployment.

QA `76bb4487` adds the real `Dashboard`/`HashRouter` route to the same
explicit-source browser bundle. The admin navigates to Audit Log and Financing
Review and sees SQL-backed synthetic records. After PostgreSQL demotion, the
financing filter change receives 403 before navigation; Audit Log also
receives 403. The filter change itself clears old context, so this run alone
did not prove 403-triggered clearing. A page reload fetches
the current role from `/api/auth/profile` and hides all three admin navigation
buttons. Final Edge/API/PG18.4 run `9kDBZR` passed 1/1 with test/PG exits 0,
no blocked requests, page errors or cleanup errors. Earlier route runs
`ZfPoEL` and `MFe5kN` passed before a reviewer identified a false-pass risk:
the financing data was previously checked only after leaving its panel. The
final test fixed that assertion, but a later review found the filter-change
false-pass risk, addressed by the Refresh follow-up below. QA root check,
runner16/16, syntax and diff checks passed. The reviewer did not rerun the
final diff. This
proves a fresh 403 and a reload path, not instant revocation without a request,
all Dashboard journeys, formal gate approval, integration or deployment.

Mobile follow-up: QA `29c01349` exercises the real Dashboard mobile drawer
at a 390 px viewport with the same local Edge/API/PostgreSQL source. The old
drawer controls lacked accessible names: first run `Klmbo1` timed out on
"Open menu". October-web `e792c9e8` names Open/Close menu and adds icon
refresh controls to Audit Log and Financing Review. The refresh controls
make a role-revocation request possible while keeping the same panel mounted;
on 403 the panels show "Admin only" and the prior sentinel stays absent
after loading ends. Mobile audit refresh is checked while mounted; a later
mobile financing navigation gets 403; reload hides all admin drawer items.
Final Edge/API/PG18.4 `pHHYxY` passed 1/1, test/PG exits 0, no blocked/page/
cleanup errors. Prior mobile attempts `5JWku0`, `pVoqOG`, `Ke4unU` exposed
unnamed or ambiguous test locators; `tOcyXu` and `mnpY8y` passed before
read-only review found a false-pass risk in the mobile financing assertion.
The final assertion waits for visible 403 error before checking absence;
the reviewer did not rerun/re-review it. QA root check, runner16/16,
syntax/diff, web TypeScript/Vite build and scoped ESLint passed. The browser
fixture bundles React without the production stylesheet, so the 390 px run
checks drawer behavior, not responsive layout or visual polish. No instant
revocation without a request, formal gate, integration, push or deployment.

Document-review action revocation follow-up: QA `c406a993` and October-web
`51753f2d` cover a demoted admin whose pending Reject reaches PUT403. The
panel clears private document metadata and the unsaved rejection note, ends
loading even when a filter GET is pending, and invalidates a delayed GET200
that was authorized before demotion. The browser test holds both requests,
checks the visible 403 and absent data before and after releasing GET200,
checks that PostgreSQL status/revision/reviewer/note are unchanged, then
re-promotes and verifies a fresh list has no stale draft note. Original UI
failed the simpler privacy assertion (`y5ZtmX`). The first race run `MPi3n8`
passed revoked-state assertions but failed at the test's same-filter reload;
after fixing that transition, Edge/API/disposable PG18.4 `Vh6TsE` passed
1/1, test/PG exits 0. QA root check, runner16/16, web build/scoped ESLint
and diff checks passed. Independent read-only review found the missing
loading reset and race coverage; both were addressed, but the exact final
diff was not re-reviewed. This is isolated local acceptance, not instant
revocation without a request, formal gate approval, integration or release.

Denied-download follow-up: QA `847d057f` and October-web `674c0812` cover
an admin who is demoted while the document list remains open. The exact API
returns a deliberately opaque 404 for the subsequent file GET; prior UI kept
the private filename and draft rejection note visible. After the change, the
admin panel clears both and displays the error. The delayed-GET race fixture
also asserts its held 200 JSON contains the target document, closing a gap
identified in read-only review of QA `c406a993`. Initial `MKdWU4` failed on
the incorrect 403 expectation and exposed the backend's 404 contract; final
Edge/API/disposable PG18.4 `PWiGnJ` passed 1/1, test/PG exits 0. QA root check,
web build/scoped ESLint and diff checks passed. No independent review of the
exact final follow-up, formal gate, integration, push or deployment.

Contractor revocation follow-up: QA `f85a2738` and October-web `0f4c7e63`
clear previously displayed compliance/document metadata when a disabled
contractor receives POST or file GET403. The test checks the denial bodies
contain only `{ error: 'Account is inactive' }` and a denied upload leaves
the PostgreSQL revision unchanged. A second browser scenario holds a real
authorized POST201 response containing a new filename, disables the account,
gets a later file GET403, then releases the old 201; neither old nor new
filename reappears. The initial UI was RED `iA7WtR`; `JozgyY` and `WElHuU`
passed before read-only review found a stale-success race and denial-body
assertion gap. First race attempt `2RVYDK` failed because the test expected
200 instead of the API's 201; `lTYD24` and exact final Edge/API/disposable
PG18.4 `CGto0q` passed 1/1, test/PG exits 0. QA root check, web build/scoped
ESLint and diff checks passed. Independent read-only re-review found no P1-P3
in final diff, but did not run tests. The older getCompliance response race
was addressed by the same access epoch but has no separate browser race test.
No formal gate, integration, push or deployment.

Compliance refresh follow-up: QA `bfebfdfc` and October-web `4ec10a4c`
add a contractor Refresh control and deterministic browser request ordering.
An authorized GET200 held before role revocation cannot restore document
metadata after a later file GET403. An older GET200 cannot overwrite a newer
POST201 result or clear the error of a newer POST400. A late GET403 clears
metadata even after a newer POST201. A locally intercepted GET500 cannot
replace a newer POST400 error; this 500 is browser-synthetic, unlike the
other local API responses. Initial RED `wMckik` lacked the Refresh control.
Earlier passing runs `xjL4iC`, `nyEO4x` and `y0X9gL` preceded successive
read-only reviewer findings; final Edge/API/disposable PG18.4 `V1fBMK`
passed 1/1, test/PG exits 0. Web build/scoped ESLint, QA root check and
diff checks passed. The exact last diff was not independently re-reviewed.
The fixture does not load production CSS; formal gate, integration, push and
deployment remain open.

Contractor Dashboard navigation QA: test-only QA commit `a43eed60` mounts the
real Dashboard under HashRouter, loads the current contractor profile, opens
Compliance from desktop navigation and confirms the persisted document name.
After disabling the contractor in the disposable PostgreSQL database, a
Compliance refresh receives API GET403, displays `Account is inactive` and
removes the filename. Explicit backend/October-web source run `2593Wp` passed
Edge/API/PG 1/1 with test/PG exits 0; QA root check, syntax and diff checks
passed. The first attempt `rb8lCQ` did not execute the scenario because of a
duplicate test variable declaration; it was corrected before the passing run.
The bundle omits production CSS, and the test-only diff has no independent or
formal CODEX/CLAUDE review. No integration, push or deployment occurred.
