# WebAuth client/API reconciliation

P2.1 diagnosis on runtime base `1ac9644d6988895bf0f6b79229d94c813dd2e121`.
This maps the current application code; it is not an implementation or device
acceptance of wallet-first authentication. Preserved legacy candidates are not
active inputs to this contract.

## Three separate states

1. Application login returns an app JWT and user profile.
2. SDK pairing/restoration provides an account and a local signing session.
3. A server-verified, current ownership proof permits binding that wallet for
   protected operations. Profile metadata or a restored SDK session cannot replace it.

## Actual route and consumer map

| Operation | API behavior | Web consumer | Mobile consumer |
| --- | --- | --- | --- |
| Email login | POST /api/auth/login returns app JWT/user | services/api.ts | lib/auth.ts: login |
| Read profile | GET /api/auth/profile, app JWT | Wallet.tsx and dashboard | lib/auth.ts: fetchProfile |
| Save wallet metadata | PUT /api/auth/profile; changed identity invalidates verified binding | No wallet-profile caller | app/(auth)/connect-wallet.tsx calls updateProfile with account/permission |
| Issue linking challenge | POST /api/wallet/challenge, existing app JWT required | No caller | No caller |
| Verify linking proof | POST /api/wallet/connect requires publicKey/signature, consumes challenge, checks authority | api.connectWallet sends identity fields only, no signature | No caller; metadata update used instead |
| Wallet-first challenge/verify | /api/auth/wallet/challenge and /verify absent | No implemented wallet-first app login | Sign-in contains no wallet-first action; earlier placeholder was removed |
| Lead payment receipt | POST /api/payment/lead-token requires verified wallet and transfer verification | No web consumer | Separate payment consumer; metadata-only binding cannot pass |

Source anchors:
- `services/api/v3/pure-server.js`: issueWalletChallenge,
  consumeWalletChallenge, verifyWalletSignature and the route map.
- `apps/web/src/services/api.ts`: connectWallet request type and body.
- `apps/web/src/services/webauth.ts`: ProtonWebSDK result and session adapter.
- `apps/web/src/pages/Wallet.tsx`, `pages/dashboard/WalletPanel.tsx`: consumers.
- `apps/mobile/lib/auth.ts`, `lib/api.ts`, `lib/webauth.ts` and
  `app/(auth)/connect-wallet.tsx`, `app/(auth)/sign-in.tsx`.

## Confirmed incompatibilities

Web pairing can succeed while saving to the API returns HTTP 400
`wallet_proof_required`: the actual request omits the signature required by the
handler. Restoring the same metadata repeats this incompatibility. Preserving an
app JWT on this failure is correct error isolation, not a completed wallet link.

Mobile pairing writes metadata via profile update. That may let a user navigate
the app, but the server still requires verified ownership before receipt acceptance.
Priming a local SDK session from a backend profile does not create that proof.

The web profile form does not write wallet metadata, and the web app has no
lead-token receipt consumer. P2.5 requires implementing that client flow rather
than merely reconnecting an existing one. These gaps were checked during
independent review of the route map.

The existing linking challenge requires an app JWT. It cannot be reused unchanged
to log in a user who does not have an app JWT. Renaming endpoints alone does not
implement wallet-first login or resolve the cryptographic format mismatch.

Backend currently verifies a raw-string K1 challenge. The pinned web/native SDK
paths have not been shown to sign that format. Existing characterization demonstrates
that ordinary v2 identity metadata (nonce/domain/callback) is not part of its signed
transaction digest. Do not accept that metadata as a fresh authentication proof.
See `WALLET-SDK-IDENTITY.md` for the exact pinned-source experiment and limitations.

## P2.2 acceptance and dependency

Select a wallet-supported, sign-only proof format shared by the web popup and native
transport. It must cryptographically bind the exact server challenge, purpose,
audience, actor/permission, chain, session and lifetime. The existing full-transaction
fixture binds those bytes offline, but a real wallet has not accepted its synthetic
actions; this is the remaining compatibility experiment, not a usable protocol.

Then implement bounded payload validation, atomic single-use challenges, authority
checks and separate login/link routes, with coordinated client changes. Rejections
must leave protected operations unavailable and preserve unrelated app sessions.
Never silently broadcast or substitute a payment to obtain an authentication signature.

Independent security review and user-controlled wallet/device acceptance follow
the local tests. Until compatibility is verified, proceed with clean build and
other dependency-ready checklist items, preserving the unresolved protocol task.

## Reproducible checks

- `npm run check:integration-contracts`: expected current FAIL, 47 declared routes,
  5/7 required entrypoints. A static inventory does not validate their behavior.
- `GCSC_WALLET_SDK_ROOT=C:/gcsc-platform/.worktrees/frontend` plus
  `node --test --test-concurrency=1 tests/wallet-sdk-identity.test.mjs tests/wallet-challenge-payload.test.mjs`
  exercises the pinned SDK characterization with network entrypoints blocked.
- `npm run test:api` exercises the current canonical HTTP handlers with the
  project's isolated fixtures. It does not represent live chain or phone evidence.

2026-09-13 rerun: 43/43 SDK characterization/payload tests PASS, zero skipped,
network entrypoints denied. Static route inventory still FAILS at 5/7. The runtime
and both client implementations were unchanged by this diagnostic/preservation work.
