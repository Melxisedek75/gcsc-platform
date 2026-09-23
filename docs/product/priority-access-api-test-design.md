# Priority Access API test design

Date: 2026-09-22 PT

Status: `SPEC ONLY`. This file defines future acceptance tests. It does not
enable an API, settlement, wallet signature, smart contract or live asset.

Contract fixture: `priority-access-contract.v1.json`.

## Boundary

The API must keep `access_offer` and `work_proposal` as separate resources.
Money fields use integer minor units and an explicit asset/network. Every state
change carries actor, policy version, server timestamp, idempotency key and an
append-only audit event.

## Required acceptance cases

| Area | Case | Expected result |
| --- | --- | --- |
| Preview privacy | Unauthenticated or eligible contractor reads preview | Only trade, broad area, budget range, timing, size and credential requirements; no address/contact/evidence |
| Eligibility | Unverified, wrong-role or suspended actor submits offer | Rejected before payment challenge |
| Challenge | Eligible contractor creates offer | Bounded amount, asset, network, recipient, memo, policy version, expiry and idempotency key |
| Receipt | Wrong chain/account/recipient/amount/memo or replayed tx | Rejected; no valid offer or grant |
| Finalization | Two finalizers race on the same round | One transaction wins and creates exactly one active grant |
| Grant privacy | Non-holder reads full opportunity | Denied even if that contractor submitted an offer |
| Proposal | Holder submits a complete versioned proposal in time | One immutable proposal revision enters homeowner review |
| Expiry | Window expires without compliant proposal | Grant closes and exactly one new round may open |
| Award | Homeowner accepts holder proposal | Opportunity closes; settlement is 0% refund and 100% platform allocation |
| Rejection | Compliant proposal is not awarded | Exactly one 50% refund and one 50% platform allocation |
| Failure | Access was never delivered | Exactly one 100% refund and 0% platform allocation |
| Duplicate callback | Settlement/refund callback repeats | Same receipt/outcome returned; no second grant, refund or revenue record |
| Moderation | Reopen threshold or abuse signal is reached | Opportunity enters moderation hold and no new paid round starts |

## PostgreSQL transaction tests

Future implementation must prove in a real disposable PostgreSQL database:

1. `finalize round + issue grant + audit` is one transaction.
2. `close grant + record proposal outcome + allocate/refund + audit` is one
   idempotent transaction.
3. Unique constraints reject double active grants, duplicate receipts, duplicate
   outcomes and duplicate reopen transitions under concurrent requests.
4. API/process restart preserves rounds, grants, proposals and idempotency keys.
5. A failed audit insert rolls back the entire state transition.

## Client contract tests

Web and Android must render the same challenge fields before any user-controlled
signature. Cancellation, timeout, wrong network/account, late callback and
duplicate callback remain explicit non-success states. Access fee must never be
shown as the construction price or milestone escrow.

## Activation gates

Implementation remains disabled until database/API design review. Live settlement
also requires legal/economic/security review, provider and treasury decisions,
refund reserves, secrets, external accounts and separate founder approval.
