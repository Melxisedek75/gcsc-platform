# Plan and checkpoint

1. Preserve dirty publication worktree and isolate this branch from draft PR #3. DONE: `codex/wallet-reconcile-20261018` from `490bd6fc`.
2. Reproduce stale SDK storage and logout/pairing races against the actual mobile module. DONE: new tests were red before the fix and now pass.
3. Make narrowly scoped wallet storage/session changes; keep canonical proof and payment logic. DONE locally, pending final review and device acceptance.
4. Run repository, wallet, API, and bundle checks. IN PROGRESS: wallet 100/100 and `npm run check` passed before version bump; API 363/364 with ownership-binding timeout, separate rerun also timed out. Investigate without weakening the test.
5. Restore official local Android toolchain and build/verify version 0.1.8 APK. IN PROGRESS: JDK 17 and command-line tools hashes verified; SDK packages downloading.
6. Confirm installed-app behavior on Pixel 8 without clearing data; do not authorize a real signature or transaction. PENDING.
7. Record evidence/limits, seek independent review and formal repository review gate before any integration. PENDING.
