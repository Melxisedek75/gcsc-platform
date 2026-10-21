# XPR Testnet project access and bidding: working report

## Implemented

- Added a project-bound `POST /api/payment/project-access/:projectId` quote and receipt path. The quoted price is 50.0000 XPR on Testnet, the memo contains the project ID, and the recipient is `gcsctoken111` by default. A paid entitlement enables the existing bid endpoint; no generic Lead Token is treated as access.
- Added one server-side reserved attempt per project and contractor, plus the existing durable mobile payment journal. The phone stores the reservation key before requesting a quote and never broadcasts a second transaction after an unknown outcome.
- Bound verification to Testnet chain ID, exact transfer fields, sender permission and fresh action timestamp. The original wallet permission is stored on receipts for pending reconciliation. A closed project, conflicting entitlement or second verified payment goes to review instead of silently granting access.
- Added a project-specific mobile checkout and an account/recipient/memo review screen. No transfer starts merely by opening the screen.

## Evidence so far

- `npm run check` passed again after the final code/hash edits. `git diff --check` and API syntax check passed.
- `npm run test:wallet-repair`: 107 passed. `npm run check:mobile-types` passed. `npm run test:postgres:schema` passed.
- New API JSON tests: 11 passed, including cross-device quote refusal, pending reconciliation, account switch, closed project and bid after payment. New mobile payment/bid tests: 24 passed.
- Full API suite after the final code changes: 18 suites and 375 tests passed. An earlier long Windows run had one wallet-ownership timeout (372 passed, one failed); its isolated rerun plus project-access tests passed 63/63 before the final full green run.
- Independent review identified a cross-device quote race and pending permission drift; both have code fixes and a follow-up reviewer found those High findings closed at code/test level. Follow-up reviewer noted that a lost local journal leaves a reservation requiring manual recovery.
- On 2026-10-20, read-only checks of `https://testnet.rockerone.io` returned the expected Testnet chain ID and a history index close to the chain head. The strict verifier accepted a historical public Testnet transfer on that node using its original timestamp. No new transfer was made. XPR lists this node in its [Testnet endpoint documentation](https://docs.xprnetwork.org/client-sdks/endpoints.html).
- APK `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` built successfully with Android version `0.1.12` / versionCode `14`, local API origin `http://127.0.0.1:3000`, size 32,550,057 bytes and SHA-256 `fa124c533f3a79f76a08de7da1034ad019afd1975674974b140629e9697087a1`. Installed with `adb install -r` on Pixel 8 `38031FDJH002QW`; package manager reports 0.1.12/14. No app data was cleared.
- The owner confirmed on Pixel 8 that project 1 initially showed both `Job access required` and `Unlock this job · 50 XPR` before payment.
- At 2026-10-21T06:26:23.5Z the owner-authorized Testnet transaction `ab192d306da3fcf321cf1e960adbe094d0f02a1c1998c7fc70e54fe4a36a9785` transferred `50.0000 XPR` from `gcsclead1111@active` to `gcsctoken111` with memo `gcsc:project:1`. The local receipt is `confirmed`, the sole attempt is `confirmed`, and project 1/contractor 6 has a `paid` entitlement. A separate read-only query to `https://testnet.rockerone.io/v2/history/get_transaction` returned the matching transfer action in block 412133144; a later `get_info` query returned Testnet chain ID `71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd` and last irreversible block 412133204, beyond the payment block. No second transfer is needed.

## Not yet accepted

- PostgreSQL runtime transaction/rollback and concurrency tests were not possible without a local PostgreSQL service. JSON tests do not prove production database behavior.
- A fresh 50 XPR Testnet transaction and project entitlement are confirmed. Bid submission, owner-side bid view and refund path have not been completed yet. The owner has been asked whether the bid form opened; do not request another payment for this project.
- A lost mobile payment journal after quote requires an operator to check the chain and release or resolve the reservation. Do not clear it automatically or ask the user to pay again.
- This is a local Testnet trial, not a production/Mainnet payment release or a claim that all back-office functionality is complete.
