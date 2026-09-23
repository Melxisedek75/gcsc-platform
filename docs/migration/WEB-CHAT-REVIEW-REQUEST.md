# Independent review request: web participant chat

Status: READY_FOR_REVIEW, not approved and not integrated.

- Base: `6666e8e7`
- Exact candidate: `18a3e4e4`
- Branch: `codex/web-chat-integration-20260923`
- Worktree: `C:\gcsc-platform\.worktrees\web-chat`
- Author: Codex; the author MUST NOT approve this candidate.

## Review scope

Review `6666e8e7..18a3e4e4`, especially:

- the four typed routes in `apps/web/src/services/api.ts`;
- bid-only entry from ProjectsPanel/BidsPanel and participant-only navigation;
- stale response and account/session isolation in ChatPanel;
- ordered plain-text rendering, bounded cursors and visible-thread polling;
- retry semantics: an uncertain send must retain the same text and UUID;
- read-only, forbidden and revoked-access behavior;
- fixture validity and evidence wording in `CHAT-ACCEPTANCE.md`.

Reject for arbitrary-recipient input, optimistic duplicate delivery, token leakage,
history crossing accounts/conversations, unbounded reads/polling, unsafe HTML, or a
claim that mock HTTP equals canonical API/PostgreSQL acceptance.

## Author verification

All commands were run from the worktree above and passed:

```powershell
node --test tests/api-config.test.mjs
node C:\gcsc-platform\apps\web\node_modules\typescript\bin\tsc --project apps/web/tsconfig.app.json --noEmit --incremental false --pretty false
Set-Location apps/web
& .\node_modules\.bin\eslint.cmd src/pages/Dashboard.tsx src/pages/dashboard/ChatPanel.tsx src/pages/dashboard/BidsPanel.tsx src/pages/dashboard/ProjectsPanel.tsx src/services/api.ts --quiet
Set-Location ..\..
node scripts/check-chat-ui.mjs --playwright-dir C:\Users\rivne\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules
npm run check:web
git diff --check 6666e8e7..18a3e4e4
```

Observed evidence: API config/client **16/16**; TypeScript and scoped ESLint PASS;
Vite production build **2979 modules**; static web checks PASS; Edge headless at
1280x900 and 390x844 PASS with two participant contexts, pagination, conversation
isolation, read-only/forbidden states, uncertain send retry using one UUID, and no
page errors or horizontal overflow.

## Explicitly open

- Independent reviewer verdict for this exact head.
- Two-user browser journey against the canonical API and disposable local PostgreSQL.
- Integration into the controller branch after both gates pass.
- Native/mobile chat is not part of this candidate.
