# GCSC October video shot list

Status: production brief, 2026-09-29. No footage, narration, music license or
video export has been approved. Pair with `VIDEO-PRODUCTION.md` and
`CLAIM-LEDGER.md`; neither document authorizes third-party upload or spend.

## Film A: silent hero loop

| ID | Duration | Frame and action | Mobile crop / transition | Asset and rights |
| --- | --- | --- | --- | --- |
| H1 | 0-3s | Wide, daylight renovation site. Owner and contractor stand to the right, inspecting the unfinished room. | Keep the center-right subjects within portrait crop; opening frame must match H4 for a clean loop. | New staged footage or licensed generated video; location and likeness approval pending. |
| H2 | 3-6s | Close detail of a plan with a hand indicating a real scope choice. No address, customer name or price on paper. | Keep the marked area central. Cut on hand movement. | Synthetic plan and model release pending. |
| H3 | 6-9s | Contractor measures an opening, notes a dimension, and shares the observation with the owner. | Measurement remains legible at 390px; no implied certification. | Tool/footage rights pending. |
| H4 | 9-12s | Return to the original wide position and light; both look back at the room. | Hold the final frame long enough for the loop; no animated logo over the people. | Match H1 setup. |

No on-video copy, voice or sound. The HTML H1 and CTA carry the message.
Poster: `assets/renovation-hero-v1.png` is generated concept imagery, never
documentary proof of a customer. Require a still poster fallback for reduced
motion, low-data connections and failed video loads.

## Film B: 70-second explainer

| ID | Time | Frame / source | Voiceover and on-screen copy | Gate |
| --- | --- | --- | --- | --- |
| E1 | 0-8s | Owner in a real-looking unfinished room, comparing notes and photos; no private documents visible. | VO: "A home project often starts with an idea, but not a clear brief." Copy: "The first step should be clearer." | Location/performer rights. |
| E2 | 8-17s | Contractor sees an incomplete scope, then pauses before giving a number. | VO: "Contractors need useful context before they can respond well." Copy: "Context before a quote." | Do not imply this person is a platform contractor. |
| E3 | 17-30s | Accepted product capture: owner enters a request, reviews and changes a draft, then chooses publish. | VO: "SmartContractor is designed to help turn a description into a request you can review." Copy: "Review before sharing." | Real preview E2E on exact SHA; otherwise label all UI frames "Concept". No AI claim unless L14-L17 pass. |
| E4 | 30-43s | Contractor sees a privacy-safe preview; show access terms only if test-mode purchase and entitlement pass. | VO: "A contractor can evaluate an opportunity before requesting access." Copy: "A preview that respects privacy." | No fake paid badge or receipt. |
| E5 | 43-57s | Contractor edits a proposal; owner reads it in their account. | VO: "The proposal stays a human decision, with the scope in view." Copy: "A proposal you can consider." | Real UI/DB acceptance required; otherwise concept-labelled storyboard. |
| E6 | 57-70s | Return to worksite; GCSC name and a direct platform URL. | VO: "GCSC. A clearer start for construction projects." Copy: "SmartContractor pilot in development" and `gcsc.store`. | Verify route and domain before release. |

Keep a 2-second reading hold on the final URL. Record a version with no
voiceover for caption-only viewing. Burn no captions into the footage; export
an editable English VTT file and test contrast against every frame.

## Delivery and approvals

- Master: 16:9 and portrait-safe 9:16 compositions. Do not simply center-crop
  UI text; recompose captures for mobile. Target 1080p master, then optimize
  separate web variants after measuring playback and bandwidth.
- Exports: muted 10-12s hero loop, controlled 60-75s explainer, poster, VTT,
  source project, checksums, dimensions, duration and rights manifest.
- Every live screen capture needs environment, commit SHA, synthetic account
  identities and a redaction check for addresses, email, documents, keys and
  transaction IDs. Do not show a wallet signature, payment success or escrow
  release unless that exact action was independently accepted.
- Founder approves brand, factual copy and selected video provider. Legal
  reviews claim/rights/consent. Product and QA confirm all depicted features
  against the accepted preview; two new viewers explain the film without help.
- Current asset state: only the generated still poster and this script exist.
  Performer, location, music, voice and footage rights are **not cleared**.
