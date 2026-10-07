# Milestone mutations and stale roles: local candidate (2026-10-07 UTC)

Status: backend candidate only. No live escrow, payment, signing, provider
verification, integration, deployment, or formal independent review.

The seven escrow/milestone mutation handlers checked JWT identity against the
escrow participant ID but did not check the account's current active status
and role. Local JSON-mode HTTP regressions reproduced unauthorized creation,
submission, approval, release-status changes, disputes, and chain-evidence
recording after participant disable. The chain-evidence verify route returned
404 for a missing transaction before checking a disabled participant. These
are prototype database status/evidence operations, not actual fund movement.

Backend commit `feb2bf95` adds `hasCurrentRole` checks after participant-ID
matching on all seven handlers. The focused regression was RED on 9/10
disabled-participant cases (one input was rejected for another reason), then
GREEN 10/10. Two role-demotion cases also passed. Full escrow suite 66/66
and API Jest 354/354 passed with a dummy local JWT secret. These runs used the
combined backend working-tree source; preexisting unstaged L05a document-upload
changes were excluded from this commit and preserved.

QA commit `40284a8c` extends the opt-in isolated PostgreSQL 18.4 escrow-role
suite with disabled-owner milestone creation and demoted-contractor submission.
Against the combined backend working-tree source it passed 1/1
(`postgres-baseline-Di1XIM`). Against an isolated detached checkout of exact
backend commit `feb2bf95`, it passed 1/1 (`postgres-baseline-wt8Nqa`), and the
project-publication suite passed 33/33 (`postgres-baseline-4To6rj`). Each had
test and PostgreSQL exit 0. The exact committed `pure-server.js` SHA-256 was
`6298f2a3ab4a9ad74d49b1d2bdc8131ad2ea2dc0bf49a72041d375b3a3716007`.
QA runner parser 14/14 and root check passed. The clean disposable checkout
was removed afterward.

Still required: broader PostgreSQL mutation-path coverage, authorization under
concurrent role revocation, independent review and the formal CODEX/CLAUDE gate
before any integration. No provider or real payment verification was performed.
