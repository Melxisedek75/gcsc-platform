# Installed wallet SDK identity compatibility

Date: 2026-09-08 UTC. Diagnostic candidate, NOT_APPROVED, not a wallet-auth fix.
QA base: 5a520f49e5087cfd47dccb7ea0b849dfd36e14ae.
Read-only dependency source: frontend 6151d36b73fd252c433484082adbaf160c971ed4.
Backend inspected: 309c2909dddea7c17e941f81bd485661e358349f.

## Exact scope

Characterize the installed official codecs before designing server login proof.
No SDK login/identify/transact calls, wallet connection, signatures, private keys,
RPC, accounts, transfers or database access. No source/lockfile changes in either
application. This is not independent review of the parent's backend candidate.

Official repository: https://github.com/XPRNetwork/proton-web-sdk (read-only lookup).
Conclusions below come from pinned local source AND running the installed codec
modules, not from assuming the repository's current master matches npm packages.

| Package | Web | Mobile |
| --- | --- | --- |
| @proton/web-sdk | 5.0.0 | 5.1.0-rc-2 |
| @proton/link | 5.0.0 | 5.1.0-rc-2 |
| @proton/signing-request | 5.0.0 | 5.1.0-rc-1 |
| @proton/react-native-sdk | not used | 5.1.0-rc-2 |

Executed ESM codec SHA-256:
- web: 9f41eaee667c7ddbbe9888722c32685f8dc3a7bfdbe7bac313914f9898d78084
- mobile: cac433b4bd277bed6395faa46e690d414639c0b423618378fefe7f44e99a2c2e

## Reproduced limitations

`SigningRequest.identity` produces non-broadcast version 2 in BOTH installations.
Round-trip bytes and resolved transaction digests agree across the two codecs.
Changing chain, actor or permission changes the digest. In contrast:
- Changing `info.nonce` does NOT change the transaction signing digest.
- Changing `info.domain` does NOT change that digest.
- Changing callback URL changes the request envelope, NOT that digest.
- Supplying `scope` is silently omitted by this creation API.
- Supplying a new expiration during v2 resolution leaves expiration at epoch zero
  and does not change the digest.

This describes the standard identity request construction/resolution path, not
every possible custom transaction or wallet-side transformation. Metadata may
have separate transport protections; it is not cryptographically bound by the
wallet transaction digest tested here. Checking an unsigned nonce alongside an
otherwise valid identity signature does not prove a fresh app-specific login.

Synthetic fixture: chain `11` repeated 32 bytes, alice@active. Two requests with
different nonces yielded the same digest:
`a26b678e4b55ff1adf7b12a770c17473ff9935a58c41236171c29b82b3495f46`.
An explicit `assert.notEqual` security requirement failed with exit 1; the
characterization suite intentionally records the hazard rather than claiming it
fixed. No signature was generated to demonstrate this digest equality.

## Source trace

Paths below are relative to each app's installed node_modules:
- @proton/signing-request/src/signing-request.ts:361: createSync pins version 2;
  identity helper:487; v2 expiration handling:834-862; scope handling is commented out.
- @proton/signing-request/src/abi.ts:30: IdentityV3 has permission, not scope.
- @proton/signing-request/src/identity-proof.ts:42-117: proof fields and recovered
  digest have no nonce/domain. Do not assume generic ESR v3 examples apply unchanged.
- @proton/link/src/link.ts:513: identify returns proof; login:578 creates a session.
  link-options.ts defaults verifyProofs to false. Enabling that switch alone is not
  an implemented backend authentication protocol or a solution to these v2 fields.
- @proton/react-native-sdk/src/index.ts:82-101: returns link/session/loginResult;
  restore is not a newly signed server challenge.
- Web @proton/web-sdk/src/connect.ts:136 selects ProtonWebLink for walletType=webauth.
  Its src/links/protonWeb.ts login returns a session with auth/transact, not the
  same proof-bearing Link.login result. GCSC forces this selector in
  apps/web/src/services/webauth.ts:52-55. Native Link and web popup are distinct paths.
- GCSC backend pure-server.js:1563,1587,1604 expects a raw-string K1 challenge
  signature. Neither current GCSC consumer supplies that protocol (see main RESULTS).

## Reproduction

From the QA checkout, use preinstalled dependencies whose complete web/mobile
lockfile hashes match QA. An explicit root avoids copying or reinstalling packages:

```powershell
$env:GCSC_WALLET_SDK_ROOT='C:\gcsc-platform\.worktrees\frontend'
npm run test:wallet-sdk
```

With both app dependencies installed in the current checkout, omit the variable.
No auto-install or skip-on-missing-dependency behavior. The test resolves the codec
from each Link package and verifies pinned versions; it blocks fetch/TCP/UDP calls.

