Subject: Request for engineering assistance: Android WebAuth sign-only identity proof for GCSC SmartContractor

Dear Metallicus and XPR Network Support Team,

My name is Serhiy, and I am the founder of Global Construction Smart Contract
(GCSC), an early-stage construction technology project being developed on XPR
Network. I am contacting you to request engineering guidance regarding an
Android WebAuth integration issue that is blocking reliable wallet ownership
verification in our SmartContractor application.

GCSC is intended to provide a trust and coordination layer for homeowners,
contractors, construction workers, and project stakeholders. Our objective is
to combine conventional server-backed application workflows with verifiable
on-chain actions. The project is designed around practical construction use
cases such as contractor discovery, verified leads, bids and proposals,
milestone-based project records, reputation, memberships, governance, rewards,
and, subject to future legal, security, and provider approvals, financing and
escrow-related services.

The current architecture includes a mobile application, a web application, an
application API, and XPR Network smart-contract modules. Contract modules under
development cover utility tokens, memberships, staking, treasury governance,
leadership proposals and voting, social bounties, insurance-oriented records,
and future real-estate coordination. Financial, lending, insurance, escrow, and
stable-value features are not represented as live regulated services; those
capabilities remain gated by legal review, security review, licensed providers,
and explicit production approval.

WebAuth is strategically important to the project because users should be able
to connect an XPR account without exposing private keys to SmartContractor. For
security, pairing metadata alone must never be treated as proof of account
ownership. Our intended flow is therefore:

1. Pair the application with WebAuth and receive the public
   `account@permission` identity.
2. Generate a short-lived server challenge bound to the account, permission,
   chain, application audience, session, and expiry.
3. Ask WebAuth to sign the challenge without broadcasting a transaction.
4. Verify the exact signed bytes and recover the signing public key on the
   server.
5. Compare that key against the account's current on-chain authority.
6. Link the wallet to the application user only after all checks pass.

We have made substantial progress in isolating the problem. Pairing succeeds on
a Google Pixel 8 running Android 16 and WebAuth 2.1.66. WebAuth identifies the
XPR Testnet account `gcsctoken111@active` and returns a native resolved response
containing one K1 signature and a 490-byte serialized transaction. The request
uses `broadcast: false` and `noModify: true`; no transaction is broadcast and no
funds are moved. However, the complete sign-only ownership-proof workflow does
not finish reliably.

During diagnosis we also identified and corrected several concrete issues:

- `eosio::reqauth` was not accepted for this flow;
- the ESR identity payload required the optional permission presence byte;
- omitting that byte caused a `Read past end of buffer` decoding error;
- the paired Android session channel opened only `proton-dev://link` for the
  follow-up request, whereas passing the complete ESR through the parent
  `ProtonLink` transport returned a signed response.

The attached technical report contains the environment, package versions,
sanitized evidence, minimal integration flow, reproduction steps, observed
response shape, and specific questions for your engineering team. It contains
no PIN, private key, access token, application secret, or signature value.

We would be grateful for confirmation of the officially supported React Native
Android pattern for a non-broadcast ownership or identity proof. In particular,
we need guidance on whether this flow should use `link.transact`,
`session.transact`, `link.identify`, `SigningRequest.identity`, or another API;
which package versions are mutually compatible; and whether you can provide a
maintained Android example that demonstrates pairing, sign-only approval,
callback handling, and server-side verification.

GCSC is an ambitious project, but we are deliberately implementing its trust
boundaries conservatively. We do not want to weaken ownership verification or
mistake wallet pairing for authorization merely to make the interface appear to
work. A supported integration pattern from Metallicus would help us implement
this correctly and would likely be useful to other XPR developers building
mobile applications with strong authentication requirements.

Thank you for reviewing the attached material. We are available to provide
additional sanitized logs, a minimal reproduction repository, or a video of the
device flow if your engineering team requires them.

Sincerely,

Serhiy
Founder, Global Construction Smart Contract (GCSC)
GitHub: https://github.com/Melxisedek75/gcsc-smart-contractor

