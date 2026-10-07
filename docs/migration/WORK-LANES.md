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

2026-10-07 coordination update: QA is clean at `b51453e4`; October-web is
clean at `4ec10a4c`. Isolated follow-ups cover admin document-review action
403, hidden denied download 404, disabled contractor upload/download 403,
and contractor compliance refresh races. Final Edge/API/isolated PostgreSQL
`V1fBMK` passed; successive read-only review findings were repaired, but
the exact last diff was not re-reviewed and formal gate remains open.
The earlier audit/demo-financing and desktop/mobile Dashboard work remains in
those branches. None of these candidates is integrated or gate-approved.
2026-10-07 L05 QA follow-up: `qa` is at `0888e2fc` (clean). The opt-in
`account-browser` runner checks frontend `ca5c88ae` with backend
`a1ff006f` in real Edge/API/disposable PostgreSQL; `FwgJVx` PASS1/1
includes App.tsx route selection, Dashboard session reload, restored
profile identity and cross-role duplicate denial. Contractor registration
also passed functionally at 390px without production CSS. Shell source
hashes and loaded local images are checked. Final follow-up was not
independently re-reviewed; no visual mobile acceptance is claimed.
The full `project-browser` combination remains blocked by the old
ProjectsPanel `Create Project` versus test `Save Draft` source mismatch.
No candidate integration or formal review approval is implied.
2026-10-07 cross-lane read-only receiving: clean October-web `4ec10a4c`
and backend `a1ff006f` passed separate QA Edge/API/disposable PG18.4
`project-browser` `LtDglM` and `account-browser` `TyiaF0`, each PASS1/1
with test/PG exit0 and cleanup PASS. The frontend `ca5c88ae` project
panel mismatch still exists; these tests do not merge branches or close
provider/review/release gates.
2026-10-07 single-journey L05 QA follow-up: `qa` is clean at `0c62a436`.
The opt-in `account-project-browser` uses clean October-web `4ec10a4c`
and backend `a1ff006f`; Edge154/API/disposable PG18.4 `JmDmrq`
PASS1/1 covers routed registration through owner private draft, contractor
browser-list invisibility and direct 404, then owner login/reload and
cross-role duplicate 409 in one local fixture. Runner18/18, root check,
and account-browser regression `weiAeQ` passed. The exact final QA diff
was not independently re-reviewed; provider delivery, production mobile
visuals, formal gate, integration and release remain open.
QA sign-out follow-up `40e1ae81` verifies Dashboard Sign out, absent
browser token and hidden owner draft after reload. Exact-source local
Edge/API/PG18.4 `account-project-browser` `dcLfFU` and `account-browser`
`ZTsNJB` passed 1/1 each, plus root check and runner18/18. This does not
prove server-side JWT revocation; the final test diff was not independently
re-reviewed.
QA mobile contractor sign-out follow-up `826dfccf` passed exact-source
Edge/API/PG18.4 `account-project-browser` `IumY6S` and `account-browser`
`RAThP4` at 390px. The first run failed on a test-only ambiguous aside
selector without production CSS; the scoped menu selector passed. This
is functional mobile-menu coverage, not visual acceptance or JWT revocation.
QA built-CSS visual smoke `08d2c44f`/`1d378057` on clean October-web
`4ec10a4c` passed local Edge154 registration at 1280/390px, with
screenshots in `qa/.tmp/account-visual-adMIvr`. This is not signed-in
Dashboard or combined PG visual acceptance. The selected Footer and
AccountAccess still show unverified live escrow/verification claims;
design Footer pilot copy exists separately and needs reconciliation/review.
October-web is now clean at `8ea53e2a`: only AccountAccess conditional
verification wording and its validator changed. RED/GREEN validator,
build, scoped ESLint, built-CSS Edge154 1280/390 visual smoke and exact
backend API/disposable PG18.4 account-project-browser `9Ap7Vg` PASS.
The old Footer claims persist in this branch; design pilot Footer and
auth/presentation still require reconciliation and formal review.
QA `20b6216b` extended built-CSS registration screenshots to
360/390/768/1280/1440px on October-web `8ea53e2a`; no page errors or
form clipping, one-pixel document-width tolerance at 1440px. Evidence
`qa/.tmp/account-visual-GnAnLh`. Full L20 accessibility and signed-in
visual acceptance remain open.
QA `70f062a7` added built-UI keyboard Tab order and Enter role-selection
checks across those widths; Edge154 5/5 PASS, evidence
`qa/.tmp/account-visual-JQfyPu`. Visible focus, screen reader and 200%
zoom remain unverified.
QA `0c62a436` then asserted `:focus-visible` and 3px outline for Owner
on all five widths; desktop/mobile focus screenshots were inspected.
Final evidence `qa/.tmp/account-visual-qvjZsK`. Contrast, screen reader,
200% zoom and signed-in Dashboard remain unverified.
QA is now clean at `8d3adb62`; October-web is clean at `f12f854b`.
The opt-in built-CSS account-project Edge/API/disposable PG18.4 run `MLheXt`
passed after a one-line frontend correction of full-width banner animation.
Signed-in 1280/390 and private-draft 1280 screenshots and widths were checked.
Earlier exact-source `GD5vUn`/`isakej` exposed 4-5px body overflow.
The candidates remain separate, not formally reviewed or integrated.
QA follow-up `b7e649ad` is clean: exact frontend/backend built-CSS
Edge/API/disposable PG18.4 `BWHTYL` PASS1/1 at signed-in owner360 and
contractor768 as well as the earlier 1280/390/draft widths. Browser/API/PG
exits and cleanup passed. No integration or formal review approval.
QA `38dd0aef` is clean: Edge154 built-CSS registration AX-tree names
for nine controls PASS at five widths; evidence `qa/.tmp/account-visual-McgEEr`.
This is not screen-reader or 200% zoom acceptance.
Web-design `62df4ae2` is clean: local legal-claims validator now guards
both footer variants with TSX AST; design PASS, current October-web RED
on false active-service claims and placeholder policy/social links.
This does not integrate the design candidate or approve legal copy.
QA `330fdf5b` and October-web `ea42be88` are clean. Pre-fix mobile menu
keyboard RED `RmaGsW`; built-CSS Edge/API/disposable PG18.4 `UV0iIj`
and nonvisual regression `5rYiNl` PASS after focus entry, Tab trap,
Escape and focus restoration. Final diff is not independently reviewed;
no integration or release approval.
Read-only review of the keyboard-menu candidate found two P2 focus gaps.
QA `aa1638fb` reproduced background focus RED `mXbdMp`; October-web
`c3526ab4` contained it, exact Edge/API/disposable PG18.4 `vK5zRP`
PASS1/1. Route/signout focus remains open; the final fix was not
independently re-reviewed or integrated.
QA `364aa4df` and October-web `4ebca889` are clean: sign-out focus
RED `GjxLXS`, then built-CSS Edge/API/disposable PG18.4 `cdOUt7`
PASS1/1 for mobile contractor and desktop homeowner. Token route focus
and exact-final-diff review remain open; no integration.
Independent Codex read-only re-review of exact October-web
`f12f854b..4ebca889` found no new P1-P3; reviewer did not run Edge.
Parent reran nonvisual account-browser `5tkXST` PASS1/1. Token route
focus remains pre-existing and formal CODEX/CLAUDE gate remains open.
2026-10-07 L20 Token-focus follow-up: October-web `d940e73c` and QA
`a48719ed` are clean isolated candidates. QA RED `U7nB6h` reproduced
mobile route focus loss; built-CSS Edge/API/disposable PostgreSQL18.4
`luLWKW` passed mobile contractor and desktop owner keyboard navigation
to the Token heading (test/PG exit0). Runner19/19, web build and focused
ESLint passed. The exact final diff has no independent review; neither
candidate is integrated or published. Screen reader, 200% browser zoom,
full L20 and formal CODEX/CLAUDE gate remain open.
L20 next: actual 200% browser zoom remains unverified; two headless Edge
`Control++` inputs did not change DPR, CSS viewport or visual scale. The
independent review dispatch failed at the unchanged agent thread limit;
do not relabel this as PASS. L21 design reconciliation also needs to
combine design `d892515b` TokenRedirect pilot wording with the stale
October-web copy; legal-claims RED/GREEN, web build, scoped ESLint and
dashboard-live passed in design only. No independent final review or
receiving integration has occurred.
QA `2bb4be0e` adds a delayed registration synthetic HTTP503 and retry
assertion at 390px. Exact built-CSS Edge/API/disposable PG18.4 `PE46UT`
PASS1/1 with test/PG exit0; runner19/19. It verifies pending/visible
error/preserved inputs/no pre-retry database user, then one successful
registration. Real weak-network conditions and screen reader remain open;
the exact test diff has not been independently reviewed.
Frontend auth lane is at `ca5c88ae` with a pinned Edge154 account-role
12/12 candidate; QA `b51453e4` owns the added regression cases. The frontend
`docs/security/` untracked directory remains untouched. The design branch
still needs auth/presentation reconciliation before integration; these
isolated commits are not a formal CODEX/CLAUDE approval.

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
