# Parallel work lanes

Integration candidate: C:\gcsc-platform, branch codex/monorepo-migration.
October MVP coordination source: C:\gcsc-platform\.worktrees\publication,
branch codex/monorepo-publication. Current cycle: 2026-09-28 through 2026-10-20.

| Lane | Worktree | Branch | Ownership | Next task |
| --- | --- | --- | --- | --- |
| Backend / Codex | C:\gcsc-platform\.worktrees\backend | codex/backend-integration @ eb760ed0 + dirty October candidate | services/api, packages; no UI | Source SHA6E7396BE adds a guarded paid-brief read: Jest285/285, focused31/31, independent narrow source/JSON PASS. Fresh PG18.4 publication/details/concurrency14/14, stopped0. Prior dirty work retained; whole-candidate review, checkout/webhook, UI consumer and integration remain open; PAID-PROJECT-DETAILS-REVIEW.md |
| Frontend worker | C:\gcsc-platform\.worktrees\frontend | codex/mobile-wallet-probe-20260914 @ 3702e457 | apps/mobile plus web wallet-auth consumer; no API/schema or jobs/bids presentation | Independently approved mobile `6e67d6f3` and web `3702e457` source consumers use the frozen login contract. Next: combined browser/API and physical sign-only acceptance; no payment or broadcast |
| Design worker | C:\gcsc-platform\.worktrees\web-design | codex/web-design-system-20260914 @ a587c2ab | apps/web jobs/bids UI and design evidence; no auth/payment/API changes | Independently approved responsive states and latest-request guard. Next: browser/live-API acceptance; no auth/payment changes |
| QA worker | C:\gcsc-platform\.worktrees\qa | codex/wallet-proof-20260914 @ 011f30c9 | tests, scripts, CI and review evidence; no production code | New 14/14 PG result belongs to source6E7396BE: paid brief, privacy and owner/publication/receipt/bid races PASS; guards5/5, syntax/diff PASS, both clusters stopped. Old ENOSPC condition resolved by measured disk change; next consumer/API acceptance, no real payment claim |
| Publication / coordinator | C:\gcsc-platform\.worktrees\publication | codex/monorepo-publication @ 65216b72 + checkpoint update | docs/migration, docs/product, docs/whitepaper | Maintain the single plan, reconcile evidence and prepare integration order; no public whitepaper replacement |
| Web chat candidate | C:\gcsc-platform\.worktrees\web-chat | codex/web-chat-integration-20260923 | apps/web chat consumer, focused fixtures and chat evidence | independent review, then canonical API/PostgreSQL browser acceptance |
| October web MVP | C:\gcsc-platform\.worktrees\october-web | codex/october-web-20260928 @ 74e5618d | apps/web project request/list/detail, account-role hint and focused client contract tests; no API, mobile, wallet auth or payment provider | RIVIERA source repair APPROVED: two Medium identity findings closed; independent13/13 probes, TypeScript/auth/diff PASS. Parent exact-SHA synthetic-API browser10/10 and focused lint PASS; see ACCOUNT-ROLE-REVIEW.md. Still separate from publication; reviewed API, paid access and combined acceptance remain open |
| October marketing | C:\gcsc-platform\.worktrees\marketing-october | codex/marketing-october-20260928 @ 733e5fda | apps/marketing site, original assets, claim ledger, video materials, offline parser and browser regressions; no app API or live site | RIVIERA independently closed contrast and validator gaps including robots follow-up, parser18/18 and static/diff PASS; parent Edge8 viewport/text cases PASS on unchanged028b0ff8 UI. Overall gate CHANGES_REQUIRED: target project disclosure and owner-role mismatch remain. No combined acceptance, whole-site accessibility approval, rights-cleared video or deploy; see RIVIERA-MARKETING-REVIEW.md |

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
