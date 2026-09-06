# Explicit API configuration: local implementation plan

Scope: remove implicit production API selection in web/mobile without changing
authentication, wallet signatures, payment amounts, routes or backend behavior.
This is one local checklist subtask; no deployment or independent approval implied.

## Contract
- Require an explicit absolute HTTP(S) backend origin, no credentials/query/fragment.
- Accept an origin or an origin ending in /api (legacy web env); normalize to origin.
- Accept HTTP only for loopback/private IPv4 and Android emulator host; HTTPS for
  explicitly selected hosts. This validates syntax, not authorization to contact hosts.
- Keep existing VITE_API_URL and EXPO_PUBLIC_API_BASE_URL input names.
- Share one pure URL resolver; platform adapters read build-time env explicitly.
- Missing/invalid settings throw API_CONFIGURATION before fetch, not at module import.
- Mobile API must not import payments/SDK merely to determine its base URL.
- Payment endpoints remain relative paths during render; resolve inside the payment
  request try/catch, so missing config cannot crash import or screen render.
- Remove baked-in API origins from EAS profiles; actual build env is supplied separately.
- Metro watches only the shared packages directory in addition to its normal defaults.

## Execution and acceptance
1. Reproduce unsafe no-env requests using stubbed fetch; verify current provenance tests.
2. Implement resolver, adapters, dependency separation and EAS/Metro wiring.
3. Test normalized paths, no-env import, no-fetch invalid config, legacy /api,
   local IPv4/IPv6, invalid/unsafe URLs, payment failure and static Expo env syntax.
4. Record exact adapted source hashes; run existing checks and web type/build checks.
5. Record evidence and remaining native-device/reviewer gates without self-approval.

No .env, secret, remote account, live server or wallet is accessed in these tests.

References: [Expo env inlining](https://docs.expo.dev/guides/environment-variables/)
requires direct dot notation; [Metro monorepo guidance](https://docs.expo.dev/guides/monorepos/)
documents shared-directory visibility. No new dependency or workspace-hoisting change.

## Local configuration examples

For a separately prepared local backend on its default port 10000:
- Web build input: VITE_API_URL=http://127.0.0.1:10000
- Android emulator input: EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:10000
- Physical device: explicitly supply the computer's reachable private LAN address,
  or localhost only with a separately configured USB reverse tunnel.

These are examples, not connections created by this task. Missing configuration
now blocks requests. A successful unconfigured web build is NOT a usable test
release: the next native-build preflight must validate env before producing an APK.
Build inputs are public in the client bundle; never put credentials in them.

## Verified result, 2026-09-06

- Baseline npm test: 7/7 PASS before edits.
- Initial node --test tests/api-config.test.mjs: 11 FAIL; reproduced unsafe no-env
  web/native fetch, inconsistent /api joining and embedded EAS production origin.
  Missing resolver/adapter were also reported before their implementation.
- npm run test:api-config: 14/14 PASS after implementation (offline fetch/storage/
  wallet boundary stubs). Includes actual compiled client modules, not just text scans.
- npm run check: 7/7 provenance tests, API syntax and 3 static web checks PASS.
- npm run build:web: TypeScript + Vite PASS. Existing large chunk/Browserslist warnings.
- npm run lint:web: 0 errors, 1 existing DecryptText.tsx:112 cleanup-ref warning.
- Targeted native adapter typecheck PASS:
  node apps/web/node_modules/typescript/bin/tsc --noEmit --strict --module esnext --moduleResolution bundler --target ES2022 --skipLibCheck --types node --typeRoots apps/web/node_modules/@types apps/mobile/lib/api-config.ts
- git diff --check: PASS.
- npm run check:integration-contracts: still FAIL, 5/7 required routes present;
  backend /api/auth/wallet/challenge and /api/auth/wallet/verify remain absent.

## Review handoff

Status: NOT_APPROVED. Author: current Codex execution context.
Base: 5a520f49e5087cfd47dccb7ea0b849dfd36e14ae. Review branch codex/frontend-integration.
No independent reviewer was launched again after the recorded quota failures.
Reviewer must rerun the commands above, inspect four adaptations against preserved
source blobs, and check native packaging of shared .mjs plus actual Expo env inlining.

Remaining gates: real Metro/Hermes bundle, full native type/build baseline, offline
device acceptance, configured local API E2E, security review of wallet auth, and
independent approval. The Metro test verifies the config structure with a stubbed
Expo default, not a real native bundle. No APK, SDK signature, transfer or server
deployment was performed. Do not merge this branch on the basis of these unit tests.
