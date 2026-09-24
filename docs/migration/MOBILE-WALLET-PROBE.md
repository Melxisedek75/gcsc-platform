# Native WebAuth USB Probe

Date: 2026-09-14. P2.2c evidence, not application-authentication acceptance.

## Scope

- Runtime source candidate: 04561155, base 512d7a9a; CI-only follow-up466e7e9d.
- Branch: codex/mobile-wallet-probe-20260914, frontend worktree.
- Includes the existing reviewed UI-1 and sign-only proof codec/adapters.
- Installed native SDK is @proton/react-native-sdk5.1.0-rc-2;
  @proton/signing-request is5.1.0-rc-1. Do not confuse the two package versions.
- New opt-in route: smartcontractor://wallet-probe. Normal builds disable it.
- Fresh native SDK pairing uses process-only storage under a separate prefix.
  Existing application JWT, wallet storage, profile and database are not read or
  changed by the diagnostic path. An exact probe cold-start skips app hydration.
- Loopback port10001 is a disposable diagnostic listener, not a second app API.
  It has no database, JWT, payment or authority adapter and expires after30minutes.
- Only reqauth plus the domain/session-bound nonce are permitted by the shared
  requester. broadcast:false and noModify:true; never retry a broadcast.
- Recovered K1/R1 signatures and exact bytes do not grant application login.
  SIG_WA fails closed; only its type/count/byte length are recorded for diagnosis.
- Wallet approval belongs to the owner. No raw signature, private key or session
  content is written to diagnostic logs. No production service or payment used.

## Verified Before Native Build

- Pixel8 USB authorized, installed app0.1.3/code5; WebAuth2.1.62/code173.
- Both configured public RPC get_info responses match XPR Testnet chain71ee83bc...
- npm run check:47tests plus static/syntax PASS, exit0.
- npm run check:mobile-types:exit0.
- node --test tests/wallet-device-probe.test.mjs tests/wallet-proof-client.test.mjs
  tests/mobile-design.test.mjs:34/34 PASS, exit0.
- git diff --check:exit0.
- npm run test:api:6suites,211/211 PASS, exit0,295.217seconds on this candidate.
- Incorrect initial node --test invocation of the Jest API file failed with
  test-is-not-defined. Correct repo runner npm run test:api passed instead;
  do not classify the incorrect invocation as a source failure or a passing test.

## Installation Procedure

Use the existing explicit JDK17, Android SDK and Gradle cache, one build worker.

```powershell
$env:JAVA_HOME='C:\gcsc\.tools\jdk17-full\jdk-17.0.20+8'
$env:ANDROID_HOME='C:\gcsc\.tools\android-sdk-full'
$env:GRADLE_USER_HOME='C:\gcsc\.tools\gradle-user-home-arm64'
$env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:10000'
npm run build:apk:local -- --wallet-probe
```

Verify embedded JS/API origin, package0.1.4/code6, arm64 and release developer
support disabled. Verify signer equals the existing installed APK. Use install-r,
never uninstall or clear storage. Start the loopback diagnostic service, configure
ADB reverse10001, force-stop only SmartContractor, and launch the exact probe
deep link. Do not cold-start the normal app against an absent application API.

The owner first approves pairing, then explicitly approves a sign-only testnet
ownership challenge. Inspect sanitized probe/status, actual screen and SDK shape.
Device, real-wallet and full login/payment acceptance remain open until observed.

## Acceptance Record

Independent reviewer Pauli (separate Sol/high context,
01a0a1de-c575-72c0-bc02-45af2ef77e87) returned APPROVED_SOURCE_ONLY for
512d7a9a..04561155 and CI delta04561155..466e7e9d. No actionable findings;
32/32 focused checks exit0. Review covered the actual installed SDK rc-2.

The APK verifier does not prove the probe flag from the artifact alone. Confirm
the explicit build command and enabled diagnostic screen on the phone. No
connected/signed or application-login claim follows from fixture tests or review.

## Native Build And Installation

- Full build/verification exited0: BUILD SUCCESSFUL in25m1s,488tasks
  (45executed,443up-to-date). lintVitalRelease passed.
