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

## Missing wallet-first routes

The migration requirement file still lists these as required for a separate
wallet-first sign-in flow:

- `POST /api/auth/wallet/challenge`
- `POST /api/auth/wallet/verify`

They are not declared in the server route table. This is a genuine contract
gap, not a reason to add placeholder handlers. Existing email/session login and
authenticated wallet binding must remain separate until the wallet-first
request/response schema is reviewed with all consumers.

## Consumer evidence

- Mobile currently routes through authenticated profile binding and the wallet
  connection flow; it does not call the missing wallet-first endpoints.
- Web consumers must be checked against the same route table before any server
  change. A route inventory is necessary but does not prove SDK, deep-link, or
  physical-wallet compatibility.

## Acceptance boundary

P2.1 remains open until a reviewed wallet-first schema exists or the requirement
is explicitly removed. No production, live wallet, real signature, or device
test was used for this audit.
