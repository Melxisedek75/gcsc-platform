# November 2026 GCSC MVP: intent

## Outcome

By 2026-11-30, make a go/no-go decision on a limited, genuinely usable
SmartContractor pilot and two truthful sites: a GCSC presentation site and a
SmartContractor owner/contractor cabinet. The target is a verified release
candidate, not a promise that 99% of the entire DAO, lending, escrow, token,
insurance, or real-estate vision will exist by that date.

The founder also wants first real homeowner jobs and participating contractors.
These are acquisition outcomes to pursue and measure, not software acceptance
claims that engineering can guarantee. Never create synthetic accounts, reviews,
documents, or jobs to report commercial traction.

## Why this order

1. Establish one code and decision baseline before parallel work; previous
   divergence across repositories caused repeated integration work.
2. Validate a narrow two-sided marketplace with real people before expanding
   the back office or buying traffic. A functioning funnel matters more than
   feature count.
3. Close identity, privacy, money, and operational risks before exposing a
   public flow; sandbox results do not establish production readiness.
4. Launch a small pilot, observe genuine behavior, then expand only from
   evidence. This follows the build/launch/talk-to-users discipline described
   by Y Combinator: https://www.ycombinator.com/blog/ycs-essential-startup-advice/

## Provisional scope decision

The recommended first public pilot is free to owners and contractors. WebAuth
may prove control of a selected XPR account, but no Mainnet transfer, paid lead,
escrow, lending, investment or token sale is part of this public MVP. Existing
50 XPR Testnet access remains a segregated test scenario. A different commercial
scope requires a recorded founder decision, technical review, and legal/provider
review before implementation or advertising.

## Known baseline on 2026-10-22

- `codex/wallet-reconcile-20261018` is 38 commits ahead of
  `codex/monorepo-publication`; its base is publication HEAD `1712ecd9`.
- `origin/main` is `a0834ac7`, 504 commits behind this candidate. No merge or
  production cutover is implied by that commit count.
- The candidate has 15 modified files in the mobile/API/payment/QA flow. They
  are preserved as work in progress, not certified or reverted.
- `docs/tasks/2026-10-20-xpr-project-access/REPORT.md` confirms one 50 XPR
  Testnet transfer for project 1 and an accepted bid, but owner acceptance,
  genuine document review, current APK QA walkthrough, and PostgreSQL runtime
  acceptance remain incomplete.
- The existing GCSC heartbeat is paused and targets the older publication
  worktree through October 31. It must not resume unchanged.

## Boundaries

No secrets in Git or chat. No unapproved ads spend, public deploy, live wallet
signatures/transfers, production DB change, legal commitment or irreversible
cleanup. One writer per worktree; independent reviewers report findings but do
not self-approve their own changes. Founder pause stops new work and the
associated schedule. Exact release criteria are in SPEC.md.
