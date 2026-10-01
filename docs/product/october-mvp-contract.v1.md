# SmartContractor October MVP contract v1

Status: implementation proposal, 2026-09-28. This is not a live payment,
privacy certification, provider approval or authorization to deploy. The
single execution backlog is `docs/migration/CHECKLIST.md` (L03, L05-L17).

## Release boundary

The October web pilot has two roles. A homeowner creates a free draft, edits
an optional AI-assisted brief and explicitly publishes it. A contractor sees
only a safe opportunity preview, pays a fixed USD fee for access to that
particular project if eligible, edits an optional AI-assisted proposal and
explicitly submits it. The homeowner can read the proposal. Email/password
works without a wallet. No escrow, loan, token staking or construction-payment
settlement is needed for this first journey.

The future Priority Access auction in `priority-access-marketplace.md` is a
different version: competitive XPR offers, an exclusive window and a possible
50% unsuccessful-proposal refund. Do not route October Checkout through that
state machine or advertise those future economics as active.

## Data and authorization

| Object | Allowed reader | Fields and constraints |
| --- | --- | --- |
| Draft project | Active owning homeowner only | Full title, description, exact address, contact, attachments, budget and timing. Drafts never appear in public search or caches. |
| Published preview | Anyone, including anonymous users | ID, canonical trade/category, broad service area (not raw address/ZIP+house), budget range, approximate timing, publication date. Never free-text title/description, contact, exact location, document links or proposals. |
| Full published project | Owning homeowner; contractor with a current `paid` project-specific entitlement | Full allowed details. Contact and attachments require a separate explicit disclosure policy; do not infer permission from a JWT role or a generic lead token. |
| Contractor document | Owning contractor and authorized reviewer only | Stored privately, scanned and size/type checked; verification status separate from upload status. No file URL in public profile or preview. |
| Work proposal | Owning homeowner and its contractor author | Scope, price, schedule, assumptions, revisions and status. Never returned from a public project GET. |
| Purchase record | Buyer and authorized operations only | Project ID, contractor ID, provider checkout/payment IDs, policy/price version, amount/currency, status and audit timestamps. No payment secret in client response. |

The server, not the browser, decides a project's publication state, price,
eligibility, entitlement and redaction. A published preview may be cached;
drafts, full details, receipts, contact and proposals are private and must not
enter public logs, analytics or shared caches. Filtering must operate only on
public preview fields. A raw `location` query against private addresses is a
search oracle and must be rejected until a separate safe service-area field is
stored. The current API privacy candidate intentionally uses an allowlisted
category and omits broad area because that field does not yet exist.

## States and transitions

Project: `draft -> published -> paused | closed`. Only the active owner may
create/edit/publish/pause. Publishing is free in the October contract; the
existing XPR `job-posting` payment route must not be silently required by the
new web flow. Unpublished or paused records are unavailable to public search.

Lead access: `unpaid -> pending -> paid`, with terminal `failed`, `expired`,
`refunded`, `revoked`. A Checkout redirect never grants access. A signed and
idempotently processed provider webhook plus durable database transaction is
the minimum source of `paid`. One `(project_id, contractor_id)` entitlement
record is unique; duplicate callbacks do not create another grant or charge.
Refund/revocation removes detail access and blocks new proposals; already
submitted proposals and audit history remain reviewable to authorized parties.

Proposal: `draft -> submitted -> accepted | rejected | revision_requested`.
The AI may produce a draft but never publish, pay, sign or submit on behalf of
the human. An owner decision does not automatically open escrow or transfer
funds in the October release.

## API proposal and consumer changes

| Capability | Candidate API shape | Current gap |
| --- | --- | --- |
| Create/save draft | `POST /api/projects`, `PATCH /api/projects/:id` | Current POST creates an `open` row; no draft-edit route or separate safe preview fields. |
| Publish/pause | `POST /api/projects/:id/publish`, `POST /api/projects/:id/pause` | Current `job-posting` payment publishes; October free publish needs owner-only transition. |
| List/read preview | `GET /api/projects`, `GET /api/projects/:id` | Current candidate leaks full private fields; backend privacy patch is local/unreviewed. |
| Read full detail | `GET /api/projects/:id/details` | New entitlement check required for a paid contractor; owner can use existing private route only if role/ownership checked. |
| Start purchase | `POST /api/projects/:id/access-checkout` | Must use server-side USD price version and unique idempotency key; current generic XPR `lead-token` has no project binding. |
| Confirm purchase | Provider webhook, then `GET /api/projects/:id/access` | Current Stripe test PaymentIntent is for escrow, not lead purchase. No grant on success URL alone. |
| Create proposal | `POST /api/projects/:id/proposals` | Current `POST /api/bids` allows a contractor to submit without paid access. |
| Read/respond to proposal | Owner-only `GET /api/projects/:id/proposals`, versioned response route | Current public `GET /api/projects/:id` includes bids; remove that exposure. |
| AI draft | Owner/contractor draft endpoint bound to allowed input | No public PII to third-party AI; user edits and confirms every output. |

