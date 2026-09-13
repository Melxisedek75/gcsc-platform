# Mobile startup recovery, 2026-09-13

Status: APK_VERIFIED / USB_DEVICE_NOT_CONNECTED.
Native artifact verified; device, local API and full wallet/payment acceptance remain open.
Candidate: 2094b69c, branch codex/mobile-startup-recovery-20260913.
Workspace: C:/gcsc-platform/.worktrees/frontend, based on private main 4fcb08ea.

## Verified APK and delivery

The guarded offline rebuild completed with exit 0: BUILD SUCCESSFUL in 24m 11s,
488 actionable tasks (48 executed, 440 up-to-date). lintVitalRelease passed
without suppression. Log: .tmp/apk-build-20260913-retry.log.

| Property | Verified value |
| --- | --- |
| Build source commit | 2094b69c87020de4100f2382bd4a118c4eb43e33 |
| Version/package | 0.1.3 / code 5 / com.gcsc.smartcontractor |
| Label/architecture | SmartContractor USB / arm64-v8a |
| Delivery | C:/Users/rivne/Downloads/SmartContractor-0.1.3-usb-2094b69c.apk |
| APK bytes | 28,504,933 |
| APK SHA-256 | 6b06ca9ce5a0cb3ee5bfae1e806c2abfa528ea8f4a29355efff5267aae1eef56 |
| Embedded JavaScript bytes | 2,254,000; assets/index.android.bundle exists |
| API origin | http://127.0.0.1:10000; legacy Railway origin absent |
| Wallet network | Embedded XPR testnet chain ID matches source |
| Signing | apksigner verify exit 0; v2 signature valid; Android Debug certificate |
| Signer certificate SHA-256 | fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c |
| Developer-mode requirement | application-debuggable absent; embedded bundle, not Metro-only APK |

Manifest networkSecurityConfig references 0x7f130001. AAPT resource optimization
renamed its ZIP path to res/dP.xml; inspecting the original source path inside
the APK failed, then the resource table resolved the correct packaged path.
The compiled XML was inspected successfully: global cleartext=false, only the
four exact local hosts allowed, all includeSubdomains=false. No check was skipped.

The delivery copy hash matches the built APK. C: measured 4.150 GiB free after
packaging and delivery. Latest ADB list is empty. No APK installation, uninstall,
data wipe, device startup, wallet signature, payment, live database or deployment
occurred. Do not claim the earlier red screen has disappeared on the phone until
this exact APK is installed and launched there.

This is a USB-local test candidate, not a production release or an away-from-PC
service. The local API has not been started. Wallet-first challenge/verify routes
and end-to-end lead purchase remain open in WALLET-API-CONTRACT.md. Do not ask the
owner to repeat a full wallet purchase test before the relevant API work is ready.

Next device step: reconnect Pixel 8, compare its installed app certificate with
the verified signer, then update with adb install -r only if compatible. Preserve
app data. Capture exact installed version, startup screenshot and scoped logs.
The API stage needs an isolated local server and adb reverse tcp:10000 tcp:10000.

## Confirmed failure

ADB detected an authorized Pixel 8. Installed SmartContractor is 0.1.2,
versionCode 4, last updated 2026-08-23. A fresh launch reproduced:
`EXPO_PUBLIC_API_BASE_URL is required for a production build`, followed by
an Expo Router ErrorBoundary error. The first error occurs during import,
before wallet pairing or any transaction. Screenshot retained locally at
C:/gcsc-platform/.worktrees/publication/.tmp/device-recovery-20260913/before.png.

The current monorepo already resolves API configuration lazily and tests import
without env. The installed artifact predates this code. Replacing or rewriting
wallet cryptography is not a remedy for this startup failure.

## Implemented preparation

- Candidate version 0.1.3 / Android code 5; no app uninstall or data wipe.
- Guarded `npm run build:apk:local`: explicit local API, sanitized environment,
  Expo prebuild without dependency installation, offline-by-default arm64 Gradle release
  build with one worker, and embedded-bundle/signature/version verification.
- Release here means native packaging without Metro, signed with the generated
  debug key. It is NOT a production release or a store-ready signing identity.
- USB mode is visibly named SmartContractor USB. Android permits HTTP only for
  loopback/emulator hosts; other hosts retain the default TLS requirement.
  Normal prebuild removes this plugin's test network-policy reference.
