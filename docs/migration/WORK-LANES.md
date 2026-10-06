# Parallel work lanes

Historical import checkout: C:\gcsc-platform; do not use it for new development.
October MVP coordination source: C:\gcsc-platform\.worktrees\publication,
branch codex/monorepo-publication. Current continuation: through 2026-10-31;
the 2026-10-20 launch checkpoint remains a gate, not release authority.

| Lane | Worktree | Branch | Ownership | Next task |
| --- | --- | --- | --- | --- |
| Backend / Codex | C:\gcsc-platform\.worktrees\backend | codex/public-contractor-cache-20261002 @ 0dde0a06, dirty L05a candidate only | services/api, packages; no UI | L06 private-draft PUT 7c5e4c54 plus stale-token b815388e and JSON-version backfill 0dde0a06: API334/334 and preliminary read-only review without P1-P3. QA opt-in real PG 5/5 DxzCCj passed against exact working-tree snapshot. L05a header/MIME/early-limit candidate: focused18/18, independent focused review no P1-P3; full API Jest340/340 now PASS with dummy test JWT_SECRET. Root pinned hash remains unverified; not integrated or review-ready. L07 remains open |
| Frontend worker | C:\gcsc-platform\.worktrees\frontend | codex/mobile-wallet-probe-20260914 @ 3702e457 | apps/mobile plus web wallet-auth consumer; no API/schema or jobs/bids presentation | Independently approved mobile `6e67d6f3` and web `3702e457` source consumers use the frozen login contract. Next: combined browser/API and physical sign-only acceptance; no payment or broadcast |
| Design worker | C:\gcsc-platform\.worktrees\web-design | codex/web-design-system-20260914 @ b3e46353, clean | apps/web presentation and jobs/bids UI; no auth/payment/API changes | About 18697c88 and footer a8846662 followed by prototype-truth Home/index 216179bf, Contact email-handoff b7ff47ab, footer links e3b8ae4c, pricing-status 73f4365a, Security roadmap b3e46353. Each latest diff independently Codex-reviewed after fixes; build/scoped ESLint/local Edge Home 360/390/1440, Contact/Pricing/Security390 PASS. No actual email delivery; contact address, About/other pages, privacy/terms and L20/L21 acceptance open. Candidates not integrated/published; formal gate remains |
| QA worker | C:\gcsc-platform\.worktrees\qa | codex/public-contractor-role-transition-pg-20261002 @ b38e3610, clean | tests, scripts, CI and review evidence; no production code | L06 synthetic Edge desktop/mobile draft edit 14/14 twice WgpclX/5kAOjr including manual PUT-500 retry; independent earlier test-only reviews APPROVED. Real local JSON-mode API + Edge 1/1 gyoIgQ. Opt-in real PG draft-edit 5/5 hS4pA0 including audit rollback; runner12/12 and root check PASS. Real Edge/API/PG owner edit plus 409 compare/explicit keep-edits retry 1/1 twice i7ZUL3/4wHu66 and root check PASS; informal reviewer closed test-gap P2, formal gate pending. Prior API-instance restart PG41/41. No full L06 acceptance |
| Publication / coordinator | C:\gcsc-platform\.worktrees\publication | codex/monorepo-publication @ dc5f69f8 | Canonical integrated code and docs/migration, docs/product, docs/whitepaper | L06 local API/UI/QA received; PG process restart 5/5 with changed PID, browser real-main Edge/API/PG1/1 twice accepted/rejected discard, Back, delayed PUT and 409 retry. L07 test-only free-text category privacy: isolated PG34/34 and contractor Edge/API/PG1/1, each independently rerun and approved; full L07 still open. Formal CODEX/CLAUDE gate and live-risk acceptance remain; About fix separate design candidate. No push/deploy/actual payment |
| Lead checkout / parent | C:\gcsc-platform\.worktrees\legacy-preservation | codex/lead-late-negative-hold-20261001 @ 3ade39b1, clean | Frozen reviewed source; no active writer/reviewer/test process | Exact candidate APPROVED for dormant slice; post-recovery candidate PG103/103 tZ5LxD and receiving PG103/103 yNSdih with matching source/test hashes. Reviewer PG initdb failure remains not PASS. Source locally integrated, no live/provider activation |
| Web chat candidate | C:\gcsc-platform\.worktrees\web-chat | codex/web-chat-integration-20260923 | apps/web chat consumer, focused fixtures and chat evidence | independent review, then canonical API/PostgreSQL browser acceptance |
| October web MVP | C:\gcsc-platform\.worktrees\october-web | codex/october-web-20260928 @ 65312daa, clean | apps/web October owner/contractor flow; no active separate writer | L06 source 65312daa was received in publication as 7103e902 with reviewed navigation follow-up 979130af. This lane remains clean; further UI edits belong in coordinated follow-up. Local Edge/API/PG receiving passed twice, but full L06 and release remain open |
| October marketing | C:\gcsc-platform\.worktrees\marketing-october | codex/marketing-concept-disclosure-20261001 @ 1c0c6127, clean | Isolated marketing source and test-only accessibility candidate; no active writer | Visible AI-generated hero-image disclosure locally received earlier. New keyboard validator candidate: Edge154 eight cases failures[]/errors[] locally and independently, actual Tab/Enter mobile navigation. No site/CSS change or candidate integration; rights, video and live deploy open. Claude OAuth401 attempt is not PASS |

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