Verified results:
- Final characterization suite: 24/24 PASS twice, 1.233 s and 0.991 s, zero skipped.
- Missing dependency root: exit 1 / setup ENOENT, zero passed; never reported green.
- npm run check: 7/7 migration + API syntax + three static web validators PASS.
- npm run check:integration-contracts: exit 1, 5/7 entrypoints; wallet-first
  challenge/verify remain absent. This is intentionally NOT a green integration gate.
- git diff --check: PASS. API behavioral suite/device/APK not rerun for test-only scope.

## Coordinated protocol requirements before implementation

Proposed acceptance criteria, NOT an implemented or independently approved protocol:
1. One versioned server challenge binds purpose (login vs link), server audience,
   unpredictable nonce, chain, actor/permission, issue/expiry and requesting session.
2. Prove with offline tests that every security-critical field changes the exact
   digest verified by the server. Envelope metadata and callback routing are not
   substitutes. Keep TTL and atomic single-use challenge consumption server-side.
3. Confirm both web popup and native transport can return the chosen proof format.
   Do not invent signMessage/signArbitrary, use payment transfers, or patch SDKs blindly.
4. Server validates the bounded payload, signature and current account authority;
   only then bind wallet or issue an application JWT. Do not weaken existing guards.
5. Restored SDK sessions, public keys and profile metadata remain insufficient proof.
   Reject stale, cross-chain, cross-domain, wrong-purpose and duplicate challenges.

Next safe task: an isolated, non-broadcast SDK compatibility experiment for a
canonical server challenge whose domain/nonce/expiry are actually signed, before
changing endpoints or both consumers. If current transports cannot represent that
proof, document the unsupported capability and keep wallet-first login gated;
do not claim a raw v2 login proof satisfies the contract. Transport UI/device
acceptance and independent security review remain separate gates.

## Follow-up: full-transaction payload experiment (2026-09-08 UTC)

Implemented only in tests, on top of QA eb4a84d8. No application protocol enabled.
Added `tests/wallet-challenge-payload.test.mjs` and `test:wallet-payload`; extracted
shared pinned-dependency/network-denial setup without weakening the 24 baseline tests.

The fixture places a fixed-order JSON challenge in a context-free action's data,
alongside an identity action and an explicit transaction expiration. Receivers are
empty synthetic names, not deployed contracts or payment recipients. The context-free
`nonce` action is a serialization fixture, NOT a claimed real ABI or chain action.
There are no transfers and no generated signatures. Both codecs use the same full
transaction bytes and digest; changes to version, purpose, audience, nonce, session
binding, issue time and expiration each change that digest. The test uses action
data inside `context_free_actions`, NOT a separate `context_free_data` blob.

This is consistent with the transaction-level serialization described in the
[official Antelope transaction protocol](https://docs.antelope.io/docs/latest/protocol/transactions_protocol/).
It is a candidate encoding experiment, not proof that a real wallet will accept
these synthetic actions, display them safely or return the required signature.

Transport source tests transpile the pinned published TypeScript with the installed
TypeScript compiler and execute it in an isolated VM. Only IO is replaced:
- Native `ReactNativeTransport.onRequest`: a stub captures Linking.openURL; the
  compressed URI decodes to the same digest with broadcast=false. This is NOT the
  restored channel/session path and does not execute a device deep link.
- Web `ProtonWebLink.createSession().transact`: fake window/messages capture the
  full transaction and `{broadcast:false,noModify:true}` parameters. A synthetic
  success response completes the promise, NOT cryptographic proof validation.

Transport source SHA-256:
- Native: ea0a970a14ce0dff609ae15cb0276e0191d089988c7cd08640acaa7fff40b786
- Web: d4127914194177c7068bb27249e988948109dbaa64812eae1cc8912e9fc434f6

`broadcast` and `noModify` are transport instructions, not signed restrictions on
what a malicious client may submit. No server should accept arbitrary actions or
trust these flags as security proof. Strict expected-byte comparison, purpose and
session binding, atomic nonce consumption, authority checks and exact callback
origin/source validation are still required before any auth integration.

First experiment run: 17 PASS / 2 FAIL from harness setup (missing pako compression
and cross-VM object prototype comparison). After supplying the SDK's pako, decoder
scheme also had to match proton-dev; no installed package was modified. Final run:

```powershell
$env:GCSC_WALLET_SDK_ROOT='C:\gcsc-platform\.worktrees\frontend'
node --test --test-concurrency=1 tests/wallet-sdk-identity.test.mjs tests/wallet-challenge-payload.test.mjs
```

43/43 PASS twice (4.826 s and 6.678 s), zero skipped. `npm run check` PASS (7/7 plus
syntax/static), integration contract check still FAIL 5/7. No independent approval,
wallet/device/native APK or backend behavior evidence was added. Application source,
dependencies and lockfiles remain unchanged. The signing boundary cannot be crossed
by this automation; continue other safe local baseline tasks instead of repeatedly
running the same experiment or advertising the wallet protocol as ready.
