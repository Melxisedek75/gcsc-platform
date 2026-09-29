# GCSC marketing claim ledger

Status: local October candidate, 2026-09-29. This ledger is a publication gate,
not permission to deploy. Recheck against the exact release SHA and live domains.

## Inventory

| Asset | Current role | Open check |
| --- | --- | --- |
| `index.html` and `site.css` | Pilot landing page and CTA to `gcsc.store` | Visual, keyboard, mobile and claim review on an approved preview |
| `whitepaper.html` and `whitepaper.css` | Historical v1.3 strategy draft | Owner and legal approval; v1.4 internal draft is not substituted |
| `assets/renovation-hero-v1.png` | Generated concept photograph, not a customer case study | Verify image rights and disclose illustrative use where needed |
| `VIDEO-PRODUCTION.md` | Scripts and acceptance criteria only | Film assets, rights, captions and user comprehension tests |
| `VIDEO-SCRIPTS-A-B.md` | Two local creative directions for a hero loop and explainer | Founder selection, animatic, fact-check and rights review; no video exists |
| `CNAME` | Intended `xprnet.org` domain | DNS and publication authorization, without changing the live site |

## Claims allowed in the local candidate

| Claim | Status and basis | Public wording boundary |
| --- | --- | --- |
| GCSC is building SmartContractor | In development. The monorepo contains web and API candidates; no October release acceptance yet. | "Building" or "pilot in development", never "available now". |
| A homeowner can describe a project and review a draft | Backend create and local owner-only publish tests pass; web candidate builds. Editing, AI and real-DB/browser acceptance are open. | Describe as intended pilot journey, not a completed customer service. |
| Contractors see a privacy-safe opportunity preview | Redacted API candidate passes local Jest; client candidate does not render private address. Separate branches have not been integrated or tested on real PostgreSQL. | Say "designed to show a preview" until integrated acceptance. |
| A contractor can buy lead access and submit a proposal | Project-specific entitlement, Checkout webhook and client journey are not implemented. Existing generic XPR lead token is not a substitute. | Future/pilot plan only. No purchase button or price claim. |
| AI and voice help prepare editable drafts | Provider, consent, privacy review and E2E are open. | Planned; no demonstration as a live feature. |
| GCSC will offer escrow, loans, token returns or automated settlements | Legal/provider/security gates are open. | Future research only; no financial offer, guaranteed result or live-use claim. |
| Hero photo shows construction participants | AI-generated illustrative concept, not documentary footage. | Never use as testimonial, customer evidence or real project proof. |
| Video demonstrates the product | Only script and storyboard exist. | No assertion that video exists or that depicted transaction is real. |

## Required release review

1. Check every CTA against an accepted owner/contractor route on the final
   `gcsc.store` preview. The root link alone is not proof of the journey.
2. Have product, legal and an independent reviewer classify every headline,
   frame, caption and on-screen transaction as `available`, `pilot` or `planned`.
3. Verify domain ownership, privacy/terms/support details, accessibility,
   consent and media licenses before any public campaign or registration.
4. Replace this local evidence with exact SHA, test environment, screenshots,
   video file checksums and approval record before deployment.
