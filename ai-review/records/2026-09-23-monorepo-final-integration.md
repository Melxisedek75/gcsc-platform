# GCSC Monorepo Final Integration Review

- Change ID: GCSC-MONOREPO-FINAL-2026-09-23
- Status: BLOCKED_REVIEW_AUTH
- Author: CODEX
- Reviewer: CLAUDE (unavailable: local OAuth invalid)
- Base: `a0834ac7917c3de57ebc02fb542814561469bca2` (`origin/main`)
- Candidate: `8cbca0b5498720397434bc497ce34b324c626add`
- Risk: HIGH
- Deploy decision: BLOCKED
- Founder live-risk approval: NOT REQUESTED

## Scope

Integrate the previously isolated and individually reviewed candidates into the
private canonical monorepo branch:

- PostgreSQL schema/runtime, profile documents and participant chat backend.
- Wallet-first challenge/verify backend and durable challenge storage.
- Shared sign-only ownership proof client and mobile/web wallet login consumers.
- Mobile design/startup/USB diagnostic work and support evidence.
- Web jobs/bids async states and participant chat client.
- Priority Access specifications, internal Whitepaper 1.4 records and planning docs.
- Pre-Astra instruction archive retained as read-only historical evidence.

No production deployment, real signing, payment, escrow, live database, public site
replacement, repository deletion, or old-repository archival is included.

## Integration decisions requiring review

1. `pure-server.js` keeps the canonical transactional schema migrator while adding
   wallet-first routes and stores from the backend candidate.
2. `schema-statements.cjs` now includes `wallet_challenges`; startup and SQL export
   use the same statements.
3. Ownership proof uses the WebAuth identity pseudo-action encoding from the later
   reviewed mobile/backend candidates, not the earlier `eosio::reqauth` experiment.
4. Web API adaptation combines profile-document, wallet-login and participant-chat
   methods.
5. Bids/Projects retain loading, error and stale-request protection while adding
   participant-chat navigation.
6. Canonical status/checklist documents from the publication branch were preserved
   over stale candidate checkpoints.

## Author verification

- `npm run check:integration-contracts`: PASS, 54 routes; 7/7 required entrypoints.
- `npm run check`: PASS, including provenance 24/24, mobile build guards 12/12,
  wallet restore 11/11, API syntax and static web checks.
- `npm run test:api`: PASS, 234/234 in 11 suites after backend integration.
- `npm run test:wallet-proof-client`: PASS, 15/15.
- `npm run test:wallet-login-client`: PASS, 5/5.
- `npm run test:web-wallet-login`: PASS, 3/3.
- `npm run test:wallet-device-probe`: PASS, 10/10.
- `npm run test:web-jobs-bids-states`: PASS, 4/4.
- `node --test tests/chat.acceptance.cjs`: PASS, 1/1.
- `npm run check:mobile-types`: PASS.
- `npm --prefix apps/web run build`: PASS, 2983 modules.
- `node --test tests/postgres-schema.test.mjs`: PASS, 5/5.
- `git diff --check`: PASS.
- Every registered worktree is clean.

## Known limitations

- Playwright chat fixture could not be repeated in the integration worktree because
  no installed Playwright package is available and disk space is about 200 MB.
  The exact chat candidate has prior fixture evidence; current integrated web build
  and static acceptance pass.
- Real PostgreSQL acceptance was not repeated in this final integration pass.
- No physical wallet signature, APK rebuild/install, real payment, or production E2E
  is claimed by this repository integration.
- Existing Vite large-chunk and stale Browserslist warnings remain visible.

## Reviewer instructions

Review the exact candidate SHA and integration conflict resolutions. Independently
run at minimum:

```powershell
npm run check:integration-contracts
npm run check
npm run test:api
npm run test:wallet-proof-client
npm run test:wallet-login-client
npm run test:web-wallet-login
npm run test:web-jobs-bids-states
node --test tests/chat.acceptance.cjs
npm run check:mobile-types
npm --prefix apps/web run build
git diff --check
```

Do not modify application code. Record findings and set one decision below.

## Reviewer decision

- Decision: BLOCKED - NO INDEPENDENT VERDICT
- Required checks: Author checks PASS; independent repetition pending
- Merge to private `main`: BLOCKED
- Findings: None recorded because the reviewer could not authenticate.
- Reviewer evidence: Claude Code `2.1.186` was invoked against the exact candidate,
  but returned `401 OAuth access token is invalid`. No review result was produced.

## Resume condition

Restore Claude Code authentication, review exact candidate
`8cbca0b5498720397434bc497ce34b324c626add`, record `APPROVED` or
`CHANGES_REQUIRED`, and only then update the private `main` branch.
