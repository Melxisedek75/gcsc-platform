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

## Next local candidate (0.1.9)

- `e6eeb9dd`: sign-out invalidates the WebAuth signer immediately and clears the app session without waiting for native wallet cleanup; both profile screens no longer repeat the cleanup.
- `531cb7aa`: app sign-out requires confirmation of native credential deletion, with an explicit warning instead of claiming success on a timeout; reconnect reports stalled wallet cleanup without opening a signing request.
- `3c935f5e`: serializes native storage mutations per key, so a late token write cannot land after confirmed sign-out and a late removal cannot erase the next login. Independent read-only review found no remaining substantial finding in this change. Mock tests do not prove Native AsyncStorage/device behavior.
- Latest checks: `npm run test:wallet-repair` 104/104, `node --test tests/mobile-auth-transport.test.mjs` 8/8, `node --test tests/wallet-storage.test.mjs` 2/2, `npm run test:mobile-design` 11/11, `node --test tests/mobile-apk.test.mjs` 9/9, `npm run check:mobile-types` and `npm run check` passed.
- Fresh JS bundle `BUILD SUCCESSFUL in 14m 29s`; incremental Android release assembly `BUILD SUCCESSFUL in 11m 12s`. `scripts/verify-mobile-apk.ps1` passed package/version, arm64, non-debuggable manifest, local `http://127.0.0.1:3000` API origin, no embedded legacy production API, and signature. APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`, 0.1.9/code 11, 32,545,281 bytes, SHA-256 `0ccc68640afe96c89dad8302a3be3de8d9eb14671d044e00909f5afa61b84fba`.
- Pixel 8 `38031FDJH002QW`: `adb install -r` succeeded without deleting app data; `dumpsys package` reports 0.1.9/code 11. MainActivity starts, process remains alive, and filtered recent AndroidRuntime/ReactNativeJS log shows no fatal error. This does not establish successful account login or WebAuth device acceptance.
- New loopback-only development API at `127.0.0.1:3000` is running with explicit local JSON storage, a fresh ignored `services/api/v3/gcsc.db`, XPR background verifier disabled, and `adb reverse tcp:3000 tcp:3000` on the Pixel. This is not the previous account database or PostgreSQL acceptance. Its ephemeral local JWT secret means server restart can invalidate test sessions; no session-across-server-restart claim is made.
- Local HTTP smoke on synthetic `example.invalid` identities: three independent `register -> login -> profile` cycles passed (homeowner, contractor, homeowner); a homeowner created and freely published a synthetic job, the contractor saw it in the public list, and an unpaid bid was denied with HTTP 403. No lead purchase, signature, transfer, escrow, or real user data was used.
- The owner's `Retry` screenshot was sent after 0.1.9 work began but shows the earlier installed version with the local API stopped. It is not evidence of a 0.1.9 regression or successful account recovery.

## Still open

- The previous account database location has not been established. The new empty local test database must not be called account recovery. Pixel email registration/login, session restoration, cross-device role data, or wallet pairing are not yet accepted on 0.1.9; the owner must exercise the app without sharing passwords or codes.
- The mobile sign-in screen displays `Forgot password?` as non-interactive text, and this API has no password-reset route. Secure self-service password recovery and support-assisted recovery remain unimplemented; do not claim the flow works or invent a reset without a verified delivery channel and abuse controls.
- On-device WebAuth account selection, cancellation/retry, verified owner binding and logout/login switching need owner-assisted checks. No transfer should be attempted until the displayed signer matches the account selected in WebAuth and server ownership proof succeeds.
- Standard API timeout needs a bounded root-cause check on an uncongested runner. Do not weaken the test solely to obtain a green result.
- Final independent review and the repository CODEX/CLAUDE review gate are required before receiving integration. No GitHub push, PR update, merge, deploy or phone-data wipe was done.
