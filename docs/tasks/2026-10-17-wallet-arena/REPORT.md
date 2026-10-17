# Wallet repair candidate — 2026-10-17

Source: `codex/mobile-prototype-integration-20261012@f91c3cb8586f453b298aab5074f41436e7db9840`; private result branch starts at that candidate, not stale main. Reviewed local code pin: `719a934a2ff54d5e91f136f71959e9f1d3616090`, compared with hydrated original `28603b8`. Local snapshot ancestry must never be pushed as remote ancestry.

## Changes and demonstrated behavior

- Explicit web linking now uses authenticated challenge, sign-only ownership proof and verification. SDK restore remains local/unverified. Web/mobile reject changed app sessions and cancellation before applying results; leaving the mobile connection screen aborts subsequent binding work.
- Native transfer preserves the proven parent Proton Link transport. Actual account, permission and chain must match before broadcast. App-session changes during asynchronous SDK restore prevent broadcast. No automatic re-pair/rebroadcast; SDK timeout keeps the concurrency guard until the underlying request settles.
- Native payment writes an AsyncStorage journal before invoking the wallet. Known hashes retry verification only; pending responses are not success. Unknown outcomes remain blocked after restart. Request/body reads are bounded; the sheet can be hidden without clearing payment state or the operation guard. Missing endpoints never synthesize payments; 401/403 do not erase another login.
- Web escrow validates ownership/session before broadcast, supplies the contract's required disputems.actor, uses an exclusive Web Lock and persistent attempt journal. Known hashes can be reused for recording; unknown outcomes remain blocked across reloads. Missing Web Locks or storage fails closed. A lost record response directs the user to refresh the audit trail rather than assuming no broadcast.
- API retries broadcast and pending chain records fairly by persisted last observation time, preventing ten stale records from starving later work. Lead-token same-hash replay returns actual state only to the receipt/lead owner; foreign owner/kind remains generic409. No second transfer is triggered by these API reads.

## Executed verification

| Check | Result |
| --- | --- |
| Focused actual-source wallet regressions (`npm run test:wallet-repair`, also added to Linux/Windows CI) | 91/91 PASS |
| Existing challenge/proof/login/probe/web-login regressions | 56/56 PASS |
| API Jest suite | 364/364 PASS, 17 suites |
| Other root provenance/schema/legacy/checkout/mobile/restore/static-validator checks | 51 PASS, 1 explicitly skipped native-tool check |
| Web production build; native TypeScript; static web; API syntax; diff whitespace | PASS |
| Available imported-source/receipt verification | 419 files match pinned blobs or exact adaptation hashes |
| Full `npm run check` | BLOCKED: original >1MB images gcsc-logo-round.png and hero-particles-texture.png could not be restored by the connector; no replacement or acceptance weakening |
| PostgreSQL receipt acceptance | Test updated for actual contract and syntax checked; NOT EXECUTED: local initdb/pg_ctl unavailable |
| Physical wallet/device and deployed contract/API | NOT EXECUTED; historical Pixel8 proof is not current acceptance |

Red-before/green-after evidence: native boundary 18 original failures plus3 app-session failures ->22 PASS; web settlement8 initial failures and6 followup failures ->20 PASS; payment12 original failures plus live-session/timeout followups ->18 PASS; binding11 service/cancellation checks plus8 screen cancellation cases PASS; SDK wrapper2 RED->GREEN; actual sheet-close handler1 RED->GREEN; queue10 original failures plus2 fair-retry/restart failures ->12 PASS; lead receipt replay12 focused original failures ->updated route suite PASS. Test IO is mocked or isolated; none is a real-wallet signature.

## Independent review and gates

Fresh read-only reviewer `/root/wallet_exact_diff_review` rejected initial code pin0740c9c with four concrete issues: app logout during native restore, pending-head starvation, unbounded nonclosable payment UI, and Skip/unmount binding cancellation. Each has a followup regression and repair. Final independent verdict: APPROVE for719a934, all32 scoped changed files reviewed; reviewer independently ran91/91 focused tests and12/12 queue tests from immutable Git objects, plus diff whitespace PASS. Review evidence: REVIEW.md in this task directory. This is a patch review, not a whole-repository backdoor/security certification.

Unknown transaction hashes require manual chain/wallet reconciliation; there is deliberately no automatic unlock or journal deletion. Clearing application/browser storage removes local guards, so these journals do not replace contract idempotency or server-side acceptance. Browser Web Locks availability, device callback behavior, current signing algorithm compatibility, live authority/RPC and deployed contract identity remain explicit acceptance gates. No production release, APK install, real signing, transfer, merge, deploy or scheduler restart occurred.

## Arena status — separate unfinished work

Arena100 is not complete:9 genuine jobs were launched in the earlier current-source run;4 outputs were historically checked,5 outputs remain unverified recovery material;0 elimination rounds and no champion. After runtime rehydration, bracket.next sees only2 present spawn outputs and98 missing. Preserve that state and recover/verify originals before counting them; do not treat summaries as submissions. Historical16 stale-main proposals are excluded. The current repair was prioritized independently in response to the owner's urgency and is not an Arena winner. Execution transport is now working; the previous transport blocker must not be described as still active.

Delivery: private draft PR https://github.com/Melxisedek75/gcsc-platform/pull/3, code commit436ceff932b1ec9e4f98e9282ccdc0a9d878c8a1; remote code blobs match the reviewed local patch, original assets preserved. GitHub reports mergeable:true/clean; this is not merge approval. Next: complete real PostgreSQL and user-controlled native/web testnet acceptance before integration/deploy. Resume the unfinished tournament separately from its preserved source/task checkpoint; no background continuation is claimed.

CI followup: GitHub Actions run39004566820 ended startup_failure before any job (jobs total0); no remote CI pass is claimed and the connector exposes no detailed startup reason. Local results above remain the executed verification.
