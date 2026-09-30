# GCSC October film scripts: two creative directions

Status: local scripts for L19a, 2026-09-29. Neither direction is approved,
produced, licensed or cleared for public use. Pair with `VIDEO-SHOT-LIST.md`,
`VIDEO-PRODUCTION.md` and `CLAIM-LEDGER.md`. Both films describe a pilot in
development, not a completed customer workflow.

## Direction A: The brief

The homeowner's uncertainty leads the story. Visual rhythm moves from an
unfinished room to a specific, written scope. No actor is presented as a real
SmartContractor user.

### A1: silent hero loop, 12 seconds

| Time | Picture | Production instruction |
| --- | --- | --- |
| 0-3s | Bright, unfinished room. An owner looks from the room to a rough sketch. | Stage with cleared location and performer rights. Hold subjects right of the HTML headline. |
| 3-6s | Close-up: the owner circles one problem area on a synthetic floor plan. | No address, name, cost or project identifier on paper. |
| 6-9s | A contractor measures that area and adds a short note beside the circle. | Show observation, not approval, certification or a quote. |
| 9-12s | Same wide angle and light as the first frame; both look back at the room. | Match movement into the opening frame for a seamless muted loop. |

No words, UI, audio, logo or CTA are baked into the footage. The real HTML
headline and button remain readable at 390px and desktop widths. The generated
still `assets/renovation-hero-v1.png` remains the poster fallback.

### A2: explainer, target 67 seconds

| Time | Picture | Narration | On-screen copy |
| --- | --- | --- | --- |
| 0-9s | Owner with a rough sketch in an unfinished room. | "Most home projects begin with a clear need, but not yet a clear description of the work." | A better starting point |
| 9-19s | Contractor compares a few incomplete notes with the actual space. | "And a contractor needs enough context before deciding how to respond." | Context matters |
| 19-34s | Storyboard of a homeowner describing and revising a request. Use real product capture only after owner create/edit/publish passes preview E2E. | "We are building SmartContractor to help turn that first description into a request the homeowner can review before sharing." | A request you control |
| 34-46s | Privacy-safe opportunity preview. If the route is not accepted on the exact build, show a static concept frame labeled Concept. | "Contractors would see a useful preview without exposing private project details to everyone." | Preview before details |
| 46-58s | Contractor drafting a response on paper, not a fabricated in-app success state. | "From there, the next step is a proposal shaped by the actual scope, and a decision made by people." | A considered proposal |
| 58-67s | Return to the room; GCSC name, pilot status, and platform address. | "Global Construction Smart Contract. Building a clearer start for construction projects." | SmartContractor pilot in development / gcsc.store |

The final address holds for at least two seconds. English captions are a
separate editable VTT; the video never autoplays with sound.

## Direction B: The response

The contractor's need for reliable context leads the story. It differs from
Direction A in viewpoint and pacing, not in claims or feature scope.

### B1: silent hero loop, 10 seconds

| Time | Picture | Production instruction |
| --- | --- | --- |
| 0-2.5s | Contractor enters a bright renovation site and pauses at an unfinished opening. | Stage with clear light and a right-weighted composition. |
| 2.5-5s | Close-up of a synthetic work brief: trade, broad scope and timing only. | Do not show contact, address, price, wallet or paid badge. |
| 5-7.5s | Contractor checks the opening with a tape and makes one note. | No implied inspection certificate or accepted job. |
| 7.5-10s | Return to the same opening and camera move as the first shot. | Match first/last motion and leave left-side negative space for live HTML text. |

No baked-in text or sound. If portrait crop loses the measurement or makes the
headline illegible, use Direction A's poster instead of forcing this loop.

### B2: explainer, target 63 seconds

| Time | Picture | Narration | On-screen copy |
| --- | --- | --- | --- |
| 0-8s | Contractor receives vague notes, looks at the site and cannot yet estimate scope. | "A request without context can leave both sides guessing." | Less guessing |
| 8-18s | Owner identifies one desired change and adds a note to a synthetic plan. | "The homeowner knows what needs to change. The first challenge is explaining it clearly." | Start with the work |
| 18-31s | Concept-labeled storyboard of a request being drafted, revised and published. Substitute exact-build capture only after acceptance. | "SmartContractor is being built to make that first request easier to prepare and review." | Review before sharing |
| 31-43s | Safe opportunity preview on a concept-labeled card or accepted product capture. | "A contractor should be able to understand the opportunity before asking for more detail." | Useful, privacy-safe context |
| 43-54s | Contractor writes a proposed scope, schedule and questions; owner reads a printed draft. | "A useful response is not just a number. It is a plan people can discuss." | A proposal to consider |
| 54-63s | Back to the bright worksite, then a restrained GCSC end slate. | "GCSC. Building a clearer path from project idea to proposal." | SmartContractor pilot in development / gcsc.store |

## Selection and release gates

1. Founder chooses one direction after a low-cost animatic. No provider credits
   or third-party footage upload are authorized by this script.
2. Two viewers unfamiliar with GCSC explain what the pilot does now and what
   remains planned. If either believes payment, escrow, wallet signing, voice
   AI or automated estimates are already live, revise the film before export.
3. Product and QA approve every captured UI frame against its exact SHA and
   synthetic account. Unaccepted paths remain visibly labeled Concept.
4. Clear location, performer, voice, music and generated-media rights. Check
   desktop and mobile crops, captions, reduced motion and low-data fallback.
5. Keep the CTA in accessible HTML next to or after the video; do not rely on
   an animated link embedded in the video to navigate to `gcsc.store`.
