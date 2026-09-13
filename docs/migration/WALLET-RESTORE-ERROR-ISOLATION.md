# Web wallet restore error isolation

Date: 2026-09-12. Base: 6151d36b73fd252c433484082adbaf160c971ed4.
Scope: local frontend candidate; no integration or deployment.

## Cause and change

Wallet.tsx wrapped profile loading, SDK restoration and wallet persistence in one
catch that cleared the application's JWT for every failure. A wallet failure
after a successful profile response therefore signed the user out unnecessarily.
Anonymous restoration also had an unhandled rejection path.

The API client now exposes HTTP status on an Error subclass. Only profile HTTP401
clears the token, and only if both the client token and stored token still match
the actual client token captured synchronously before starting the request.
Wallet failures preserve the app session/profile and show a retry message. Failed
profile loading never proceeds to wallet persistence. Anonymous restoration is
caught. No ownership/signature checks or backend endpoints changed.

## Evidence

- Initial inherited test harness failed with SyntaxError, not a product assertion.
- Replaced string slicing with TypeScript AST extraction of the actual loader.
- Before fix: 7 behavioral failures, 2 passes (success/unmounted).
- Reviewer found a client/storage token mismatch race. Both added race tests
  failed before the correction and passed after it.
- Final fix: wallet restore 11/11 PASS; API configuration/client 15/15 PASS.
- npm run check: PASS, migration 7/7, mobile-build guards 4/4, wallet restore 11/11,
  API syntax and web static checks.
- First revision npm run build:web: exit 0; TypeScript and Vite 2977 modules, Vite 3m59s.
- Final revision after review fix: npm run build:web exit 0, TypeScript and Vite
  2977 modules, Vite 1m31s.
  Warnings: old Browserslist database and chunks above 500 kB; not suppressed.
- git diff --check: PASS before this evidence document.

Tests replace storage, SDK and API IO. They do not render React, use a real wallet,
prove signed ownership, test a phone or validate a deployed backend. Production
build is a local artifact, not a production release. Missing wallet-first protocol
and integration routes remain separate open work.

Independent review: Sol/high in separate context Ptolemy
(01a09907-60be-7b71-a39e-6359168f874b). Initial verdict NOT_APPROVED due token race;
after correction APPROVED for the six-file code/test/manifest snapshot relative to
the base above. Reviewer independently ran restore 11/11, API config 15/15 and
diff checks, verified manifest hashes. This documentation and broader unmerged
migration/auth candidates are NOT independently approved by this verdict.
