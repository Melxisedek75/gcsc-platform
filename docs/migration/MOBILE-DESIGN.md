# SmartContractor Android Design

Owner request: 2026-09-13. This specification extends CHECKLIST.md; it is not a
replacement product or a second development backlog. Work stays in apps/mobile.

## Decision

Keep Expo 54 / React Native 0.81.5 and the current API contracts. Use Material 3
principles, React Native Paper 5.15.3 (MIT), and the already installed Expo icon
family, now declared directly. Do not migrate to Kotlin or import a complete
third-party application. No paid UI kit, new account, telemetry or design service
is required. npm installed six packages with lifecycle scripts disabled.

Sources checked on 2026-09-13:

| Source | Application to this project | Boundary |
| --- | --- | --- |
| [Google Material 3](https://developer.android.com/develop/ui/compose/designsystems/material3) | Semantic colors, hierarchy, familiar controls | Principles, not copying Compose code into React Native |
| [android/nowinandroid](https://github.com/android/nowinandroid) | Adaptive navigation, light/dark design references, screenshot-testing discipline | Apache-2.0 reference app; not a replacement backend/client |
| [callstack/react-native-paper](https://github.com/callstack/react-native-paper) | Maintained Material UI components and theming; pinned version 5.15.3 | MIT; compatibility still requires this project's checks |
| [Expo JavaScript tabs](https://docs.expo.dev/router/advanced/tabs/) | Icons, explicit role destinations, hidden detail routes | Existing Router v6 and Bottom Tabs v7 retained |
| [Android accessibility](https://support.google.com/accessibility/android/answer/7101858) | Minimum 48dp interaction targets | Must also test on the physical device with TalkBack |
| [NN/g usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Clear status, consistent language, recoverable errors, prevention of mistakes | Evaluation framework, not certification of this app |

GitHub stars and design awards do not establish usability, security or fitness
for construction work. NN/g provides expert review/user research; Google provides
platform guidance. No external company has assessed or certified SmartContractor.

## Visual Direction

- Light neutral working surfaces, charcoal text, restrained construction-orange
  actions, blue homeowner context and green positive status. Avoid decorative
  gradients and oversized marketing headings inside working screens.
- System typography, normal letter spacing, readable labels and actual font
  scaling. Amounts, account names and errors must not be clipped.
- Five primary role destinations, familiar icons, short visible labels and full
  accessibility labels. Detail and chat-thread routes remain reachable but do
  not create extra tabs. Existing role/permission logic is unchanged.
- 48dp minimum touch areas, 56dp primary buttons, keyboard-aware forms, visible
  focus, loading feedback, and password visibility control.
- Do not turn every section into a floating card or hide missing functionality
  behind polished placeholder controls. Repeated jobs/bids may use compact cards.

## Ordered Scope

UI-1 (current): shared theme/controls, navigation, auth-group layout, removal of
fictional displayed profile reviews, scoped regression tests and a visual preview.

UI-2: contractor jobs and bid comparison, homeowner posting/details. Preserve
filter/save/submit routes. Unify displayed project identity with the actual API
before calling cross-role workflows complete.

UI-3: milestone evidence, review/dispute states, chat delivery, profile and wallet
status. A local draft must not look delivered, and wallet linkage must not look
like verified identity. No fixed mock milestone plan presented as real escrow.

UI-4: backend-ready auth, wallet/lead flow and offline/retry/cancel states. Display
network, amount, recipient and outcome distinctly. Never auto-retry signing or
payment. Wallet-first remains gated by P2.2, not enabled by this redesign.

UI-5: reviewed APK, physical Pixel 8/TalkBack, 200% text, narrow/landscape/tablet,
keyboard, light/dark coverage, performance, no clipping and complete role journeys.
Browser visual evidence does not close native/device acceptance.

## Known UX Risks From Independent Read-Only Audit

Pasteur inspected the existing product screens without edits or live calls:
- Contractor profile previously imported MOCK_REVIEWS: every user got the same
  rating. The display is removed, not replaced with a fabricated score. The unused
  legacy examples remain in lib/reviews.ts for history; a guard checks all app and
  component sources to prevent runtime imports of the examples.
- Homeowner local jobs and contractor API projects diverge. P2/P3 integration
  must make both roles see the same real project and actual milestone state.
- Proof submission lacks file/evidence capture; storage-backed review is open.
- Chat messages are local; delivery and shared history are not demonstrated.
- Android keyboard/touch targets and single-line profile values need correction.

All existing role workflows remain requirements. A visual improvement must not
be reported as working authorization, synced chat, verified reputation, lending,
escrow or lead purchase. The installed 0.1.3/code5 APK is the earlier startup
candidate, not this new design until a different artifact is built and verified.

## Acceptance Evidence

- [x] Scope and selected dependencies verified in source/lockfile. Six installed
  packages, no unrelated package upgrades; Paper and dependencies are MIT.
- [x] Color contrast, explicit route coverage, icon names and mock-review guards:
  npm run test:mobile-design, 10/10, exit 0. Initial 7/7 tests failed before the
  foundation existed; three later regression cases failed before corrections.
- [x] npm run check, 46/46 plus static checks, exit 0; npm run check:mobile-types,
  exit 0; git diff --check, exit 0. Mobile tests have a dedicated CI job with the
  required root/mobile installs, so root-only checks remain portable. CI itself
  has not been run for this candidate.
- [x] Actual Expo/React Native web UI at 320x740, 390x844 and 768x1024: input focus,
  local required-field error, password show/hide, registration navigation, five
  tabs per role, navigation to profiles, full email wrapping and measured targets.
  Password icon 48x48, primary controls at least 56 high, tabs 64x59 at width320.
  Playwright exit 0, no uncaught/console errors and no external-service requests.
  Screenshots inspected, icons render. This is synthetic browser UI evidence,
  not authenticated backend behavior or a native screenshot.
- [ ] Independent code review of the exact initial design candidate.
- [ ] Native APK and physical device acceptance for the design candidate.
- [ ] Native keyboard, TalkBack, 200% text, dark mode and remaining screen-specific
  controls. The existing nonfunctional Forgot password text remains a UI-4 issue;
  its appearance is not proof of password recovery support.

## Reproduction And Evidence

Local preview: http://localhost:8093/sign-in. Metro is bound locally with one
worker, explicit loopback API origin, dotenv/telemetry disabled. No API is started.
The agent-browser CLI was unavailable; the existing bundled Playwright and local
Edge performed verification without installing another automation package.

Run scripts/verify-mobile-design.mjs against this preview. Set PLAYWRIGHT_MODULE
to an installed Playwright module path when it is not available in root dependencies;
PLAYWRIGHT_CHANNEL defaults to msedge, MOBILE_PREVIEW_URL must be loopback.
The script intercepts only fixture API responses and blocks external requests.
It does not sign in to a real account, submit bids, open a wallet or send payments.

Local generated evidence: .tmp/mobile-design-verification/result.json and nine
PNG screenshots. Tests and the verifier are tracked; generated previews are not
published as product data. The previous installed APK remains unchanged.
