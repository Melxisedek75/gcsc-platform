# Plan and checkpoint

1. Preserve dirty publication worktree and isolate this branch from draft PR #3. DONE: `codex/wallet-reconcile-20261018` from `490bd6fc`.
2. Reproduce stale SDK storage and logout/pairing races against the actual mobile module. DONE: new tests were red before the fix and now pass.
3. Make narrowly scoped wallet storage/session changes; keep canonical proof and payment logic. DONE locally in `5b12504d` and `828f2e03`; final independent review and WebAuth device acceptance remain open.
4. Run repository, wallet, API, and bundle checks. PARTIAL: wallet 102/102, TypeScript and `npm run check` passed. Full API 363/364; the ownership-binding file still fails the standard 5-second Jest timeout on this Windows runner. A 30-second diagnostic run passed 3/3, but is not a substitute for the standard test.
5. Restore official local Android toolchain and build/verify version 0.1.8 APK. DONE: JDK 17, Android SDK, Gradle `BUILD SUCCESSFUL`, verified package/version/API origin/arm64/signature; SHA-256 and path in REPORT.md. An initial APK failed the API-origin guard; a fresh Gradle JS bundle and incremental repackage passed it.
6. Confirm installed-app behavior on Pixel 8 without clearing data; do not authorize a real signature or transaction. PARTIAL: ADB `install -r` succeeded, Android reports 0.1.8 (code 10), app process starts without a filtered fatal error. Email login, session recovery, selected WebAuth identity and ownership proof remain unverified because local API is stopped and owner interaction is needed.
7. Record evidence/limits, seek independent review and formal repository review gate before any integration. PARTIAL: REPORT.md added. Formal CODEX/CLAUDE gate and receiving integration remain pending; no push, merge, deploy or live payment.
