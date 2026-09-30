# GCSC marketing claim ledger

Status: local October candidate, 2026-09-30. This ledger is a publication gate,
not permission to deploy. Recheck against the exact release SHA and live domains.

## Inventory

| Asset | Current role | Open check |
| --- | --- | --- |
| `index.html` and `site.css` | Pilot landing page; primary CTAs target candidate account access `https://gcsc.store/#/dashboard`, role links add `?role=homeowner` or `?role=contractor`, and the footer links to platform home | Verify both role journeys on an approved preview, then visual, keyboard, mobile and claim review |
| `whitepaper.html` and `whitepaper.css` | Historical v1.3 strategy draft, marked `noindex` | Owner and legal approval; v1.4 internal draft is not substituted. `noindex` is not access control |
| `assets/renovation-hero-v1.png` | Generated concept photograph, not a customer case study | Verify image rights and disclose illustrative use where needed |
| `VIDEO-PRODUCTION.md` | Scripts and acceptance criteria only | Film assets, rights, captions and user comprehension tests |
| `VIDEO-SCRIPTS-A-B.md` | Two local creative directions for a hero loop and explainer | Founder selection, animatic, fact-check and rights review; no video exists |
| `CNAME` | Intended `xprnet.org` domain | DNS and publication authorization, without changing the live site |
| `sitemap.xml` and `robots.txt` | Local homepage-only discovery candidate | Verify final domain, hosting root and indexability before deploy; the historical draft stays out of the sitemap but remains crawlable so its `noindex` can be read |

## Claims allowed in the local candidate

| Claim | Status and basis | Public wording boundary |
| --- | --- | --- |
| GCSC is building SmartContractor | In development. The monorepo contains web and API candidates; no October release acceptance yet. | "Building" or "pilot in development", never "available now". |
| A homeowner can describe a project and review a draft | Backend create and local owner-only publish tests pass; web candidate builds. Editing, AI and real-DB/browser acceptance are open. | Describe as intended pilot journey, not a completed customer service. |
| Contractors see a privacy-safe opportunity preview | Redacted API and client work exists in separate branches. RIVIERA reproduced full project disclosure in publication `5166e59f`; that target is not a privacy-safe preview. | Say "designed to show a preview" and explicitly state that this flow is still being developed and tested. Do not release this journey until reviewed API and web dependencies pass combined acceptance. |
| A contractor can buy lead access and submit a proposal | Project-specific entitlement, Checkout webhook and client journey are not implemented. Existing generic XPR lead token is not a substitute. | Future/pilot plan only. No purchase button or price claim. |
| AI and voice help prepare editable drafts | Provider, consent, privacy review and E2E are open. | Planned; no demonstration as a live feature. |
| GCSC will offer escrow, loans, token returns or automated settlements | Legal/provider/security gates are open. | Future research only; no financial offer, guaranteed result or live-use claim. |
| Hero photo shows construction participants | AI-generated illustrative concept, not documentary footage. | Never use as testimonial, customer evidence or real project proof. |
| Video demonstrates the product | Only script and storyboard exist. | No assertion that video exists or that depicted transaction is real. |

## Required release review

Local regression check: `node apps/marketing/validate-static.mjs` from the
monorepo root (or `node validate-static.mjs` here). Requires an existing Python
3.9+ executable (`python` on Windows, `python3` elsewhere), using only standard
HTML/XML/URL parsers. It installs nothing and makes no network requests.
`node apps/marketing/validate-static.mjs --test` runs the negative/positive
fixtures in memory. Checks cover local references/anchors, unsafe URL schemes,
duplicate IDs, real account-link elements (not comments), canonical/social
metadata, crawlability, draft `noindex` and the homepage-only sitemap. These
focused checks are not a full HTML5 validator, CI result or receiving-app test.
For the current two publicly crawlable pages, any nonempty `Disallow` or wildcard
rule fails closed and requires a separate policy review. The validator does not
pretend that Python's first-match robots parser implements crawler specificity.

Optional local browser regression: `node apps/marketing/verify-browser.cjs`.
It requires an already installed Playwright and browser; it never downloads
either. Set process-local `NODE_PATH` to an existing Playwright package directory
if it is outside the checkout. `GCSC_BROWSER_CHANNEL=msedge` selects installed
Edge instead of bundled Chromium. It opens only local files, blocks HTTP(S),
disables page JavaScript, and saves screenshots/results in `.tmp/marketing-browser`.
The matrix covers 320/360/390/768/844/1440/1920 px, simulated 200% text scaling,
hero bounds, horizontal overflow, image loading, mobile navigation and two focus
states plus dark hover contrast. Text scaling is not browser zoom or screen-reader
acceptance. A successful run is not full WCAG, performance or live-domain approval.

1. Check every CTA against an accepted owner/contractor route on the final
   `gcsc.store` preview. The `/#/dashboard` target follows the current web
   candidate's `HashRouter`, `Dashboard` route and unauthenticated
   `AccountAccess` rendering. Role preselection exists in the separate October-web
   candidate `2409c780`; it is absent from publication `5166e59f`, where an owner
   link still defaults to contractor registration. This remains a blocking
   integration dependency, not a completed role journey. Once integrated, a role
   hint must only preselect a form, never grant eligibility or authorization.
   Code inspection is not live-domain or browser acceptance. The footer root link
   alone is not proof of the journey.
2. Have product, legal and an independent reviewer classify every headline,
   frame, caption and on-screen transaction as `available`, `pilot` or `planned`.
3. Verify domain ownership, privacy/terms/support details, accessibility,
   consent and media licenses before any public campaign or registration.
4. Replace this local evidence with exact SHA, test environment, screenshots,
   video file checksums and approval record before deployment.