- Embedded release JS/Hermes:1316modules,28asset files; no Metro server required.
- APK:29822797bytes, SHA256
  e102f6621c01509426f55a5b2e1ab605f3811c9a43490792fd8d8ec9260b8a18.
- Delivery: C:/Users/rivne/Downloads/SmartContractor-0.1.4-usb-wallet-probe-04561155.apk.
- Original downloaded0.1.3 APK was absent. Pulled the installed package's base.apk
  (not its data) to .tmp/wallet-probe-20260914/installed-before.apk instead.
  Its SHA256 matches the previously recorded6b06ca9ce5a0cb3ee5bfae1e806c2abfa528ea8f4a29355efff5267aae1eef56.
- Old/new signer SHA256 both
  fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.
- adb install-r returned Success, exit0. Package manager confirms0.1.4/code6,
  lastUpdateTime2026-09-14 15:11:18. No uninstall, data clear or permission grant.
- Two explicit probe cold launches returned Status:ok, about1.4seconds each.
  This is activity-launch evidence, not proof of the rendered diagnostic state.

## Observed Wallet Boundary

- First captured foreground was WebAuth, showing Invalid Network. Its selector
  showed XPR Network (mainnet), while this probe only requests XPR Testnet.
- Opened the selector and observed that XPR Network Testnet is available.
- A tap intended to select Testnet coincided with a phone-call screen appearing.
  Selection and subsequent diagnostic-screen rendering are NOT confirmed.
  Further device interaction stopped so as not to interfere with the call.
- The incidental call screenshot was removed from local temporary files and the
  generated phone screenshot was removed. No call/contact details retained here.
- Local probe health verified diagnostic-only/testnet/authenticationGranted:false.
  No challenge/proof/response observation was recorded before the interruption.
  Mainnet selection is a concrete diagnostic clue, not a proved sole root cause.
- No agent-approved pairing, signature, transfer, database or production action.

Resume: after the owner is ready, verify/restart the expiring loopback service and
ADB reverse10001, confirm XPR Testnet, inspect the actual enabled probe screen,
then let the owner approve pairing and a sign-only challenge. Record the SDK
response shape and exact proof result. SIG_WA handling, durable store/current
authority, app HTTP/JWT, desktop and lead purchase acceptance remain open.

## 23 September Channel Failure And Candidate Fix

- Pixel8 reproduced successful pairing for `gcsctoken111@active`, followed by a
  failed sign-only request. The local challenge was created, but no sanitized
  wallet response reached the probe server. USB reverse and loopback health were
  both available, so this was not classified as an ADB or probe-server failure.
- Android ActivityTaskManager evidence distinguished the two paths: pairing
  opened a complete `proton-dev:<ESR payload>` URI and returned to
  `smartcontractor://wallet-probe`; signing opened only `proton-dev://link`.
  The latter relies on the paired push channel and produced no proof callback.
- The candidate keeps the paired identity snapshot but sends the exact same
  `broadcast:false`, `noModify:true` ownership transaction through the parent
  Proton Link transport. This hands the complete ESR to WebAuth instead of using
  the failed session channel. Exact bytes, signer and expiry still fail closed in
  the shared proof requester and verifier.
- Focused probe tests: 9/9 PASS. Mobile TypeScript: PASS. `git diff --check`: PASS.
- Release probe build: BUILD SUCCESSFUL in 26m10s, 488 tasks; embedded bundle
  1317 modules and 28 assets. APK size 29825201 bytes; SHA256
  `5260f4b4e0b6396b8c0993a67f2b286291948dcecb4838843da3cbddf604df07`.
- `adb install -r` returned Success. Package manager confirms 0.1.4/code6,
  targetSdk36 and update time 2026-09-22 23:35:39. The diagnostic screen rendered
  `Paired; ownership not yet checked`, `Application login: Not granted`, and
  `Payments: None. Broadcast disabled.`
- Device acceptance remains OPEN: only the owner may approve the next WebAuth
  sign-only prompt. Until its response is observed and exact bytes verify, this
  is a built and installed fix candidate, not a completed wallet login.
