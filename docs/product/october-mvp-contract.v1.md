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

## Founder decisions before live payments

1. Exact fixed USD access price and tax/receipt presentation.
2. Maximum number of buyers per project and whether/when contact is revealed.
3. Contractor eligibility (documents and verification state) before purchase.
4. Refund and cancellation rules, including project withdrawal and platform
   failure; the future 50/50 auction rule is not the default here.
5. Approved payment provider/account, operating entity, support channel and
   terms of service. No production charge until these and L10-L13 pass.
