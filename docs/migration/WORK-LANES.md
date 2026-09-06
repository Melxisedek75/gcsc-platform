# Parallel work lanes

Integration candidate: C:\gcsc-platform, branch codex/monorepo-migration.

| Lane | Worktree | Branch | Ownership | Next task |
| --- | --- | --- | --- | --- |
| Backend / Codex | C:\gcsc-platform\.worktrees\backend | codex/backend-integration | services/api, packages | verified wallet binding/protocol audit; no real signatures |
| Frontend worker | C:\gcsc-platform\.worktrees\frontend | codex/frontend-integration | apps/web, apps/marketing, apps/mobile | build baseline, API config/consumer inventory |
| QA / CLI worker | C:\gcsc-platform\.worktrees\qa | codex/qa-integration | tests, scripts, CI, review records | independent source import/entrypoint review and web/native acceptance |

These are repository ownership lanes, not a promise of three always-running paid
models. Codex CLI is another interface to an agent, not an additional model.
The integration controller dispatches bounded work and records actual worker IDs.
No write-capable workers share a checkout. Shared API changes are proposed before
consumers change. A reviewer cannot approve its own change.

Unreviewed prototype refs: archive/candidates/backend-wallet and
archive/candidates/mobile-wallet. They are preserved for comparison only. Do not
merge or enable them based solely on prior passing mock tests.

Before each next task: check git status, read CHECKLIST.md, pick one unblocked item,
write tests, implement narrowly, run commands, update evidence. No blanket staging
of another lane. Never auto-merge to bypass an unavailable reviewer.

Deployment, GitHub archival/private visibility, secrets, real finance and phone
signatures are outside the local continuation scope. Stop before those boundaries.