Names above are proposed contract names, not a claim that routes exist.
`apps/web/src/services/api.ts`, owner/contractor views and mobile consumers
must be updated in their own lanes after the shared response shapes are frozen.
Do not reintroduce private `title`, `description` or `location` into a public
Project Type to make existing cards render. Show canonical trade, safe area,
budget and timing instead.

`fixtures/october-project-v1.json` is the synthetic field-level example for
the current local draft and redacted-preview candidates. Its public key list
is an allowlist, not an invitation to return all other stored columns. The
fixture does not yet specify a paid entitlement or a purchase response; those
must be versioned after L08/L10 decisions, then consumed by server and web
tests before L03 can be closed.

## Failure behavior and acceptance

- An anonymous or unpaid account cannot retrieve a draft, address, contact,
  attachment, proposal or full description through any API route, error,
  cache, search parameter or analytics event.
- A contractor cannot submit a proposal without a current paid entitlement
  tied to the same project and contractor. A receipt for another project or
  account has no effect.
- Checkout amount, currency, project and policy version are immutable from
  server creation through webhook. Duplicate, delayed and out-of-order events
  are reconciled without double grant or double charge.
- A failed provider, declined payment, expired session or AI outage leaves
  drafts intact and tells the user what remains pending. No silent broadcast
  retry or fake success state.
- Email/password paths pass for a new homeowner, a new contractor and an
  existing account without WebAuth. Wallet-first remains separate testnet work.
- Repeat the journey on desktop and Android Chrome with an isolated real
  PostgreSQL instance, then independent security review of the exact SHA.
  JSON/mocked-PG tests are useful but cannot close the release gate.

## Local paid-brief implementation, 2026-09-30

The backend candidate now implements the proposed
`GET /api/projects/:id/details` path. This is a read-only local capability,
not a checkout or a mechanism for creating a `paid` grant. Exact source,
tests, independent review and limitations are recorded in
`../migration/PAID-PROJECT-DETAILS-REVIEW.md`. The earlier capability table is
the original gap inventory; a local implementation does not close its release
gates or mean this code is in publication.

- An active owning homeowner reads the stored project, including its own draft.
- A contractor must have a current active contractor role matching the JWT and
  a `paid` grant for the exact buyer/project with provider reference and verified
  timestamp. Only published, open projects with no escrow qualify for this path.
- A contractor response is `{ project }`, with exactly `id`, `title`,
  `description`, `category`, `budget_min`, `budget_max`, `timeline_days`, `status`
  and `published_at`. It does not include structured address/contact, attachments,
  owner identity, proposals, payment metadata or arbitrary future columns.
- `title` and `description` are private owner-supplied brief text, not a PII
  scrubber's output. If an owner types an address/phone there, this endpoint does
  not remove it. Clear pre-publication disclosure/consent and the contact policy
  remain launch gates; do not claim all contact information is automatically hidden.
- No valid JWT returns 401. An authenticated request with no current permission,
  an invalid ID, an unavailable project or no matching grant returns the same
  404 `project_details_unavailable` without private data. Responses use
  `Cache-Control: private, no-store` and vary by Authorization and Origin.
- Public preview endpoints do not expand their fields because a grant exists.
  The existing accepted-contract legacy routes are not replaced by this endpoint.

The UI consumer is implemented in receiving merge `874153d9`, with independent
source review and actual local API/UI/PostgreSQL journey `FuE0Vg` passing five
checkpoints. Its runtime matches reviewed October-web `b1cda59b`. This receiving
candidate is included in local publication `d613c440`, separate from deployed
websites. Stored synthetic grants in tests
do not establish checkout/webhook or real payment readiness. The live decisions
below still apply.

## Local Checkout foundation, 2026-09-30

