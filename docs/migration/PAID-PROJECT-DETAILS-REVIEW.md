# Paid project brief: local API candidate

Date: 2026-09-30. Scope: L07/L08 API read dependency, not checkout or production.
No integration, push, external provider, real payment or wallet signing occurred.

## Exact inputs

Backend worktree: `C:/gcsc-platform/.worktrees/backend`, branch
`codex/backend-integration` on `eb760ed0` with pre-existing dirty security work.
That work was retained. Only a new details helper/route and focused test were
added in this slice; earlier unrelated files were not staged or reverted.

- Baseline `services/api/v3/pure-server.js` SHA-256:
  `cd30864a707a5664860e15b058c08425661e4bc846055bf692ed97a9f6913294`.
- Candidate source SHA-256:
  `6e7396beedee0d9d6604b3818eff8ae0b0600f75d6ffd59fe409dc4b5c314653`.
- New `services/api/v3/tests/project-paid-details.test.js` SHA-256:
  `5d95f9abef8d850a21561ff11051095bcba057ffb5d03f1d25cdbecbe63a288e`.
- Byte snapshots: backend `.tmp/paid-project-details-20260930/` files
  `baseline-pure-server.js` and `candidate-pure-server.js`.
- Snapshot diff: one runtime file, 66 inserted lines. These snapshots are local
  ignored evidence, not a committed backend release or independent approval.

## Behavior

`GET /api/projects/:id/details` reads an active owner's own project, or the
allowlisted brief of an open published project for its active paid contractor.
Contractor authority requires the exact project/buyer grant, status `paid`, a
provider reference and non-null verified timestamp. This endpoint does not
create or confirm that grant and does not turn a generic lead token into one.

PostgreSQL uses one parameterized statement joining the current user and matching
project/grant conditions in a single snapshot. JSON uses synchronous current
state checks. No valid JWT yields 401; all authenticated missing/denied/malformed
IDs yield the same 404. Every route response is private/no-store and varies by
Authorization without losing the existing Origin variation.

Paid responses contain exactly nine brief keys; structured location, contact,
attachments, owner identity, payment metadata, competitor bids and arbitrary
future columns are withheld. Raw title/description are owner-supplied private
brief text and may contain personal data: there is NO automatic PII scrubbing.
Contact/disclosure policy and owner-facing consent remain release gates. Public
previews and existing accepted-contract routes are unchanged. The response
contract is recorded in `../product/october-mvp-contract.v1.md`.

## Parent verification

From `backend/services/api/v3`, process-local test configuration (synthetic only):

```powershell
$env:NODE_ENV='test'
$env:JWT_SECRET='local-project-details-test-secret-not-for-deployment-20260930'
$env:DATABASE_URL=''
$env:XPR_TX_VERIFIER_ENABLED='false'
node node_modules\jest\bin\jest.js --runTestsByPath tests/project-paid-details.test.js --runInBand
node node_modules\jest\bin\jest.js --runInBand --silent
```

- Before route implementation: 30 failed, 1 passed (31 total), exit 1. The
  endpoint returned the generic absent-route 404, including for a paid buyer.
- After repair: 31/31, exit 0, local HTTP against the actual API with in-memory
  JSON state, not mocked HTTP responses. Only synthetic users/grants were seeded.
- Full Jest: 13 suites, 285/285, exit 0 (90.104 seconds). This excludes the
  package's explicit PostgreSQL/script-test exclusions, not an all-platform gate.
  A later three-line test-only guard rejects non-test mode or any ambient
  DATABASE_URL before API import. Focused 31/31 passed again after that guard;
  a separate `node -e` require with a dummy PostgreSQL URL confirmed rejection
  before importing the API. Runtime source is unchanged; the full285 result
  precedes only this test guard.
- `node --check services/api/v3/pure-server.js` and `git diff --check` from
  backend root: exit 0. Node 25.9.0 reports the existing `url.parse` deprecation.
