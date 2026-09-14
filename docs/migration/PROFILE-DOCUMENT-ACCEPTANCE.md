# P3.1: Profile And Document Acceptance

Date: 2026-09-14. Local candidate, not integrated into main or deployed.
Base: d57e4ce7. Branch: codex/profile-document-acceptance-20260913.
Core source: 0f4961b26033c9a20b677d2e222d339dfb4e8229.
Final source: 8814b919b170f3b68baf61963e73477d43386eab (filename sanitizer follow-up).
Independent review: APPROVED, Lagrange, separate Sol/high context
01a09ec2-e2d5-70f1-9902-bd9612287921, exact d57e4ce7..8814b919.
No blocking security/correctness findings; reviewer made no edits.

## Scope And Result

- Real PostgreSQL profile persistence, protected document access, administrator
  authorization, review/re-submission and audit. No wallet or mobile changes.
- A still-valid JWT no longer grants administrator access after deactivation,
  demotion or deletion of its stored user. All four admin routes use stored state.
- The original file can now be downloaded by its active owner or an active admin.
  Lists remain metadata-only; unauthorized file access returns 404, anonymous 401.
  Downloads are no-store, check stored content hash and have an audit event.
- Each upload increments a database revision, including identical file uploads.
  Replacement clears the previous decision, note and reviewer. Review requires
  the displayed revision and a conditional SQL update; stale requests return 409.
- Rejection requires a note. A submitter cannot supply an administrator review note.
- Malformed/empty base64 is rejected. This is encoding/type/size validation,
  NOT malware scanning, document authenticity verification or a KYC integration.
- The existing web owner/admin panels expose authenticated downloads. Admin review
  sends the displayed version, reloads conflicts and labels errors as errors.

## API Contract

`GcscUserDocument.revision` is a positive integer. Additive canonical migration
backfills existing rows to 1 without changing their stored files or review status.

`GET /api/auth/documents/:id/file?revision=N` returns metadata and `file_data_url`
only after owner/admin authorization. Missing version: 428; invalid version: 400;
stale or missing/corrupt stored bytes: 409. A deleted/other owner's file: 404.

`PUT /api/admin/documents/:id/review` requires JSON `expectedRevision` along with
`status` and an optional `reviewNote` (mandatory for rejection). Missing version:
428; invalid version/status/note: 400; replaced version: 409. No automatic retry
or approval of the newly uploaded version. Older clients must refresh/update.
The canonical web consumer is changed in the same candidate; no live API changed.

Review and download audit metadata include file hash and revision, not file bytes.
Profile changes record changed field names rather than sensitive field values.

## Verification

Installed local Node25.9.0; PostgreSQL18.4 from the existing minimal native runtime.
Fixture users/JWTs; fresh loopback-only database, no ambient providers/credentials.

| Check | Evidence / Result |
| --- | --- |
| Red regression | .tmp/postgres-baseline-jHC0DU/result.json: inactive admin200 instead of403; new upload wrongly approved by stale review; malformed base64 accepted; no private file route |
| Real PostgreSQL | .tmp/postgres-baseline-mLaoOg/result.json: 23/23, testExit0/postgresExit0; includes prior14 DB scenarios and8 profile/document scenarios plus parent |
| Forced write race | A held PG row lock makes review wait; after replacement commits the conditional update returns409 instead of approving it |
| Migration | Fresh/repeat/additive/export parity, existing documents backfilled to revision1, rollback/concurrency regressions retained |
| JSON fallback | New five-case Jest suite: revoked admins, private download, legacy version and re-submission; checkout JSON IO mocked, not real persistence evidence |
| Root check | npm run check: 48/48 plus readiness/syntax/static validators, exit0 for final source |
| API | npm run test:api: 164/164 in6 suites, exit0 for final source |
| Fake PG adapter | npm --prefix services/api/v3 run test:pg-storage: PASS using actually bootstrapped admin, not a token for nonexistent user999 |
| Web | npm --prefix apps/web run build: tsc + Vite exit0; admin/compliance/profile validators PASS |
| Focused lint | Four changed web source files: ESLint exit0,0 errors/0 warnings; independently repeated for final sanitizer |
| Browser | scripts/check-document-review-ui.mjs: Edge headless,1280x900 and390x844, protected-download request and exact saved bytes, rejection note, stale409/reload/version2 approval; no page errors or horizontal page overflow |

Browser evidence: apps/web/.tmp/documents-ui-H1daOt/result.json and screenshots
for final source8814b919; previous core-source smoke is documents-ui-s4YII9.
This uses REAL React components with a LOCAL MOCK HTTP backend. Real API/PG
authorization is tested separately; this is not a complete registration-to-DB E2E.
No real identity document, external account, production API or wallet was used.
All owned test servers and temporary PG processes are closed after each run.

Reviewer independently reran PostgreSQL23/23 and API164/164, both exit0, plus
focused ESLint0/0. PG evidence: .tmp/postgres-baseline-vVXz0g/result.json,
2026-09-14T07:16:42.929Z..07:17:02.294Z, testExit0/postgresExit0. The API/schema
are unchanged by the final sanitizer follow-up. Reviewer did not repeat the full
web build/browser smoke; those remain parent evidence. Final full web build
finished exit0 (68 seconds). Independent review is not production approval.

Commands:

```powershell
npm run check
npm run test:api
npm run test:postgres:local -- --postgres-bin C:\gcsc\.tmp\embedded-pg-runner\node_modules\@embedded-postgres\windows-x64\native\bin
npm --prefix services/api/v3 run test:pg-storage
npm --prefix apps/web run build
npm --prefix apps/web run check:admin-documents
npm --prefix apps/web run check:compliance-documents
npm --prefix apps/web run check:profile-onboarding
node scripts/check-document-review-ui.mjs --playwright-dir C:\Users\rivne\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules
```

## Limits And Continuation

- P3.1 is only partially complete. Registration, chat, full browser/API/DB journey,
  other business flows and provider-backed verification require separate acceptance.
- Review/auth checks use stored state at request time; no new global session
  revocation service or global RBAC overhaul was introduced.
- Audit writes follow existing non-transactional business-write behavior. Durable
  atomic business/audit consistency and audit retention need a later ops slice.
- Files are stored as base64 in the database as before. Real personal documents
  require retention, encryption/access operations, scanning and backup policy.
- No backup/restore claim: installed runtime lacks pg_dump/pg_restore. No Node20 CI
  run. Known old fake workflow400 wallet_missing remains deferred, not weakened.
- Build warns about stale Browserslist data and existing large chunks; Node warns
  about url.parse. These warnings are not suppressed.
- Web dependencies reuse the existing frontend node_modules via an ignored junction;
  package.json/lock are identical, no packages installed and no duplicate dependency tree.
- Test-harness setup faults were corrected (Tailwind cwd/cache and Jest callbacks).
  The old fake PG admin fixture exposed a nonexistent admin; it now uses login.
  These failed setup runs are not counted as successful acceptance.
- No merge/push/deploy, no existing database migration, no phone installation.

Next dependency-ready task: P3.1 chat client contract/canonical API gap, then
scoped message persistence and participant ACL on the isolated PostgreSQL baseline.
Mobile client work remains deferred; a native chat screen is not backend evidence.
