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

## Founder decisions before live payments

1. Exact fixed USD access price and tax/receipt presentation.
2. Maximum number of buyers per project and whether/when contact is revealed.
3. Contractor eligibility (documents and verification state) before purchase.
4. Refund and cancellation rules, including project withdrawal and platform
   failure; the future 50/50 auction rule is not the default here.
5. Approved payment provider/account, operating entity, support channel and
   terms of service. No production charge until these and L10-L13 pass.
