# AI Review Record

- Change ID: 2026-10-06-private-proposal-pg
- Repository: gcsc-platform
- Branch: codex/monorepo-publication
- Scope: test-only L09 proposal-message privacy in disposable PostgreSQL
- Author AI: CODEX (publication coordinator)
- Reviewer AI: separate CODEX context `01a11007-866c-73f1-8e0d-69fb8a9f1686`
- Reviewer decision: APPROVED for the revised test-only diff; no remaining P1-P3
- Live-risk and deploy decisions: BLOCKED

## Evidence

The project-publication suite saves a proposal message containing a private
sentinel. PostgreSQL retains the exact text. The homeowner reads it through
their project bids, and the submitting contractor reads it from their own
bids. A paid but not accepted contractor's ordinary project read remains a
public preview; their paid project brief, an unrelated owner, anonymous
preview and public list do not disclose the proposal message.

| Check | Result |
|---|---|
| Revised candidate PostgreSQL | 34/34 `9rcKMq`, test and PG exits 0 |
| Independent reviewer PostgreSQL | 34/34 `MezCQR`, test and PG exits 0 |
| Syntax, diff and root checks | `node --check`, `git diff --check`, `npm run check` PASS |

The first test run `pNCPhl` failed because a paid buyer was incorrectly
expected to be an accepted contractor. The reviewer then requested stronger
public-list and post-save paid-details assertions; both were added before
approval. This is local QA, not a runtime change, full L09/L16 acceptance or
formal CODEX/CLAUDE release gate. No live provider, payment, push or deploy
was touched.
