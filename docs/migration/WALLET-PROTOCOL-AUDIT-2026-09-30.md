# Wallet protocol audit — 2026-09-30

## Scope

Local static audit for P2.1. This records the current server contract and does
not claim WebAuth device or signature compatibility.

## Implemented server routes

| Route | Auth boundary | Current role |
| --- | --- | --- |
| `POST /api/wallet/challenge` | authenticated app session | Issues a single-use, expiring message bound to user and account name. |
| `POST /api/wallet/connect` | authenticated app session | Consumes the challenge, verifies the signature, optionally checks the on-chain key, and persists the verified binding. |
| `GET /api/wallet/me` | authenticated app session | Returns the persisted wallet binding. |

The connect route rejects missing proof, invalid/expired/replayed challenges,
invalid signatures, and (when enabled) keys that are not authorized for the
requested account permission. The source is
`services/api/v3/pure-server.js`.

## Wallet-first routes

The migration requirement file lists these as required for a separate
wallet-first sign-in flow, and the publication candidate declares both:

- `POST /api/auth/wallet/challenge`
- `POST /api/auth/wallet/verify`

- `POST /api/auth/wallet/challenge` creates a login-purpose challenge bound to
  audience, testnet chain ID, account, permission, and a session binding.
- `POST /api/auth/wallet/verify` validates the signed proof, checks the verified
  wallet against an application account, and issues the normal app JWT.

The route inventory reports `54 declared API routes; 7/7 required entrypoints
present`. This is route-presence evidence only, not proof of device SDK or
physical-wallet compatibility.

## Consumer evidence

- Mobile calls the wallet-first challenge/sign/verify client and saves the
  returned JWT; the separate authenticated profile binding remains available
  for connecting a wallet after email login.
- Web exposes matching challenge/verify methods and its wallet login consumer;
  the separate `wallet/connect` method is for authenticated binding.
- A route inventory is necessary but does not prove SDK, deep-link, or
  physical-wallet compatibility.

## Acceptance boundary

P2.1 static contract mapping is complete for the current candidate. Behavioral
and device acceptance remain open: no production, live wallet, real signature,
or device test was used for this audit.
