# Mobile wallet-first login: independent review evidence

Date: 2026-09-22 (America/Los_Angeles)

## Reviewed scope

- Repository: `C:\gcsc-platform\.worktrees\frontend`
- Branch: `codex/mobile-wallet-probe-20260914`
- Initial candidate: `07002382`
- Corrected candidate: `6e67d6f3`
- Reviewer task: `01a0ca0b-8cfd-7c93-8de1-15b61d29db88`
- Reviewer was independent and did not author frontend changes.

## Initial verdict

`CHANGES_REQUIRED` for exact commit `07002382`:

1. Concurrent login attempts could perform two verify requests and save twice.
2. An abort after wallet signing could still verify the proof and persist the JWT.

The reviewer confirmed that the path was sign-only and did not broadcast a
transaction, but the race and cancellation behavior blocked approval.

## Corrections in 6e67d6f3

- One wallet-login request may be active at a time; a concurrent request fails
  with `wallet_login_request_pending` before a second verify or save.
- The abort signal is checked after signing and after verification; cancellation
  before persistence fails closed.
- Negative tests reproduce both findings and verify one verify/save only.

## Re-review verdict

`APPROVED` for exact commit `6e67d6f3`. Author and reviewer checks include:

- Wallet login client: 5/5 PASS.
- Sign-only ownership proof client: 15/15 PASS.
- Wallet restore: 11/11 PASS.
- Migration/provenance: 24/24 PASS.
- Native build guards: 12/12 PASS.
- Mobile design: 10/10 PASS.
- Mobile TypeScript: PASS.

Reviewer reports remain available locally at:

- `C:\Users\rivne\Documents\Codex\2026-09-22\gcsc-wallet-qa-review\outputs\mobile-wallet-review-07002382.md`
- `C:\Users\rivne\Documents\Codex\2026-09-22\gcsc-wallet-qa-review\outputs\mobile-wallet-rereview-6e67d6f3.md`

## Boundaries not closed by this approval

- No APK containing `6e67d6f3` has been built or installed.
- No physical WebAuth sign-only response has been accepted by this candidate.
- Web source consumer was integrated later and independently approved at
  `3702e457`; real combined browser/backend acceptance remains open.
- No payment, transaction broadcast, merge, deploy or production approval occurred.
