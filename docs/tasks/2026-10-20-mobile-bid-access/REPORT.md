# Mobile bid access: report

## Cause

The 0.1.10 Contractor bid form allowed entry for a public job without checking project-specific paid access. The API correctly rejected `POST /api/bids` with `project_access_required`. In the local test database, the published job has no project access entitlement. The Bids tab's generic 50 XPR Lead Token purchase did not create a project-specific entitlement, so presenting it as a way to unlock this job was misleading.

## Change

- Check the authenticated project details endpoint before showing the bid form. A public job with a 404 details response shows `Job access required`; network/authentication failures show Retry instead.
- Keep `POST /api/bids` as the final authority and handle a later `project_access_required` response by returning to the access-required state.
- Remove the generic Lead Token payment action from Bids. Keep historical on-device receipts visible with a notice that they do not unlock a specific job.
- Do not change server enforcement, payment, wallet signing, or entitlement creation. This build does not offer project-specific checkout.

## Verification

- `node --test tests/mobile-bid-access.test.mjs`: 3/3 passed after an initial expected red run (0/3).
- `npm run check:mobile-types`: passed.
- `npm run test:mobile-design`: 11/11 passed.
- `services/api/v3/tests/project-paid-details.test.js`: 31/31 passed.
- `npm run check`: passed, including 37 core tests, 13 mobile-build tests, 9 wallet-restore tests, API syntax and web static validators.
- `git diff --check`: passed.
- Local Android build: `BUILD SUCCESSFUL`, 0.1.11/versionCode 13. Verified APK SHA-256: `8d5081a180a4733ba896d7de12fb7499c1d32fb46e953454d473305e39d6bcd3`. APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (ignored generated output, local USB test only).
- Pixel 8 `38031FDJH002QW`: `adb install -r` succeeded without clearing data; package reports 0.1.11/versionCode 13. Contractor Jobs still showed the test Plumbing project. Opening `Submit a bid` showed `Job access required` and no bid form. Bids showed no generic 50 XPR purchase action.

## Remaining limits

No project-specific checkout or entitlement issuance was implemented, and no XPR transfer, WebAuth signing, bid submission, or owner-side acceptance was performed. The tested APK uses `http://127.0.0.1:3000` through USB reverse to a local test API; it is not a standalone production build. A full paid lead-to-bid test requires a separately reviewed project-specific checkout that grants the exact project entitlement after verified payment.
