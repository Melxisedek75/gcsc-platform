# Mobile wallet reconciliation report

## Local candidate

- Branch: `codex/wallet-reconcile-20261018`, based on draft PR #3 checkpoint `490bd6fc`.
- Source commits: `5b12504d` (stale WebAuth session invalidation), `828f2e03` (fail-closed cleanup).
- Wallet ownership proof remains mandatory. No real XPR transaction, signature, payment, production API or live Supabase operation was performed.
- Local test APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`, SmartContractor 0.1.8, Android versionCode 10, 32,544,369 bytes, SHA-256 `f93eab17d89d88899fca35dc92773421b39127497cd432ef158658ca147db5b7`.
- The APK guard verified package/version, arm64, non-debuggable manifest, embedded `http://127.0.0.1:3000`, absence of the legacy production API URL, and APK signature. This is a local USB test build, not a production release.

## Verification

- `npm run test:wallet-repair`: 102/102 passed after the wallet changes.
- `npm run check:mobile-types` and `npm run check`: passed after the changes.
- `npm run test:api`: 363/364 passed; `wallet-ownership-binding.test.js` exceeded the standard 5-second Jest timeout. A standalone standard run after the Android build failed 2/3 tests on timeout. A separate diagnostic run with `--testTimeout=30000` passed 3/3; it does not clear the standard-test failure.
- Native Gradle release assembly succeeded. The first APK failed the required API-origin check. An explicit fresh `:app:createBundleReleaseJsAndAssets --rerun-tasks` produced the expected origin, incremental `:app:assembleRelease` succeeded, and `verify-mobile-apk.ps1` passed with explicit local JDK 17.
- Pixel 8 ADB ID `38031FDJH002QW`: `adb install -r` succeeded without clearing data; `dumpsys package` reports 0.1.8/code 10. MainActivity launched and the app process remained alive; no matching AndroidRuntime/ReactNativeJS fatal error appeared in the filtered recent log.

## Still open

- Local API at `127.0.0.1:3000` is stopped. No email registration/login, account recovery, session restoration, cross-device role data, or wallet pairing was accepted on the new APK. The old account database location has not been established; do not replace it with an empty database and call this recovery.
- On-device WebAuth account selection, cancellation/retry, verified owner binding and logout/login switching need owner-assisted checks. No transfer should be attempted until the displayed signer matches the account selected in WebAuth and server ownership proof succeeds.
- Standard API timeout needs a bounded root-cause check on an uncongested runner. Do not weaken the test solely to obtain a green result.
- Final independent review and the repository CODEX/CLAUDE review gate are required before receiving integration. No GitHub push, PR update, merge, deploy or phone-data wipe was done.
