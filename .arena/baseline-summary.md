# Wallet Arena baseline — 2026-10-17 UTC

Authorized private source: Melxisedek75/gcsc-platform main a0834ac7917c3de57ebc02fb542814561469bca2, retrieved with GitHub connector after explicit user permission. Shell clone failed because no GitHub credentials are available to shell; no credential extraction attempted. Local Git is an analysis snapshot with its own commits, not original history. Every materialized original file was verified against its Git blob SHA. Two binary PNGs could not be retrieved through connector UTF-8 restriction; no replacement assets invented. This does not block wallet source/tests.

Pinned dependency install: npm ci --ignore-scripts --no-audit --no-fund at root, services/api/v3, apps/web, apps/mobile. All exit0. Lockfiles unchanged. Lifecycle scripts intentionally not executed; no production env supplied.

| Check | Observed baseline | Evidence |
|---|---|---|
| npm run test:api | PASS, 5 suites,159 tests | baseline-api.log |
| node --test tests/wallet-restore.test.mjs tests/wallet-sdk-identity.test.mjs tests/wallet-challenge-payload.test.mjs | PASS,54 tests | baseline-wallet.log |
| npm run check:integration-contracts | FAIL,5/7; missing POST /api/auth/wallet/challenge and /verify | baseline-contracts.log |
| npm run build:web | PASS, TypeScript+Vite; chunk size warning | baseline-web-build.log |
| npm run check:mobile-types | PASS | baseline-mobile-types.log |

No physical phone, real WebAuth signature, current production artifact SHA, production DB, settlement, APK install or live wallet-to-API acceptance tested. These baseline checks are not wallet acceptance.

Run: wallet-20261017. 100 competitors,seed20261017,waves5,7 rounds,595 jobs. State managed by arena-codex bracket.py; application code fixed during proposal tournament. Counts must come from actual state/output files. No simulated tournament counts or historical scratch fixes are completion evidence.
