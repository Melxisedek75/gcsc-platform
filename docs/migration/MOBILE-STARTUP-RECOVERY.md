# Mobile startup recovery, 2026-09-13

Status: SOURCE_PREPARED / APK_BLOCKED_DISK. Not ready for full device testing.
Candidate: 19d44622, branch codex/mobile-startup-recovery-20260913.
Workspace: C:/gcsc-platform/.worktrees/frontend, based on private main 4fcb08ea.

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
  Expo prebuild without dependency installation, offline arm64 Gradle release
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

## Checks actually completed

| Check | Result |
| --- | --- |
| New APK regression tests before implementation | 4 failures (RED) |
| npm run check | exit 0: 24 provenance tests, 9 build tests, 11 wallet-restore tests, syntax/static checks |
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

## Disk blocker and exact continuation

About 2.4 GiB remains on C:. The runner requires a conservative 4 GiB starting
reserve; this is not a guarantee that every native build fits in that reserve.
Deletion of the old C:/gcsc/.tools/gradle-user-home-fresh/caches/8.14.3/transforms
cache (measured 2.15 GiB) was rejected by tool policy before execution. It remains
on disk. No alternate deletion method was attempted; sources and caches retained.

After disk capacity changes, resume this branch, not the legacy Android tree:

```powershell
cd C:\gcsc-platform\.worktrees\frontend
$env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:10000'
$env:JAVA_HOME='C:\gcsc\.tools\jdk17-full\jdk-17.0.20+8'
$env:ANDROID_HOME='C:\gcsc\.tools\android-sdk-full'
$env:GRADLE_USER_HOME='C:\gcsc\.tools\gradle-user-home-arm64'
npm run build:apk:local
```

Then compare the APK signing certificate with the installed app before updating;
never uninstall to force an incompatible update. Start the canonical API with
isolated local test data, configure `adb reverse tcp:10000 tcp:10000`, and verify
actual startup/navigation/network behavior on Pixel 8. Record artifact hash,
installed version and screenshots before giving the owner a download link.
USB-local API requires the computer connection; it is not an away-from-PC service.

Wallet-first routes and coordinated ownership proof remain open in
WALLET-API-CONTRACT.md. Login/link/lead purchase are NOT accepted by these checks.
No wallet signatures, payments, live database, production calls, APK install,
public deployment or scheduler resumption occurred in this task.

## Independent review

Kepler, separate Sol/high context 01a099f1-0533-7842-affb-76cf4c9a8fdd, reviewed
4fcb08ea..19d44622 and returned APPROVED - SOURCE/PREPARATION ONLY. No concrete
defects found. Independently ran 9/9 build tests, JS/CJS syntax checks, normal/USB
Expo config checks and git diff --check. No files modified by reviewer.
This does not approve an APK, certificate compatibility, installation, Pixel 8
startup, API connection, wallet flow or payments. Later status/docs are author
verified; they do not extend the source review to device acceptance.

References: [Expo environment inlining](https://docs.expo.dev/guides/environment-variables/),
[React Native bundled variants](https://reactnative.dev/docs/0.81/react-native-gradle-plugin),
[Android network policy](https://developer.android.com/privacy-and-security/security-config).
