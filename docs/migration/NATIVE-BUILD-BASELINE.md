# Native local bundle baseline

Goal: reproduce Android Metro/Hermes output from this worktree, without accounts,
remote APIs, wallet signatures, Gradle/APK installation or a production deployment.

Plan:
- [x] Install existing lockfile offline with lifecycle scripts disabled.
- [x] Run full native TypeScript check before edits.
- [x] Run one-worker Android export with explicit loopback API and dotenv disabled.
- [x] Add a tested root bundle command that rejects missing/remote API before Metro.
- [x] Verify resulting assets and record exact commands, failures and limitations.

The root command allows localhost, 127.0.0.1, [::1] and Android emulator 10.0.2.2
only. It is specifically a local build baseline, not a phone-ready distribution.
It inherits only OS paths/temp/user-directory env, sets Expo offline/no telemetry/
no dotenv, and forces production JS transforms and one worker. It does not inherit API
keys, NODE_OPTIONS, Expo tokens or env switches that disable public-variable inlining.
The shared URL resolver validates/normalizes the API before spawning Expo.

Files: scripts/bundle-mobile-local.mjs, tests/mobile-build.test.mjs, root package.json.
Acceptance: red/green preflight tests, full native types, successful Android export,
non-empty Hermes bundle with the configured URL, existing config/provenance checks.
Independent review and actual phone/SDK behavior remain separate gates.

## Verified result (2026-09-07 UTC)

Branch: codex/frontend-integration. Base: 4ec7a0b7. No integration or remote changes.
Review status: NOT_APPROVED; no independent reviewer result for this candidate.
Previous reviewer attempts were quota-blocked; they were not repeatedly dispatched.

Commands run from the worktree root unless noted:

| Command | Result | Scope |
| --- | --- | --- |
| npm ci --offline --ignore-scripts --no-audit --no-fund (apps/mobile) | exit 0, 837 packages | Existing lockfile, no dependency updates; deprecation warnings remain |
| node --test tests/mobile-build.test.mjs (before runner existed) | 4 FAIL | Red phase: missing guarded build command |
| npm run check | exit 0, migration 7/7, build guards 4/4, syntax/static web PASS | Includes configuration rejection before Metro |
| npm run test:api-config | exit 0, 14/14 | Offline client tests, not actual wallet/network calls |
| npm run check:mobile-types | exit 0 | Full native TypeScript project, installed dependencies |
| npm run bundle:android:local (env below) | exit 0, 1110 modules | Real Expo/Metro/Hermes export, one worker |
| git diff --check | exit 0 | Scoped tracked changes |
| npm run check:integration-contracts | exit 1, 5/7 routes | Known missing wallet challenge/verify; not hidden or bypassed |

Reproduce the guarded export in PowerShell:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:10000'
npm run bundle:android:local
```

The direct Expo export also passed before the guarded command was added. Following
an interrupted continuation, no matching build process was running; the guarded
command was rerun and its exit 0 was observed on 2026-09-07. An artifact left behind
by an interrupted run was not used as a substitute for the completed command.

Output under ignored .tmp/android-baseline:
- Bundle: _expo/static/js/android/index-1a8c2e90fefe71905c8577d6bb49335d.hbc
- Size: 3,795,880 bytes.
- SHA-256: c5ab570d6afb666f9bd98dac1e72305837fbf5fef52e1453e72db23bbb34c534
- Metadata modification: 2026-09-07T03:34:01.659Z.
- Metadata has 26 asset references; all 24 unique referenced files exist and are nonempty.
- Binary contains http://127.0.0.1:10000 and does not contain the former
  https://gcsc-backend-production.up.railway.app origin.

The artifact was checked using Node fs/path/assert/crypto: parse metadata, verify
bundle/assets stay inside the output directory, assert nonzero sizes, search bundle
bytes for the two explicit origins, and calculate SHA-256. This is not a complete
secret/URL audit or proof of runtime connectivity.

## Remaining gates

This is JS/Hermes output, NOT an APK. No Gradle build, installation, emulator,
phone launch, wallet signature, ownership verification or payment was performed.
NODE_ENV=production selects optimized JS transforms; it is not a production deploy.
Loopback in this baseline is intentionally not a phone-ready backend address without
separate USB/emulator networking setup. No backend service was contacted or started.
Source apps and mobile lockfiles were not changed by this build task.

Next: independently review this candidate and API configuration candidate, then
address the wallet-auth protocol/ownership and missing routes in the backend lane.
APK/device, PostgreSQL, contract and E2E acceptance remain separate unfinished work.
