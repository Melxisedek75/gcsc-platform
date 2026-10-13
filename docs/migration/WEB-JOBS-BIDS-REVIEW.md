# Web jobs and bids UI: independent review evidence

Date: 2026-09-22 (America/Los_Angeles)

## Reviewed scope

- Repository: `C:\gcsc-platform\.worktrees\web-design`
- Branch: `codex/web-design-system-20260914`
- Initial candidate: `500e1152`
- Corrected candidate: `a587c2ab`
- Reviewer task: `01a0ca0b-8cfd-7c93-8de1-15b61d29db88`
- Reviewer was independent and did not author UI changes.

## Initial verdict

`CHANGES_REQUIRED` for exact commit `500e1152`: repeated Retry could start
concurrent requests and an older response could overwrite the newest state.
Failed refreshes also retained prior jobs/bids without marking them stale.

## Corrections in a587c2ab

- A monotonic latest-request gate allows only the newest request to apply data,
  error or loading state.
- Effect cleanup invalidates pending requests after unmount.
- Refresh clears old lists; current request failure also clears selected project,
  bids, escrow and milestones rather than presenting stale details as current.
- Behavioural tests cover out-of-order completion and invalidation.

## Re-review verdict

`APPROVED` for exact commit `a587c2ab`. Author and reviewer checks include:

- Web jobs/bids state and gate tests: 4/4 PASS.
- Migration/provenance: 24/24 PASS.
- Web production build: PASS, 2,978 modules.
- Web lint: 0 errors, 1 pre-existing warning in `DecryptText.tsx`.

Reviewer reports remain available locally at:

- `C:\Users\rivne\Documents\Codex\2026-09-22\gcsc-wallet-qa-review\outputs\web-jobs-bids-review-500e1152.md`
- `C:\Users\rivne\Documents\Codex\2026-09-22\gcsc-wallet-qa-review\outputs\web-jobs-bids-rereview-a587c2ab.md`

## Boundaries not closed by this approval

- No responsive browser run with a live API was performed.
- No production deployment, auth/payment API change, wallet signature or
  broadcast occurred.