- JDK, SDK and Gradle cache paths are explicit. No signing keys, API tokens or
  dotenv files are inherited by the build subprocess.
- Expo-generated `android`/`ios` scripts are normal development commands, not
  the standalone delivery path. Use the guarded root command for a USB APK.

## Earlier source and prebuild checks

| Check | Result |
| --- | --- |
| New APK regression tests before implementation | 4 failures (RED) |
| npm run check | exit 0: 24 provenance tests, 11 build tests, 11 wallet-restore tests, syntax/static checks |
| npm run test:api-config | 15/15, exit 0; mocked native/storage boundaries |
| npm run check:mobile-types | exit 0 |
| Expo prebuild --platform android --no-install with sanitized local env | exit 0; generated code 5/version 0.1.3 and loopback policy inspected |
| npm run bundle:android:local | exit 0, 1110 modules |
| PowerShell APK verifier parsing | PASS; not executed against a new APK |
| npm run build:apk:local with explicit tool paths | exit 1 at disk preflight; Gradle NOT started |

Hermes output: .tmp/android-baseline/_expo/static/js/android/index-1a8c2e90fefe71905c8577d6bb49335d.hbc.
Size 3,795,880 bytes; SHA256 ba5a7f527c6355330d307ded95c27cf0491876eeef4a0d8a0e2a48d9c2e9b8bf.
Timestamp 2026-09-13T08:45:47.727Z. All 26 asset references exist and are nonempty.
Bundle contains http://127.0.0.1:10000, not the former Railway application origin.
This is JS/Hermes evidence, NOT an installable APK.

Prebuild warned that automatic system UI styling needs expo-system-ui; no package
was installed to conceal this warning. Dependency versions/lockfiles are unchanged.

## Disk recovery and exact continuation

Earlier only about 2.4 GiB remained on C:. The runner requires a conservative 4 GiB starting
reserve; this is not a guarantee that every native build fits in that reserve.
Deletion of the old C:/gcsc/.tools/gradle-user-home-fresh/caches/8.14.3/transforms
cache (measured 2.15 GiB) was rejected by tool policy before execution. It remains
on disk. No alternate deletion method was attempted; sources and caches retained.

After authorized npm cache cleanup, C: measured 5.62 GiB free before the resumed
build. Sources, SDK, JDK and the active Gradle cache were retained. Disk preflight
now passes. Resume this branch, not the legacy Android tree:

```powershell
cd C:\gcsc-platform\.worktrees\frontend
$env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:10000'
$env:JAVA_HOME='C:\gcsc\.tools\jdk17-full\jdk-17.0.20+8'
$env:ANDROID_HOME='C:\gcsc\.tools\android-sdk-full'
$env:GRADLE_USER_HOME='C:\gcsc\.tools\gradle-user-home-arm64'
npm run build:apk:local -- --download-dependencies
```

For a future rebuild, compare the APK signing certificate with the installed app before updating;
never uninstall to force an incompatible update. Start the canonical API with
isolated local test data, configure `adb reverse tcp:10000 tcp:10000`, and verify
actual startup/navigation/network behavior on Pixel 8. Record artifact hash,
installed version and screenshots before claiming device acceptance. An artifact
handoff alone must retain the explicit USB/API and unverified-device limitations.
USB-local API requires the computer connection; it is not an away-from-PC service.

## Windows launcher and dependency recovery

The old sanitized environment omitted PATHEXT/OS. Under that environment,
PowerShell `& .\gradlew.bat --version` returned 0 with no output: Gradle had not
executed. Restoring these Windows variables produced the real Gradle 8.14.3
version output. The runner now preserves them, quotes each native argument and
fails if LASTEXITCODE is absent. A real Windows batch fixture verifies argument
boundaries, embedded API/NODE_ENV and propagation of exit code 7.

The direct offline build then reached native configuration, but lacked the
React Native 0.81.5 and Hermes 0.81.5 release AARs. This is a dependency-cache
failure, not a wallet failure. The explicit --download-dependencies option lets
Gradle resolve dependencies through the existing repositories; Expo remains
offline/no-dotenv/production, versions and lockfiles are unchanged. Offline
remains the default. Maven Central returned HTTP 200 for the pinned React
Native release AAR. The resumed build is logged locally in
.tmp/apk-build-20260913.log. That run failed at lint; the corrected retry and
verified APK are recorded above. Device/wallet acceptance remains pending.