`services/api/v3/database/lead-checkout.cjs` is an internal, test-mode-only
reservation/session adapter. It is not imported by HTTP routes and never calls
Stripe or issues an entitlement. The additive `project_access_purchases` table
and isolated PostgreSQL tests are the first L11 slice, not completion of L11/L12.

- The future HTTP adapter must derive the contractor from a freshly authorized
  JWT and the return origin/price policy from server configuration. Internal
  function arguments are not authenticated user input or transport DTOs. Never
  forward a browser-supplied buyer, amount, mode, origin or provider response.
- A reservation binds a UUID to one project, buyer, request key and immutable
  server-owned price version/amount in USD integer cents. The fixture's 2500
  cents is synthetic, not an approved commercial price. The stable provider
  idempotency key and fixed one-hour expiry survive process/connection retries.
- The project and fresh buyer/owner identities are locked and checked before
  reservation and session attachment. A simultaneous retry cannot create a
  second active purchase. An existing entitlement blocks another purchase until
  explicit refund/repurchase rules are implemented. Documents/verification and
  maximum buyer count remain L10 policy decisions, not implied by active role.
- The request builder uses hosted card Checkout with no free-form project text,
  contact, email or documents in provider metadata. Opaque internal IDs and price
  version are required; they are still data sent to a provider when enabled.
  Provider approval/data-transfer authorization remains necessary.
- Only a matching unpaid/open `cs_test_` session can be attached. Amount,
  currency, project, buyer, purpose, quote version, expiry, client reference,
  `livemode=false` and the hosted Stripe origin are checked against the stored
  record. This is response-shape/binding validation, not cryptographic proof of
  payment. Only a trusted future SDK adapter may call this function.
- Pending records never grant access. Redirect URLs, untrusted JSON, an expired
  local clock or a repeated create request cannot mark a purchase `paid`.
  Completed/expired responses need separate reconciliation; they are not
  silently replaced with another session or charge.
- Buyer-scoped reads hide Checkout URLs when the project/owner is unavailable,
  the purchase is no longer pending/unexpired, or a grant already exists. An
  inactive buyer cannot read the purchase. Hiding a URL does **not** expire a
  provider session someone already copied. Remote session cancellation,
  withdrawal/refund handling and late-paid reconciliation are still open L12
  requirements before any actual Checkout is exposed.

Next required layers: authenticated/rate-limited HTTP DTOs; explicit test-provider
configuration; raw-body signature verification, durable event deduplication and
atomic grant transaction; out-of-order/refund/revocation reconciliation; web
consumer and exact-source independent acceptance. No live key, session request,
webhook delivery or payment has been used for this foundation.

Reference interfaces: https://docs.stripe.com/api/checkout/sessions/create,
https://docs.stripe.com/api/idempotent_requests and
https://docs.stripe.com/webhooks. Local installed SDK remains unchanged.

## Local signed-event intake, 2026-09-30

`database/lead-checkout-events.cjs` implements a dormant L12 intake boundary,
not payment fulfillment. It calls the installed Stripe SDK's local webhook
signature helper, not a remote API, and accepts an explicit server-owned test
configuration and original raw Buffer only. There is no HTTP route or ambient
credential lookup. Unit/integration signing secrets are synthetic fixtures.

- Body is limited to 64 KiB and strict UTF-8 without BOM. Signature headers are
  bounded, require one unambiguous timestamp and valid v1 signatures, and must
  be within 300 seconds in both directions. SDK signature failures are sanitized
  so payload/header do not escape via its error object.
- Both event and session must be test-mode. Connected-account/context events,
  wrong configured API version, unsupported types, malformed IDs, wrong purpose,
  zero/noninteger amounts, currency changes and inconsistent session states fail
  closed. This slice supports `checkout.session.completed` and
  `checkout.session.expired` only; refund/dispute/async-failure handling is not
  implied. Destination event selection/version must be explicit before activation.
- A verified envelope must still match the stored purchase, buyer, project,
  immutable amount/version/currency and expiry. A signature alone cannot select
  a different quote. Future HTTP code must never accept event JSON as a trusted
  alternative to verifying the original bytes.
- The shared binding table enforces one Checkout session and one PaymentIntent
  per purchase, and prevents either provider identifier being used by a second
  purchase. Intake and attachment use the same transaction-scoped binding helper;
  valid pre-existing attachments are backfilled by the canonical migration.
