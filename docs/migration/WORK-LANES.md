# Parallel work lanes

Integration candidate: C:\gcsc-platform, branch codex/monorepo-migration.
October MVP coordination source: C:\gcsc-platform\.worktrees\publication,
branch codex/monorepo-publication. Current cycle: 2026-09-28 through 2026-10-20.

| Lane | Worktree | Branch | Ownership | Next task |
| --- | --- | --- | --- | --- |
| Backend / Codex | C:\gcsc-platform\.worktrees\backend | codex/backend-integration @ eb760ed0 + dirty October candidate | services/api, packages; no UI | Source SHA CD30864A: owner-locked publish and guarded old receipt reconciliation; 254/254 Jest, fake-PG smoke, syntax/diff PASS. New PostgreSQL concurrency tests are written but initdb failed for lack of C: space; prior 10/10 PG applies only to old SHA 78331e52. Independent re-review, checkout and paid details remain open |
| Frontend worker | C:\gcsc-platform\.worktrees\frontend | codex/mobile-wallet-probe-20260914 @ 3702e457 | apps/mobile plus web wallet-auth consumer; no API/schema or jobs/bids presentation | Independently approved mobile `6e67d6f3` and web `3702e457` source consumers use the frozen login contract. Next: combined browser/API and physical sign-only acceptance; no payment or broadcast |
| Design worker | C:\gcsc-platform\.worktrees\web-design | codex/web-design-system-20260914 @ a587c2ab | apps/web jobs/bids UI and design evidence; no auth/payment/API changes | Independently approved responsive states and latest-request guard. Next: browser/live-API acceptance; no auth/payment changes |
| QA worker | C:\gcsc-platform\.worktrees\qa | codex/wallet-proof-20260914 @ e1996c35 + dirty follow-up tests | tests, scripts, CI and review evidence; no production code | Old 10/10 PG result belongs to SHA 78331e52. New owner-disable publish/receipt race tests await disk space; no PostgreSQL PASS for CD30864A |
| Publication / coordinator | C:\gcsc-platform\.worktrees\publication | codex/monorepo-publication @ 65216b72 + checkpoint update | docs/migration, docs/product, docs/whitepaper | Maintain the single plan, reconcile evidence and prepare integration order; no public whitepaper replacement |
| Web chat candidate | C:\gcsc-platform\.worktrees\web-chat | codex/web-chat-integration-20260923 | apps/web chat consumer, focused fixtures and chat evidence | independent review, then canonical API/PostgreSQL browser acceptance |
| October web MVP | C:\gcsc-platform\.worktrees\october-web | codex/october-web-20260928 @ 8310c5ec | apps/web project request/list/detail and focused client contract tests; no API, mobile, wallet auth or payment provider | Connect owner draft/publish and safe contractor preview to reviewed API; project-specific paid access remains open; legacy escrow UI is disabled by default |
| October marketing | C:\gcsc-platform\.worktrees\marketing-october | codex/marketing-october-20260928 @ 5e6ce055 | apps/marketing site, original assets, claim ledger, video brief, shot list, scripts and three direction studies; no app API or live site | Historical v1.3 link labeled draft and noindexed. Founder selection, rendered prototypes, visual/SEO/legal acceptance, rights-cleared video and truthful CTA remain; no deploy |

These are repository ownership lanes, not a promise of three always-running paid
models. Codex CLI is another interface to an agent, not an additional model.
The integration controller dispatches bounded work and records actual worker IDs.
No write-capable workers share a checkout. Shared API changes are proposed before
consumers change. A reviewer cannot approve its own change.

## Coordination contract for this week

1. Backend owns the wallet/API contract until it publishes a versioned request,
   response and error-state fixture. Frontend and design workers must not invent
   missing fields or edit `services/api`.
2. Frontend owns native wallet adapters and mobile screens. The design worker
   must not touch mobile wallet/auth/payment files.
3. Design owns web presentation only. It may use fixtures but may not label a
   mock payment, wallet or Priority Access flow as integrated.
4. QA may add tests and reports but does not repair the code it reviews. Runtime
   findings return to the owning lane.
5. Publication is the only lane editing the weekly checklist, capability matrix,
   Priority Access specification and internal whitepaper during this cycle.
6. Candidate integration is sequential: backend contract, QA acceptance, client
   consumers, user-journey acceptance, then independent review. No lane merges
   itself and no work is merged directly to `main` this week without the gate.

The untracked `.tmp-*.log` files currently in the QA worktree are preserved and
excluded from commits until their ownership and value are checked.

Unreviewed prototype refs: archive/candidates/backend-wallet and
archive/candidates/mobile-wallet. They are preserved for comparison only. Do not
merge or enable them based solely on prior passing mock tests.

Before each next task: check git status, read CHECKLIST.md, pick one unblocked item,
write tests, implement narrowly, run commands, update evidence. No blanket staging
of another lane. Never auto-merge to bypass an unavailable reviewer.

Deployment, GitHub archival/private visibility, secrets, real finance and phone
signatures are outside the local continuation scope. Stop before those boundaries.
