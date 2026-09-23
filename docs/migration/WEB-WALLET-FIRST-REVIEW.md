# Web wallet-first login: independent review evidence

Date: 2026-09-22 (America/Los_Angeles)

## Reviewed scope

- Repository: `C:\gcsc-platform\.worktrees\frontend`
- Branch: `codex/mobile-wallet-probe-20260914`
- Initial candidate: `10b2861b`
- Corrected candidate: `3702e457`
- Reviewer task: `01a0ca0b-8cfd-7c93-8de1-15b61d29db88`
- Reviewer was independent and did not author frontend changes.

## Initial verdict

`CHANGES_REQUIRED` for exact commit `10b2861b`: the web SDK connection did not
pin XPR Testnet, so its default endpoint could establish a mainnet session while
the approved backend accepts only the exact Testnet chain ID.

## Corrections in 3702e457

- WebAuth connect receives the exact XPR Testnet chain ID and a vetted Testnet
  RPC endpoint.
- A returned session with another chain ID fails with
  `wallet_login_wrong_network` before challenge issuance or wallet signing.
- Static regression coverage locks the Testnet chain, endpoint and fail-closed
  guard into the web consumer.

## Re-review verdict

`APPROVED` for exact commit `3702e457`. Author and reviewer checks include:

- Web wallet login: 3/3 PASS.
- Shared wallet login client: 5/5 PASS.
- Sign-only ownership proof client: 15/15 PASS.
- Wallet restore: 11/11 PASS.
- Migration/provenance: 24/24 PASS.
- Mobile TypeScript: PASS.
- Web production build: PASS, 2,980 modules.
- Web lint: 0 errors, 1 pre-existing warning in `DecryptText.tsx`.

Reviewer reports remain available locally at:

- `C:\Users\rivne\Documents\Codex\2026-09-22\gcsc-wallet-qa-review\outputs\web-wallet-review-10b2861b.md`
- `C:\Users\rivne\Documents\Codex\2026-09-22\gcsc-wallet-qa-review\outputs\web-wallet-rereview-3702e457.md`

## Boundaries not closed by this approval

- No real WebAuth popup or browser session negotiation was performed.
- No combined browser-to-backend round trip against `c808f80a` was accepted.
- No signature, broadcast, payment, merge, deploy or production approval occurred.
- `VITE_XPR_TESTNET_RPC_URL` must remain a verified Testnet endpoint; the exact
  chain-ID guard still fails closed if a returned session is on another network.
