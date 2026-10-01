# Parallel work lanes

Historical import checkout: C:\gcsc-platform; do not use it for new development.
October MVP coordination source: C:\gcsc-platform\.worktrees\publication,
branch codex/monorepo-publication. Current cycle: 2026-09-28 through 2026-10-20.

| Lane | Worktree | Branch | Ownership | Next task |
| --- | --- | --- | --- | --- |
| Backend / Codex | C:\gcsc-platform\.worktrees\backend | codex/backend-integration @ c46bd1b4, clean | services/api, packages; no UI | Reviewed source01613262 integrated with receiving migrations/profile/chat in local445a54b4, API f24fdd7d. Independent receiving PASS and301/301; parent PG39/39 plus project16/16. Checkout/webhook, realwallet and remaining hardening gates open; do not repeat resolved conflict/source review |
| Frontend worker | C:\gcsc-platform\.worktrees\frontend | codex/mobile-wallet-probe-20260914 @ 3702e457 | apps/mobile plus web wallet-auth consumer; no API/schema or jobs/bids presentation | Independently approved mobile `6e67d6f3` and web `3702e457` source consumers use the frozen login contract. Next: combined browser/API and physical sign-only acceptance; no payment or broadcast |
| Design worker | C:\gcsc-platform\.worktrees\web-design | codex/web-design-system-20260914 @ a587c2ab | apps/web jobs/bids UI and design evidence; no auth/payment/API changes | Independently approved responsive states and latest-request guard. Next: browser/live-API acceptance; no auth/payment changes |
| QA worker | C:\gcsc-platform\.worktrees\qa | codex/wallet-proof-20260914 @ 2e6fc4fa, clean | tests, scripts, CI and review evidence; no production code | Guarded Git-registered receiving source roots and hashes integrated in034f6225; parent guards12/12. Receiving API/UI/PG FuE0Vg five checkpoints PASS, all exits/cleanup0. Agent closed; no active writer/test process. Synthetic grants are not payments |
| Publication / coordinator | C:\gcsc-platform\.worktrees\publication | codex/monorepo-publication @ af6c9409 plus checkpoint docs | Canonical integrated code and docs/migration, docs/product, docs/whitepaper | Independently reviewed dormant held-purchase reconciliation moved only exact signed test facts from quarantine to bound inbox with audit; no grant. Receiving101/101 g5NIGA, focused39/39 and source/test hashes match reviewer. Next active-grant and mismatched/superseded reconciliation policy, remaining lifecycle, then HTTP/test-provider. L11/L12 open, card-only unchanged; no push/deploy/actual payment |
| Lead checkout / parent | C:\gcsc-platform\.worktrees\legacy-preservation | codex/lead-quarantine-reconcile-20261001 @ af6c9409, clean | Completed exact source; no active writer/reviewer/test process | Source1bcd894f and test-only af6c9409 separately APPROVED. Parent98/98 then101/101, reviewer98/98 mE0jkg then101/101 eZUj8X, receiving101/101 g5NIGA, focused39/39/root0. Initial fixture failures retained in LEAD-RECONCILIATION-REVIEW.md. Source locally fast-forwarded; free after ownership check |
| Web chat candidate | C:\gcsc-platform\.worktrees\web-chat | codex/web-chat-integration-20260923 | apps/web chat consumer, focused fixtures and chat evidence | independent review, then canonical API/PostgreSQL browser acceptance |
| October web MVP | C:\gcsc-platform\.worktrees\october-web | codex/october-web-20260928 @ b1cda59b, clean | Completed source candidate; no active writer | Independently reviewed receiving web874153d9 included in local publicationd613c440; runtime byte-identical. Parent role+marketing12/12, paidbrief22/22, actual API/UI/PG five checkpoints, build/lint0. No checkout/release claim; RIVIERA closed |
| October marketing | C:\gcsc-platform\.worktrees\marketing-october | codex/marketing-october-20260928 @ 733e5fda, clean | Completed source candidate; no active writer | RIVIERA receiving marketing PASS tree9d89cb68, exact merge/publicationd613c440; prior High privacy and Medium owner CTA closed for this local tree. Independent parser18/18/static/provenance22/22, parent CTA12/12 and viewport8/8. Video/media, full accessibility/performance, live site and deploy still open |

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
