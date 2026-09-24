# Metallicus support request: Android WebAuth sign-only identity proof

## Summary

SmartContractor needs to link an XPR Network account to an application user by
proving control of the selected `account@permission`. The proof must be signed
but never broadcast. Pairing succeeds on Android, and WebAuth returns one K1
signature plus a resolved 490-byte transaction, but the ownership-proof flow is
not completing reliably.

We need the supported Metallicus pattern for a non-broadcast identity/ownership
proof in a React Native Android application.

## Environment

- Device: Google Pixel 8
- Android: 16, API 36
- WebAuth Android: 2.1.66, versionCode 179, targetSdk 35
- SmartContractor APK: 0.1.4, versionCode 6, targetSdk 36
- Expo: 54
- React Native: 0.81.5
- `@proton/react-native-sdk`: 5.1.0-rc-2
- `@proton/link`: 5.1.0-rc-2
- `@proton/signing-request`: 5.1.0-rc-1
- Network: XPR Network Testnet
- Chain ID: `71ee83bcf52142d61019d95f9cc5427ba6a0d7ff8accd9e2088ae2abeaf3d3dd`
- Test account: `gcsctoken111@active` (public account identifier only)

No private key, PIN, signature value, access token, or application secret is
included in this report.

## Required security behavior

1. Pair with WebAuth and receive the public `account@permission`.
2. Create a short-lived server challenge bound to chain, account, permission,
   audience, session, and expiry.
3. Ask WebAuth to sign it with `broadcast: false` and `noModify: true`.
4. Verify the exact serialized bytes and recovered public key server-side.
5. Compare the recovered key against the current on-chain authority.
6. Only then link the wallet to the application account.

The diagnostic build never broadcasts a transaction and never authorizes an
application login merely from pairing metadata.

## Current request

The request contains:

- one context-free `eosio.null::nonce` action carrying the challenge context;
- one ESR identity pseudo-action:
  - account: empty name
  - name: `identity`
  - authorization: `gcsctoken111@active`
  - data: optional permission marker `01` followed by encoded account and
    permission names;
- zero TAPOS fields (`ref_block_num = 0`, `ref_block_prefix = 0`);
- fixed short expiry;
- `broadcast: false`;
- `noModify: true`.

The identity payload for this public test account is:

```text
011042980ad28c306200000000a8ed3232
```

The signing call is made on the parent `ProtonLink` object rather than the
paired session transport. On this Android installation, the paired session
transport opens only `proton-dev://link` and does not deliver the follow-up
request. Passing the complete ESR through the parent link opens WebAuth.

## Observed behavior

### Pairing

- WebAuth opens through a complete `proton-dev:<ESR>` deep link.
- The user authorizes public account access.
- SmartContractor receives and retains `gcsctoken111@active` for the process.
- Pairing is successful.

### Sign-only proof

- WebAuth opens and requests its PIN.
- The wallet returns to SmartContractor without a clear separate approval
  screen on some attempts.
- `link.transact` resolves and the sanitized response shape is:

```json
{
  "signatureType": "K1",
  "signatureCount": 1,
  "serializedBytes": 490,
  "format": "native-resolved",
  "broadcastResult": false
}
```

- There is no `processed` result and no transaction id.
- No blockchain transaction is broadcast.
- The application currently fails closed before granting wallet ownership.

### Earlier concrete failures resolved during diagnosis

1. `eosio::reqauth` was not accepted by WebAuth for this use case.
2. The ESR identity payload initially omitted the optional-field presence byte;
   WebAuth reported `Read past end of buffer`. Prefixing the encoded permission
   with `01` resolved that decoding error.
3. A paired follow-up request through the session channel opened only
   `proton-dev://link`; sending the complete ESR through `ProtonLink.transact`
   produced a signed response.

## Minimal flow

```ts
const { link, session } = await ProtonRNSDK({
  linkOptions: {
    chainId: TESTNET_CHAIN_ID,
    endpoints: TESTNET_ENDPOINTS,
    restoreSession: false,
    storage,
  },
  transportOptions: {
    requestAccount: 'gcsctoken111',
    getReturnUrl: () => 'smartcontractor://wallet-probe',
  },
});

const result = await link.transact(
  { transaction: challenge.transaction },
  { broadcast: false, noModify: true, chain: session.chainId },
);
```

## Questions for Metallicus

1. What is the officially supported React Native Android API for proving
   control of `account@permission` without broadcasting a transaction?
2. Is an ESR `identity` pseudo-action supported through
   `@proton/react-native-sdk` and Android WebAuth 2.1.66? If yes, what is the
   canonical request construction?
3. Is the optional `IdentityV3.permission` encoding expected to begin with the
   `01` presence byte followed by `permission_level`?
4. Does `noModify: true` guarantee that `resolved.serializedTransaction` is
   byte-for-byte identical to the transaction supplied by the application?
5. Should this request use `link.transact`, `session.transact`, `link.identify`,
   `SigningRequest.identity`, or another API?
6. Is the paired Android push/session channel expected to accept a follow-up
   sign-only request, or must every request carry a complete ESR deep link?
7. Are the installed RC package versions mutually compatible and recommended
   for production development? If not, which exact versions should be used?
8. Can Metallicus provide an official minimal Android example that pairs,
   requests a non-broadcast ownership signature, receives the callback after
   process/background transitions, and verifies the returned proof?

## Reproduction steps

1. Select XPR Network Testnet in WebAuth 2.1.66.
2. Open the SmartContractor diagnostic route.
3. Tap `Connect WebAuth` and authorize public account access.
4. Confirm that the application displays `gcsctoken111@active`.
5. Tap `Sign ownership proof`.
6. Complete the WebAuth PIN prompt.
7. Observe the return to SmartContractor and the sanitized signed-response
   shape above, followed by an incomplete proof result.

## Requested response

Please confirm the supported API and payload format, identify any incompatible
package versions, and provide or point us to a maintained React Native Android
sign-only identity-proof example.

