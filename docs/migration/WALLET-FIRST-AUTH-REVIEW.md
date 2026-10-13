# Wallet-first auth: independent review evidence

Date: 2026-09-22 (America/Los_Angeles)

## Reviewed scope

- Repository: `C:\gcsc-platform\.worktrees\backend`
- Branch: `codex/backend-integration`
- Initial candidate: `b95ffe75`
- Corrected candidate: `c808f80a`
- Reviewer task: `01a0ca0b-8cfd-7c93-8de1-15b61d29db88`
- Reviewer: independent projectless QA worker; it did not author backend changes

## Initial verdict

`CHANGES_REQUIRED` for exact commit `b95ffe75`:

1. Production could use a known fallback JWT secret.
2. The authority RPC response was accepted without verifying the XPR Testnet chain ID.
3. Rate limiting trusted client-supplied `X-Forwarded-For`, and expired challenges were not pruned before insert.
4. The PostgreSQL `wallet_challenges` table had no versioned migration.

## Corrections in c808f80a

- Production JWT startup is fail-closed when no explicit secret is configured.
- Authority lookup verifies `/v1/chain/get_info` against the expected XPR Testnet chain ID before account lookup.
- Client identity uses the socket peer instead of an untrusted forwarded header.
- JSON and PostgreSQL stores prune expired challenges before creating a new challenge.
- `services/api/v3/database/wallet-auth-migration.sql` creates the required table and indexes; `db:migrate` includes it.
- Security-boundary tests cover the corrected behavior.

## Re-review verdict

`APPROVED` for exact commit `c808f80a`. The reviewer independently repeated:

- API test suite: 225/225 PASS.
- Provenance/migration checks: 7/7 PASS.
- Declared contract routes: 7/7 PASS.
- Production missing-secret startup: fail-closed PASS.

Reviewer reports remain available locally at:

- `C:\Users\rivne\Documents\Codex\2026-09-22\gcsc-wallet-qa-review\outputs\backend-wallet-qa-review-b95ffe75.md`
- `C:\Users\rivne\Documents\Codex\2026-09-22\gcsc-wallet-qa-review\outputs\backend-wallet-qa-rereview-c808f80a.md`

## Boundaries not closed by this approval

- No real local PostgreSQL runtime acceptance has been recorded.
- No web or mobile consumer is integrated with this HTTP contract yet.
- No physical WebAuth response, wallet signature, payment or broadcast was performed.
- This approval is not merge, deploy or production approval.
