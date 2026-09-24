# Mobile Design Foundation Review

Date: 2026-09-13. Scope: UI-1 in MOBILE-DESIGN.md, not a full release acceptance.

- Author: parent Codex execution, not the reviewer.
- Reviewer: Popper, separate Sol/high context, agent01a09d5d-0233-7ba2-9581-d1b10d06178b.
- Base: 7acb7662693f17793b0c4b959e97568d80c10f3e.
- Reviewed source: 29ba58e1746e86d4360884d85bef2e0b56041739.
- Final independent verdict: APPROVED; no remaining actionable findings in scope.
- No code integration, deployment, new APK installation or live account action.

## Findings Resolved

1. Root-only CI could not resolve mobile icon dependencies. Restored portable root
   check; added mobile-ui CI job with root and mobile lockfile installation followed
   by mobile tests and TypeScript. No tests skipped or weakened.
2. Pale custom status colors had insufficient text contrast on the light theme.
   Soft badges now use dark semantic text; tests render the real Badge element and
   check foreground/background contrast for token and source custom colors.
3. Paper's default password icon was40x40. The component now reserves48x48;
   browser measurement confirms this at320,390,768px.
4. Only contractor profile wrapped values. Both role profiles now wrap selectable
   account values; source guards and browser checks cover both roles.

The unused lib/reviews.ts examples remain preserved historical source, not a
runtime reputation source. The agreed scope is removing fictional displayed
reviews. A guard checks all app/component sources for legacy review imports;
the reviewer accepted this resolution rather than deleting unrelated history.

## Independent Verification

- npm run check:46/46 plus static PASS, exit0.
- npm run test:mobile-design:10/10 PASS, exit0.
- npm run check:mobile-types:exit0.
- git diff --check 7acb7662693f17793b0c4b959e97568d80c10f3e HEAD:exit0.

Parent additionally ran scripts/verify-mobile-design.mjs against actual Expo web
rendering with synthetic browser-local fixtures: nine screenshots, no page/console
errors, no external-service requests. Reviewer inspected code but did not repeat
browser work. Docs/checkpoint edits after29ba58e1 are not source reviewed.

Remote CI, new native APK, physical-device design/keyboard/TalkBack/large-font
coverage, real authentication, wallet signatures and payments are NOT covered
by this approval. The installed Pixel8 APK remains the startup candidate2094b69c.
