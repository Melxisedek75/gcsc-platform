# Parallel work lanes

Integration candidate: C:\gcsc-platform, branch codex/monorepo-migration.
Weekly coordination source: C:\gcsc-platform\.worktrees\publication, branch
codex/monorepo-publication. Week: 2026-09-22 through 2026-09-28.

| Lane | Worktree | Branch | Ownership | Next task |
| --- | --- | --- | --- | --- |
| Backend / Codex | C:\gcsc-platform\.worktrees\backend | codex/backend-integration @ c808f80a | services/api, packages; no UI | Independently approved source candidate: canonical proof, durable JSON/PG stores, wallet-first challenge/verify and closed security gates. Next: real local PG acceptance and frozen frontend contract handoff; no real signature or broadcast |
| Frontend worker | C:\gcsc-platform\.worktrees\frontend | codex/mobile-wallet-probe-20260914 @ 6e67d6f3 | apps/mobile and wallet consumer docs only; no API/schema | Independently approved mobile source candidate consumes the frozen login contract. Next: build/install exact candidate and physical sign-only acceptance; no payment or broadcast |
| Design worker | C:\gcsc-platform\.worktrees\web-design | codex/web-design-system-20260914 @ 3f90ab28 | apps/web UI and design evidence; no auth/payment/API changes | Jobs/bids responsive states, empty/loading/error/accessibility review using fixtures and existing endpoints |
| QA worker | C:\gcsc-platform\.worktrees\qa | codex/wallet-proof-20260914 @ e58c4931 | tests, scripts, CI and review evidence; no production code | Baseline exact candidates; test replay, expiry, account/network substitution, concurrency and PostgreSQL persistence |
| Publication / coordinator | C:\gcsc-platform\.worktrees\publication | codex/monorepo-publication @ 3aba4508 | docs/migration, docs/product, docs/whitepaper | Maintain the single plan, reconcile evidence and prepare integration order; no public whitepaper replacement |

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