New regression tests first failed 2/7, then all 11 mobile-build tests and the
full root check passed after the correction. Pixel 8 was initially authorized,
then disappeared from ADB during this run; no install was attempted.

Wallet-first routes and coordinated ownership proof remain open in
WALLET-API-CONTRACT.md. Login/link/lead purchase are NOT accepted by these checks.
No wallet signatures, payments, live database, production calls, APK install,
public deployment or scheduler resumption occurred in this task.

## Native build and exact lint correction

The native build in .tmp/apk-build-20260913.log ended with exit 1 after
1h 8m 2s: 478 tasks, 436 executed and 42 up-to-date. Native C++, Java/Kotlin,
the 1110-module Hermes bundle, resources and dex processing completed. The
failure was :app:lintVitalRelease: four Missing includeSubdomains attribute
errors in generated gcsc_usb_network_security.xml. No completed APK resulted.

Candidate 2094b69c changes the source plugin, not generated XML, to set
includeSubdomains="false" on localhost, 127.0.0.1, 10.0.2.2 and ::1.
The default cleartext prohibition remains. No lint baseline, disabled check,
dependency upgrade or clean rebuild was introduced. The new assertion failed
before the correction; afterward all 11 mobile-build tests and npm run check
passed with exit 0 (24 provenance, 11 build, 11 wallet-restore, static gates).

C: fell from 5.62 GiB before compilation to 1.69 GiB afterward. The 4 GiB
starting guard is retained. The unused legacy Gradle cache measured
3,389,850,892 bytes; a bounded deletion was rejected by tool policy before
execution. That cache remains intact. Do not retry through another mechanism.
Disk reserve was then recovered without removing sources or changing guards:
- Native pip cache purge removed 1080 cache files, 395.9 MB; installed packages retained.
- Native npm cache cleanup removed regenerated download-cache contents, not node_modules.
- NTFS compression of the installed NDK completed with exit 0. The compiler's
  SHA-256 was unchanged; 2,361,068,505 data bytes occupy 1,302,146,051 bytes.
- Gradle cache compression was narrowed from a slow recursive pass to 207 large
  files; 60 large generated Android output files were compressed separately.
  Both bounded passes exited 0. Files were retained, not deleted.
- React Native release AAR remains 133,827,717 bytes with expected SHA-1
  8de270a2394cba16d10053186f09af98c9cb8308 after compression.
- C: measured 4.239 GiB before retry, about 2.55 GiB above the post-failure
  measurement. These are net disk observations, not additive directory sizes.

The normal offline-by-default build was restarted without clean, skip-lint or
temporary CLI workarounds. Prebuild regenerated the four explicit attributes;
lint and APK verification subsequently passed. See the verified artifact above.

Jason independently reviewed just the two-file XML-generator/test correction
and returned APPROVED - SCOPED SOURCE ONLY, with no findings. The reviewer ran
7/7 APK tests and scoped git diff --check successfully, without modifying files,
starting Gradle or accessing a device. The author subsequently completed native
lint/packaging and artifact checks; the review itself remains source-only and
does not imply wallet or device acceptance.

## Earlier independent reviews

Kepler, separate Sol/high context 01a099f1-0533-7842-affb-76cf4c9a8fdd, reviewed
4fcb08ea..19d44622 and returned APPROVED - SOURCE/PREPARATION ONLY. No concrete
defects found. Independently ran 9/9 build tests, JS/CJS syntax checks, normal/USB
Expo config checks and git diff --check. No files modified by reviewer.
This does not approve an APK, certificate compatibility, installation, Pixel 8
startup, API connection, wallet flow or payments. Later status/docs are author
verified; they do not extend the source review to device acceptance.

Jason, separate Sol/high context 01a09cbb-083e-7071-a4be-5b59b537c3e8, reviewed
the launcher/environment/download-mode changes against 6e623b8 and returned
APPROVED - SCOPED SOURCE ONLY, with no findings. Independently ran 7 APK tests,
4 bundle tests, changed JS/CJS syntax and diff checks. The Windows fixture
executed and returned exit code 7 as expected. No Gradle, phone or external
service operations by the reviewer; APK/device acceptance is not implied.

References: [Expo environment inlining](https://docs.expo.dev/guides/environment-variables/),
[React Native bundled variants](https://reactnative.dev/docs/0.81/react-native-gradle-plugin),
[Android network policy](https://developer.android.com/privacy-and-security/security-config).
