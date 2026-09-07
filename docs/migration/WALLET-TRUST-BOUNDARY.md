# Wallet metadata trust boundary

Local security candidate only, based on 5a520f49 in codex/backend-integration.
Status: LOCAL_CHECKS_PASSED, NOT_APPROVED. No new wallet-first auth protocol is enabled.

Observed flow:
- PUT /api/auth/profile accepts client wallet metadata without an ownership proof.
- Changing permission on the same account currently retains verified=true.
- POST /api/payment/lead-token and /job-posting use accountName without verified.
- The preserved backend-wallet prototype also retains proof across permission edits;
  it is comparison evidence, not a reviewed implementation to merge.

Bounded fix plan:
- [x] Reproduce both trust violations with loopback HTTP tests and stubbed transfer lookup.
- [x] Keep a stored proof only for the same account AND permission; clear stale proof
  fields when either changes. Ignore client-supplied proof fields.
- [x] Reject a metadata-only wallet before any transfer lookup or receipt mutation.
  Preserve wallet_required for absent wallets; use wallet_proof_required otherwise.
- [x] Keep positive fixtures explicit about already verified server-side state.
- [x] Run the complete existing offline API suite twice and source/provenance checks.

No client changes, new dependencies, financial behavior enablement, external account
lookup, live database, wallet signature or transfer. Tests may use synthetic in-memory
identities and existing offline cryptographic fixtures, never user keys.
The new tests do not sign. They cannot prove wallet/device or chain interoperability.

Separate remaining auth work: wallet-first challenge/verify routes, protocol/domain/
chain/permission binding, authority threshold verification, safe ownership uniqueness
and storage concurrency. This narrow guard is not a complete auth/security review.

## Verification (2026-09-07 UTC)

| Command at worktree root unless noted | Result |
| --- | --- |
| npm ci --offline --ignore-scripts --no-audit --no-fund (services/api/v3) | exit 0; 587 packages from existing lockfile |
| npm run test:api, baseline with new tests | 12 FAIL / 90 PASS: metadata claims received 200 instead of 409, permission edits retained verified=true, account edits retained stale publicKey |
| npm run test:api, fixed candidate, first run | exit 0; 102/102 PASS, 4 suites |
| npm run test:api, fixed candidate, second run | exit 0; 102/102 PASS, 4 suites |
| npm run check | exit 0; 7/7 provenance tests, API syntax and 3 static web validators |
| npm run check:integration-contracts | exit 1; 5/7 routes, wallet-first challenge/verify still absent |
| git diff --check | exit 0 |

The first test-harness run had a callback setup mistake (returning server.listen
from a done-style beforeAll); it was fixed before the meaningful 12-failure red run.
No production code was changed until the trust failures were observed.

New suite: services/api/v3/tests/wallet-binding-trust.test.js, 15 cases. It uses the
actual canonical HTTP handlers on 127.0.0.1, disables gcsc.db reads/writes via scoped
fs spies and stubs the transfer verifier. It checks missing/false/string/numeric
verified flags, forged profile proof fields for both roles, account/permission
changes, unchanged proof, ordinary profile edits and disconnect. Rejections assert
no verifier call, receipt/lead/job payment creation or project publication. No
new test signs a message. Existing API tests retain their offline generated-key
signature fixtures with mocked account/transfer checks, not wallet/testnet signing.

No SQL schema, dependencies or lockfiles changed. Imported runtime and positive
fixture changes are recorded in adaptations.json with original blobs and current
SHA-256, without changing the import manifest. Existing npm deprecation warnings
and Node url.parse warning remain; dependency upgrades are outside this patch.

## Behavior and handoff

Only a server-stored literal verified=true binding passes these two payment guards.
Missing binding still returns 409 wallet_required. Metadata-only binding returns
409 wallet_proof_required. Positive transfer sender/memo/recipient/amount checking
remains unchanged. A profile account/permission change requires a new proof and
removes stale publicKey/verifiedAt fields; unchanged identity preserves server proof
while ignoring client-supplied proof values.

Compatibility consequence: clients that only save wallet metadata must complete
the ownership-proof flow before submitting a payment receipt. This is intentional
fail-closed behavior, not proof that those clients have already been integrated.
Do not install or deploy this backend candidate as a wallet-login fix.

Independent review is still required on the exact commit before integration. No
reviewer was launched in this task; prior quota-blocked reviews are not approvals.
Review additionally needs to cover the existing authority-check bypass setting,
threshold/delegation handling, network/permission-bound challenges, duplicate-account
ownership rules and legacy stored bindings. This patch does not certify those paths.