- The inbox stores allowlisted references/status, an exact-body SHA-256 and
  timestamps, not raw webhook payload, customer email, signature or secret.
  Duplicate event IDs with the same digest are idempotent across reconnects and
  concurrency. A changed body with the same event ID, including formatting,
  conflicts and requires diagnosis rather than silently replacing evidence.
- Binding and event insertion roll back together. Expired/unavailable project
  events can be retained for reconciliation, and differently ordered supported
  events are retained as separate facts. Intake does not decide their final
  economic outcome: every new event is `received`, purchases remain `pending`,
  no entitlement is issued and no refund is executed.

This intake slice leaves transactional fulfillment/reconciliation to the worker
described below. Successful-refund and dispute extensions are documented below;
other lifecycle/reconciliation handling, bounded raw-body HTTP parsing and
provider test-mode delivery remain open. The helper body
limit does not yet constrain HTTP request buffering because it is not wired to
a route. The old escrow webhook is separate and has not gained these guarantees.
No live Checkout may be enabled before those layers and independent acceptance.

## Local atomic fulfillment and consumer boundary, 2026-09-30

Independently reviewed local publication candidate `d7709d02` adds internal
`fulfillLeadCheckoutEvent(pool, eventId)`. It is not an HTTP endpoint and must
never be exposed as a browser command to mark a purchase paid. It consumes only
an inbox fact previously authenticated by the signed-event intake. Stored quote,
mode, session/intent binding, current project and buyer/owner roles are rechecked
under locks. Grant, purchase, event outcome and audit commit together.
Evidence and remaining limits: `../migration/LEAD-FULFILLMENT-REVIEW.md`.

The following is the consumer/state contract for the next HTTP/UI slice, not a
claim that a purchase endpoint, background scheduler or provider adapter exists:

| Stored state or result | Consumer meaning | Forbidden shortcut |
| --- | --- | --- |
| Purchase `pending` | Awaiting confirmed processing; a currently eligible buyer may receive its server-approved hosted URL | Never unlock a project from a return URL, local timer or client `paid` flag |
| Purchase `paid` | Payment processing succeeded; request current permission from the private details/access API | Never cache permanent access from a historical payment receipt |
| Purchase/event `review_required` | The platform must reconcile the payment; hide checkout and do not offer a second payment for the same unresolved purchase | Do not claim a decline/refund, issue a new charge, or grant details |
| Purchase `expired` | This verified unpaid session ended; a new reservation must recheck current eligibility | Never revive the old purchase on a late callback |
| Entitlement `refunded` or `revoked` | Current private-detail/new-proposal access is absent | A duplicate paid event must not restore access |
| Processed event replay | Return the durable processing receipt without another grant or audit | Receipt outcome `paid_granted` is historical, not a current permission decision |

An event can require reconciliation while its purchase remains terminal or paid.
For example, a late paid event for an expired purchase must not displace a newer
pending purchase; an inconsistent fact must not automatically revoke an already
granted entitlement. Operations must inspect unresolved events as well as
purchase status. The current worker records the hold but does not resolve it.

Processing after the quote's expiry is conservatively held, even for a timely
provider timestamp. Both paid and expired facts already queued before a decision
also produce a hold regardless of processing order. Older inbox rows without a
verified quote snapshot are not backfilled or auto-granted. No held row may be
resolved by manually setting `paid` outside the forthcoming audited reconciliation
transaction. Future resolution needs provider evidence plus current eligibility;
refund eligibility and automatic actions still need the decisions below.

Future buyer DTOs must allowlist display fields and derive the buyer from current
authentication; do not serialize database rows. Inbox IDs, raw digests, binding
snapshots, audit internals, provider credentials and arbitrary metadata are not
browser inputs or proof of payment. Every purchase/detail response is private
and non-cacheable. The old escrow endpoint remains separate from lead purchase.

## Local successful-refund observations, 2026-10-01 UTC

Independently reviewed, locally integrated `980225e3` extends the dormant internal
intake/worker. Evidence: `../migration/LEAD-REFUND-REVIEW.md`. This does not
add a refund command, purchase HTTP route or provider connection, and does not
approve a refund policy. Only signed test-mode `refund.created`/`refund.updated`
events with Refund status `succeeded` are supported in this slice.

