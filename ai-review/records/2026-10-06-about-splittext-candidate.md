# AI Review Record

- Change ID: 2026-10-06-about-splittext-candidate
- Source: web-design worktree commit `18697c88`
- Scope: `apps/web/src/pages/About.tsx`, one import
- Author AI: CODEX (publication coordinator in design lane)
- Reviewer AI: separate CODEX context `01a1101b-09dd-7df3-8d7c-4414e586e62f`
- Reviewer decision: APPROVED for candidate diff; no P1-P3
- Integration/deploy decision: BLOCKED pending project gate and owner approval

## Evidence

The real browser journey `mQocKp` reached `#/about` and exposed
`ReferenceError: SplitText is not defined`. The design lane source registered
and instantiated `SplitText` without importing the already installed GSAP
plugin. Commit `18697c88` adds `import { SplitText } from 'gsap/SplitText'`.

- `npm --prefix apps/web run build`: PASS.
- Scoped ESLint on `About.tsx`: PASS.
- Local Vite + Edge desktop 1280x900 and mobile 390x844: About heading
  `Building Trust in Construction` visible, `pageerror=[]`; mobile
  `scrollWidth=innerWidth=390`.
- Screenshots: design worktree `apps/web/.tmp/about-import-browser.png` and
  `apps/web/.tmp/about-import-mobile.png` (local, uncommitted artifacts).
- Reviewer checked GSAP export, scoped ESLint and `git diff --check`; did not
  rerun browser or build. No content/claims, production site or live data changed.

This is a candidate in its own lane, not a full presentation-site acceptance
or CODEX/CLAUDE integration gate. The local preview is not deployment.