- The initial backslash Jest pattern matched no tests and exited 1; it was not
  counted as red behavior or PASS. The recorded runs use `--runTestsByPath`.

Cases cover missing/invalid JWT, exact payload allowlist, owner draft, wrong
buyer/project, generic-token rejection, six non-paid states, missing proof
metadata, revocation, stale roles/inactive users, wrong owner/admin claim,
unpublished/closed/in-progress/escrow offers, malformed IDs and unchanged preview.

## Independent review and PostgreSQL

Read-only reviewer `01a0edd5-92a1-7b42-ac8f-88094d6f5637` completed the
byte-snapshot delta review: **source/local JSON PASS**, no confirmed defects
in the 66-line slice. This is not whole-backend or integration approval.
The reviewer inspected the single-statement authorization snapshot, synchronous
JSON checks, allowlist, no-store/Vary headers, uniform denials and the test guard
before API import. Runtime and final test hashes above matched before/after.

Independent command: the focused Jest command above with the documented
process-local environment, 31/31, exit 0. This independent execution preceded
the test-only guard; the final guard was source-reviewed. The post-guard31/31,
dummy-URL guard check and full285/285 remain parent evidence; full285 preceded
the guard. Reviewer did not run real PostgreSQL and explicitly retained the
raw-text disclosure/consent and provider-verification gates.

QA writer `01a0edde-2fc0-7652-8376-9f3bf6215c25` owns only the separate QA
worktree, initially clean at `ce54d60a`. A fresh measurement found C: free space
4,839,354,368 bytes, changing the old 103 MB/ENOSPC condition.

Parent inspected the resulting native PostgreSQL 18.4 evidence directly:
`qa/services/api/v3/.tmp/postgres-baseline-UDoa3d/result.json` pins source
`6e7396be...` and records PASS, testExitCode 0, postgresExitCode 0, port 64524,
started 08:09:46Z and finished 08:09:57Z on 2026-09-30. `test-output.log` records
14/14 PASS (13 child scenarios plus parent). The expected fixture escrow-insert
exception is part of a passing rollback case, not a failed production action.

New real-SQL cases cover the owner draft details and exact nine-field paid brief,
uniform denied reads, wrong buyer/project, pending/revoked grants, stale roles,
disabled accounts and private caching. The same run retains owner-disable
publication/old-receipt races, bid authorization races, accepted-bid rollback
and draft privacy. An earlier run `postgres-baseline-mLH9zL/result.json` also
records PASS for the same source and clean shutdown; it is not red evidence.

QA commits: `3bdc36d1` adds the scoped tests/evidence and
`011f30c9df929efe317a4ddd06f771ddd677e3aa` clarifies the first-run evidence.
QA worktree is clean. Both runs passed 14/14; the evidence checklist alone was
adjusted before the final rerun, with no backend repair. Commands from QA root:

```powershell
node --check tests/postgres-project-publication.integration.cjs
npm run test:postgres:guards
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin --project-publication
git diff --check
```

Guards 5/5, syntax/diff exit 0. QA verified both cluster ports (63077 and 64524)
closed and the final cluster's `postmaster.pid` absent. Parent verified the
runtime source hash unchanged after QA. Full QA record:
`C:/gcsc-platform/.worktrees/qa/docs/migration/PROJECT-PUBLICATION-POSTGRES-ACCEPTANCE.md`.
None of these tests performs a provider checkout/payment.

## Open gates

Provider Checkout/webhook, durable real payment confirmation, the UI consumer,
combined browser/API acceptance, contact/price/refund policy, whole backend
security review and publication integration remain open. No existing mainnet,
production or live database was used by the parent checks. Source-only or local
DB evidence cannot approve a real payment or production release.

Next web slice: use this endpoint in the contractor project panel; do not infer
paid access from a URL, generic token or preview field. Bind asynchronous results
to both current user and selected project, clear private detail on account
change/denial, and test stale requests, revoked access and proposal submission.
The UI may not offer an unimplemented checkout or treat fixture grants as sales.