| Verified observation | Persisted result | Consumer boundary |
| --- | --- | --- |
| One refund equals the original immutable quote | Exact original entitlement and purchase become `refunded`; event and audit commit together | Details and new proposals are no longer authorized; do not promise bank settlement |
| Refund is less than the quote | Exact original entitlement becomes `revoked`; an active purchase and the event require review | Access is suspended; do not claim a full refund, sum partial events, request another charge or restore access automatically |
| Same processed event again | Durable receipt only, no new grant or audit | A historical paid receipt must not restore current permission |
| Refund for an older/different entitlement or superseded purchase | Event held for reconciliation; replacement grant is untouched | Do not revoke another purchase's access |
| Refund already queued before initial fulfillment | No initial paid grant, regardless of worker order | Await reconciliation/refund processing, not redirect success |
| Signed event timestamp is ahead of the database clock | Worker returns retryable `lead_fulfillment_event_not_due`; transaction rolls back and the inbox stays `received` | Future worker must retry with bounded backoff after the timestamp becomes due; do not finalize as review, claim refund completion or grant early |

Refund metadata never chooses the purchase. An existing unique test PaymentIntent
binding, immutable quote, refund-ID binding and timestamps must agree. Unknown
PaymentIntent, including a refund delivered before its Checkout binding exists,
is rejected before persistence. Durable unresolved delivery/retry/reconciliation
is still required; arbitrary provider event ordering is not yet supported.

The local actual-API fixture covers both full and partial refund: previously
authorized private details become 404 and a new proposal is denied with
`project_access_required`; the existing proposal remains stored. Already copied
data cannot be recalled from a buyer's device. The new consumer must discard
cached private details on loss of authorization, not trust its old receipt.

Pending/failed/canceled refunds, later failure after a succeeded observation,
asynchronous payment outcomes and held-event resolution are separate open gates.
The next section narrows dispute handling to exact bound observations only.
No automatic regrant, refund request or inference of the future
50/50 auction economics. This slice does not enable real payments or prove
provider/browser end-to-end delivery. L11/L12 and the decisions below stay open.

## Local dispute observations, 2026-10-01 UTC

Independently approved candidate `a9479e96` is locally integrated, still dormant.
Evidence: `../migration/LEAD-DISPUTE-REVIEW.md`. It adds only dormant signed
test-mode `charge.dispute.created`/`updated`/`closed` observations; it cannot
create a dispute, submit evidence, contact a provider or move money. Existing
card-only Checkout policy is unchanged.

| Verified observation | Persisted result | Consumer boundary |
| --- | --- | --- |
| Bound dispute with any supported status | Exact entitlement becomes `revoked`; active purchase/event require review; audit is atomic | Hide private details and refuse new proposals; do not charge again while unresolved |
| `won`, `lost` or `warning_closed`, including an older snapshot | Same conservative hold, never an automatic regrant | Do not claim settlement or restored access based on status alone |
| Dispute queued before initial paid fulfillment | No initial grant in either worker order | Await processing/reconciliation, not browser-return success |
| Superseded purchase or different entitlement | Hold event for reconciliation, leave replacement access untouched | Never revoke another purchase's entitlement |
| Already fully refunded | Full-refund state preserved, event retained for review | Never downgrade a refund to a pending or paid state |
| Future event | Existing retryable `lead_fulfillment_event_not_due`, original received fact unchanged | Retry only when due with future bounded worker; no automatic finalization |

Metadata cannot select the purchase. Existing unique PI/quote binding and an
immutable dispute tuple must agree. Only USD amounts up to the quote and the
seven statuses in installed Stripe 17.7.0 are accepted. The internal inbox
`payment_status='unpaid'` is a non-grant marker on negative observations, not a
customer-facing assertion that the original payment failed or was never made.

Unknown intents, null/expanded references, amount/currency differences,
unsupported statuses (including `prevented`) and `funds_withdrawn` or
`funds_reinstated` events remain unhandled before activation. Even a valid known
won/closed event cannot resolve a previous hold; the evidence-driven resolution
path is separate work. This local restriction is not an approved live dispute
policy. The actual API fixture proves details/new-bid denial after the hold,
not provider delivery, browser cache invalidation or live payment acceptance.
L11/L12, HTTP/provider activation and founder decisions remain open.

## Founder decisions before live payments

1. Exact fixed USD access price and tax/receipt presentation.
2. Maximum number of buyers per project and whether/when contact is revealed.
3. Contractor eligibility (documents and verification state) before purchase.
4. Refund and cancellation rules, including project withdrawal and platform
   failure; the future 50/50 auction rule is not the default here.
5. Approved payment provider/account, operating entity, support channel and
   terms of service. No production charge until these and L10-L13 pass.
