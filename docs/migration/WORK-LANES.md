# Parallel work lanes

Historical import checkout: C:\gcsc-platform; do not use it for new development.
October MVP coordination source: C:\gcsc-platform\.worktrees\publication,
branch codex/monorepo-publication. Current continuation: through 2026-10-31;
the 2026-10-20 launch checkpoint remains a gate, not release authority.

| Lane | Worktree | Branch | Ownership | Next task |
| --- | --- | --- | --- | --- |
| Backend / Codex | C:\gcsc-platform\.worktrees\backend | codex/public-contractor-cache-20261002 @ a1ff006f, clean | services/api, packages; no UI | L06 private-draft PUT 7c5e4c54 plus stale-token b815388e and JSON-version backfill 0dde0a06: API334/334 and preliminary read-only review without P1-P3. QA opt-in real PG 5/5 DxzCCj passed against earlier working-tree snapshot. L05a header/MIME/early-limit candidate is isolated as a1ff006f: focused18/18, full API354/354, exact-commit PG document1/1 postgres-baseline-sdmq62 and project-publication33/33 postgres-baseline-Ydttzf; independent focused review before final commit no P1-P3, formal gate pending. Commit 1bcd16b0 isolates legacy OTP HTTP 410 change; exact committed source PG18.4 targeted OTP1/1 and project-publication33/33 PASS, same suite RED against current publication. Follow-up 30288eae blocks escrow reads for disabled/demoted participants; exact commit PG18.4 stale-role1/1 b2FMhw and project-publication33/33 1bYN1M PASS, current publication RED. Follow-up feb2bf95 checks current roles on seven milestone mutations; local RED9/10 then GREEN12/12, escrow66/66 and combined API354/354 PASS. Exact commit PG18.4 all stale-role mutation checks 1/1 ArwKZJ and project-publication33/33 4To6rj PASS; concurrent revocation, independent review and formal gate pending. No candidates integrated or review-ready. L07 remains open |
| Frontend worker | C:\gcsc-platform\.worktrees\frontend | codex/mobile-wallet-probe-20260914 @ 494e7e2e, untracked docs/security preserved | apps/mobile plus web wallet-auth consumer; no API/schema or jobs/bids presentation | Independently approved mobile `6e67d6f3` and web `3702e457` source consumers use the frozen login contract. Local candidates a207c14a/494e7e2e remove unsigned Dashboard/public-Wallet profile-link requests, distinguish saved metadata from a local WebAuth session, and correct registration banner OTP wording. Scoped lint/build/dashboard-live PASS and informal focused re-review closed auth P2/P3; real wallet/signature not exercised. Public Wallet still has stale marketing claims, while separate design Wallet candidate retains old auth call. Reconcile exact candidates before formal review/integration; no payment or broadcast |
| Design worker | C:\gcsc-platform\.worktrees\web-design | codex/web-design-system-20260914 @ 55d4855c, clean | apps/web presentation and jobs/bids UI; no auth/payment/API changes | Prototype-truth candidates Home/index 216179bf, Contact b7ff47ab, footers e3b8ae4c, Pricing 73f4365a, Security b3e46353, About abf25ffd, Wallet ec4c4a9e, Token 684d3484, banner alt fd4c7326, dashboard bid copy d43a9175, AccountAccess 98c3ca57 and MilestoneManager 55d4855c. Milestone copy distinguishes prototype DB status from real testnet signatures; scoped lint/build/dashboard-live/legal-claims PASS, independent review unavailable due thread limit. Frontend branch independently disables unsigned wallet profile-link calls, but design Wallet page still has old auth code; reconcile before integration and re-review combined diff. Design AccountAccess browser role fixture has pre-existing 5/10 failure. WebAuth signed challenge remains absent. Financing, contact address, verified founder/team/results, privacy/terms and L20/L21 acceptance open. Candidates not integrated/published; formal gate remains |
| QA worker | C:\gcsc-platform\.worktrees\qa | codex/public-contractor-role-transition-pg-20261002 @ e3336300, clean | tests, scripts, CI and review evidence; no production code | L06 synthetic Edge desktop/mobile draft edit 14/14 twice WgpclX/5kAOjr including manual PUT-500 retry; independent earlier test-only reviews APPROVED. Real local JSON-mode API + Edge 1/1 gyoIgQ. Opt-in real PG draft-edit 5/5 hS4pA0 including audit rollback; runner12/12 and root check PASS. Real Edge/API/PG owner edit plus 409 compare/explicit keep-edits retry 1/1 twice i7ZUL3/4wHu66 and root check PASS; informal reviewer closed test-gap P2, formal gate pending. Test-only legacy OTP PG suite 4cb4f1e8: backend candidate PG1/1 PASS, current publication RED as expected. Test-only stale-role escrow suite a9e4e783, 40284a8c and 12a2f526: exact backend feb2bf95 all mutation denials plus reads PG1/1 ArwKZJ, project-publication33/33 4To6rj PASS; prior current-publication read RED. Test-only L05a document upload suite a88b0003: combined backend PG1/1 3nZbTz PASS, current publication RED at declared-MIME mismatch Jvcowp; runner15/15 and root check PASS. QA 8d09e95f repairs fake-PG storage smoke PDF fixture and startup migration; smoke PASS against exact clean backend a1ff006f, independent QA diff review no P1-P3. Test-only browser document replacement 5eff7540..27c0a44c: final Edge 1280/390 PASS twice, distinct replacement bytes/download and oversized no-POST, independent read-only P2/P3 gaps closed; mock HTTP only. PG resubmission test 460fb3c8..2b71453d: exact backend a1ff006f, final isolated PG1/1 twice tH3F0P/MWPlGG, independent read-only P2/P3 gaps closed. Combined document Edge/API/PG test-only bcbdba3c: final 1/1 fr51XW, runner16/16, root check PASS; follow-up 1544c673 adds real admin Reject/download in separate Edge context, final PG1/1 KGDB1z, admin list no file bytes; exact final diff not re-reviewed. QA cdb91234 adds browser invalid-byte/MIME denials with visible errors and unchanged PG row; final 1/1 Lfmvwc PASS, no separate review. L07 stale admin-list after demotion RED yhRmWf; delayed 200 race RED aN0Xkx; exact October-web c0156070 Edge/API/PG1/1 tVWFFa PASS, reviewer no remaining P1-P3 but not formal gate. Prior API-instance restart PG41/41. No full L06/L05a acceptance |
| Publication / coordinator | C:\gcsc-platform\.worktrees\publication | codex/monorepo-publication @ dc5f69f8 | Canonical integrated code and docs/migration, docs/product, docs/whitepaper | L06 local API/UI/QA received; PG process restart 5/5 with changed PID, browser real-main Edge/API/PG1/1 twice accepted/rejected discard, Back, delayed PUT and 409 retry. L07 test-only free-text category privacy: isolated PG34/34 and contractor Edge/API/PG1/1, each independently rerun and approved; full L07 still open. Formal CODEX/CLAUDE gate and live-risk acceptance remain; About fix separate design candidate. No push/deploy/actual payment |
| Lead checkout / parent | C:\gcsc-platform\.worktrees\legacy-preservation | codex/lead-late-negative-hold-20261001 @ 3ade39b1, clean | Frozen reviewed source; no active writer/reviewer/test process | Exact candidate APPROVED for dormant slice; post-recovery candidate PG103/103 tZ5LxD and receiving PG103/103 yNSdih with matching source/test hashes. Reviewer PG initdb failure remains not PASS. Source locally integrated, no live/provider activation |
| Web chat candidate | C:\gcsc-platform\.worktrees\web-chat | codex/web-chat-integration-20260923 | apps/web chat consumer, focused fixtures and chat evidence | independent review, then canonical API/PostgreSQL browser acceptance |
| October web MVP | C:\gcsc-platform\.worktrees\october-web | codex/october-web-20260928 @ c0156070, clean | apps/web October owner/contractor flow; no active separate writer | L06 source 65312daa was received in publication as 7103e902 with reviewed navigation follow-up 979130af. This lane remains clean; further UI edits belong in coordinated follow-up. Local Edge/API/PG receiving passed twice, but full L06 and release remain open |
| October marketing | C:\gcsc-platform\.worktrees\marketing-october | codex/marketing-concept-disclosure-20261001 @ 1c0c6127, clean | Isolated marketing source and test-only accessibility candidate; no active writer | Visible AI-generated hero-image disclosure locally received earlier. New keyboard validator candidate: Edge154 eight cases failures[]/errors[] locally and independently, actual Tab/Enter mobile navigation. No site/CSS change or candidate integration; rights, video and live deploy open. Claude OAuth401 attempt is not PASS |

2026-10-07 coordination update: QA is clean at `30a1c4a2`; October-web is
clean at `4ec10a4c`. Isolated follow-ups cover admin document-review action
403, hidden denied download 404, disabled contractor upload/download 403,
and contractor compliance refresh races. Final Edge/API/isolated PostgreSQL
`V1fBMK` passed; successive read-only review findings were repaired, but
the exact last diff was not re-reviewed and formal gate remains open.
The earlier audit/demo-financing and desktop/mobile Dashboard work remains in
those branches. None of these candidates is integrated or gate-approved.

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
