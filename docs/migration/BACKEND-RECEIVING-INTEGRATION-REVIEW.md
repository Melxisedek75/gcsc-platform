# Backend receiving-tree integration review

Date: 2026-09-30. Local candidate only; no publication cutover or deployment.

## Scope and identity

- Parent/base: `656a6469f374092a8c0c09ebfe58e45acb91bab5` (publication).
- Incoming independently reviewed backend: `c46bd1b45c40bf60bb683027c219b680e91c85f9`.
- Candidate: `codex/october-integration-20260930`, reused clean
  `C:/gcsc-platform/.worktrees/legacy-preservation`; archival branch retained.
- API SHA-256: `f24fdd7d20a658b8d8e60d14b5fe5db8b1b56260269f8c7aa2a3577b5f68ff77`.
- Review state: pending independent receiving-tree assessment. Prior lane PASS
  does not approve this combined tree.

## Conflict resolution

Preserved the receiving shared transactional schema, profile/document revision
checks, fresh admin ACL and PostgreSQL participant chat. Retained backend JWT,
wallet-binding, private-preview, paid-brief, free-publication and transactional
bid/accept fixes. The paid-entitlement DDL now lives in the canonical schema,
so runtime startup and standalone SQL export remain identical. Auth rate limits
use the transport peer; chat retains its explicit stored-user identity key.

Preserved test isolation and the transaction-aware fake PostgreSQL client.
Updated the persistence acceptance fixture to publish before discovery, reject
private-location filters and explicitly seed a synthetic paid grant before bids.
Added missing wallet modules to its disposable API snapshot and source manifest.
Recorded imported-file adaptations without changing provenance source blobs.

Also repaired the receiving WebAuth static validator's cwd-dependent root:
`npm --prefix apps/web run check:webauth` previously looked for
`apps/web/apps/web/package.json`. It now derives the root from its module URL;
the same checks run from both supported directories.

## Parent commands and evidence

- `node scripts/run-api-tests.mjs`: exit 0, 15 Jest suites, 301/301 tests.
- `npm run check`: exit 0; provenance 24/24, mobile build guards 12/12,
  wallet restore 11/11, API syntax and static web checks pass.
- `node scripts/check-api-contracts.mjs`: exit 0, 58 declarations and 7/7
  required entrypoints; structural coverage only.
- `node --test tests/postgres-schema.test.mjs tests/postgres-runner.test.mjs tests/web-validator-root.test.mjs`:
  exit 0, 9/9.
- `node scripts/run-postgres-baseline.mjs --postgres-bin C:/gcsc/.tmp/embedded-pg-runner/node_modules/@embedded-postgres/windows-x64/native/bin`:
  PostgreSQL 18.4, 39/39, test exit 0 and PostgreSQL shutdown exit 0.
  Evidence: `services/api/v3/.tmp/postgres-baseline-FvSGRH/result.json`
  and `api-files.sha256.json`. Includes migrations/export/rollback,
  profile/document ACL and revisions, participant chat persistence/concurrency,
  free publication and project-specific synthetic entitlement.
- `git diff --check`: exit 0.

Earlier diagnostic `postgres-baseline-8sii45` failed because the receiving
fixture omitted wallet modules; it is retained and is not PASS evidence.
The first provenance test failed on missing adaptation entries; no source
snapshot/hash assertion was relaxed.

Additional parent checks: `npm --prefix apps/web run build` exit 0 (2983 modules,
existing large-chunk and old Browserslist warnings); `npm --prefix apps/web run lint`
exit 0 (existing DecryptText ref-cleanup warning, zero errors).

Both legacy fake-PG smoke commands now pass: `node services/api/v3/tests/postgres-storage-smoke.js`
and `node services/api/v3/tests/postgres-workflow-smoke.js`. Their earlier failures
were incomplete test adapters, not ignored results. Added wallet module copies,
explicit empty challenge-table expiry handling, verified-wallet lookup and
fixture-only Testnet chain identity. The auth limiter assertion now includes the
successful admin login in the same peer budget and denies a forged Bearer/IP
retry. Assertions on document versions, ownership verification and workflow
results remain active. Runtime API/schema hashes did not change. Independent
review is pending final follow-up inspection.

## Limits

No real wallet, signature, payment, provider checkout/webhook, phone, live DB,
production or deployment was exercised. SQL grants are isolated fixtures, not
evidence that lead checkout works. Web consumer/marketing integration is a
subsequent dependency; do not call the current receiving UI a working paid-lead
journey. Whole-MVP L01/L08/L09/L22/L23 and launch approval remain open.
