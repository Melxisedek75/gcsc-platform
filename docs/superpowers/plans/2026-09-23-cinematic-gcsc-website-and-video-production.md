# GCSC Cinematic Website and Video Production Master Plan

**Date:** 2026-09-23  
**Target submission:** 2026-11-02  
**Status:** Approved direction; implementation not yet started  
**Owners:** GCSC founder (product and publication approval), Codex (technical delivery), creative/video services (asset production)

**Schedule update, 2026-09-27:** The October lightweight release scope and
acceptance gates now live in `docs/migration/CHECKLIST.md` (L00-L25). Its
15 October pilot and 20 October release-candidate targets supersede the dates
in section 12 below. For that release, keep the existing static marketing
entrypoint and add motion progressively; defer the React/Vite migration proposed
in section 3. Prioritize one hero loop, one explanatory film, truthful feature
labels and working SmartContractor links. The full film
slate remains a later creative roadmap, not a blocker for the core registration,
project, paid-lead and proposal journeys. No actual payment or wallet footage
may be simulated as a completed production transaction.

## 1. Objective

Deliver two connected but deliberately separate products:

1. **`xprnet.org` - cinematic presentation website.** A grant-ready, investor-grade narrative explaining the construction problem, the GCSC approach, what works now, and what is planned.
2. **`gcsc.store` - working SmartContractor product.** A task-focused application where a visitor can inspect and test real workflows without presentation effects obscuring the interface.

The presentation site must feel purpose-built for GCSC, not like a crypto template. Its visual language should combine real construction, evidence, payments, and accountable progress. The product site must remain quiet, legible, fast, and operational.

## 2. Non-negotiable Product Rules

- Keep the cinematic site and operational app separate. Marketing must link into real app routes; it must not imitate functionality that does not exist.
- Label every capability as **Available now**, **Testnet/prototype**, or **Planned/partner-gated**.
- Never show a fabricated successful wallet signature, escrow deposit, loan approval, or production payment.
- WebAuth footage must come from a verified device flow. Until that flow passes, use a clearly marked concept storyboard rather than a fake confirmation.
- Do not replace the current application architecture solely to obtain visual effects.
- Do not copy a showcase template wholesale. Open-source packages provide motion and rendering mechanics; GCSC needs its own art direction, story, copy, film, and interaction system.
- Preserve `whitepaper.html`, `CNAME`, SEO metadata, legal language, and working links during the marketing-site migration.

## 3. Current Baseline

### Presentation site

`apps/marketing` is currently a single static HTML page using the Tailwind CDN and AOS. It communicates basic product categories, but it is not a cinematic narrative, has no production media pipeline, and visually reads as a generic dark crypto landing page.

### SmartContractor

`apps/web` is the existing React 19/Vite application. It already contains the correct core libraries for a premium implementation: GSAP, `@gsap/react`, Lenis, Three.js, React Three Fiber, Framer Motion, Radix UI, Tailwind, and Lucide. This app remains the source of truth for working product journeys.

### Architecture decision

Migrate `apps/marketing` in place to a dedicated React/Vite presentation app and align dependency versions with `apps/web`. Do not move the operational app to Next.js before the November deadline. Use the Satus starter as an architecture and quality reference only, not as a replacement codebase.

## 4. Recommended Technical Foundation

| Foundation | Decision | Use in GCSC |
|---|---|---|
| [GreenSock/GSAP](https://github.com/greensock/GSAP) | Adopt; already installed in `apps/web` | ScrollTrigger timelines, pinning, chapter transitions, text/media choreography |
| [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) | Adopt; already installed | Controlled smooth scrolling synchronized with GSAP; disabled for reduced-motion users |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | Use selectively; already installed | One meaningful full-bleed construction/digital-twin scene, not decorative 3D on every section |
| [darkroomengineering/satus](https://github.com/darkroomengineering/satus) | Reference only | Study structure, SEO, WebGL boundaries, Storybook, and asset organization; avoid a risky framework migration |
| Native HTML video | Primary delivery layer | Muted inline hero playback, poster fallback, captions, responsive sources, lazy loading |
| Playwright + Lighthouse | Required acceptance tooling | Cross-viewport visual regression, workflow checks, performance and accessibility evidence |

## 5. Experience Architecture

### Global navigation

- GCSC identity and concise navigation.
- Primary CTA: **Explore SmartContractor** -> verified `gcsc.store` route.
- Secondary CTA: **Read Whitepaper**.
- Persistent but restrained chapter progress indicator.
- Sound remains off by default. A familiar speaker icon controls audio where licensed audio exists.

### Chapter 1 - GCSC hero

- Full-bleed 8-12 second cinematic loop, not a card or split layout.
- H1 is the literal product name: **Global Construction Smart Contract**.
- One-line proposition below it: verified construction progress, accountable payments, and contractor trust infrastructure.
- The first viewport must reveal part of the next chapter on desktop and mobile.
- Initial render uses a high-quality poster image; video upgrades after the critical page content is ready.

### Chapter 2 - The current construction failure

- Show fragmented communication, unclear scope, deposit risk, delayed payment, and missing proof.
- Use documentary realism rather than generic charts or crypto imagery.
- Scroll reveals one failure at a time, tied to a measurable consequence.

### Chapter 3 - Verified identity and wallet authorization

- Explain WebAuth as the authorization/signing layer, not as the user's application account database.
- Show testnet device capture only after Connect Wallet and ownership proof are verified end to end.
- Make the difference between app login, wallet connection, ownership proof, and transaction signature visually explicit.

### Chapter 4 - Project and priority-access marketplace

- Homeowner publishes a verified project.
- Contractors compete for time-limited priority access using the approved lead/bid rules.
- Show the proposed refund/economics clearly, but label them as pending contract implementation until on-chain behavior and legal language are approved.
- CTA enters the corresponding working SmartContractor listing or demo fixture.

### Chapter 5 - Proposal and agreement

- Contractor reviews scope, produces a proposal, and owner accepts or declines.
- Show versioned scope, proof, and audit history rather than implying an irreversible smart contract for every action.

### Chapter 6 - Milestones and protected settlement

- Show job stages, evidence uploads, owner approval, and payment readiness.
- Use **escrow-ready workflow** until custody, provider, contract, reconciliation, and legal acceptance are verified.
- A visible status ribbon states whether the shown transaction is simulated, testnet, or production.

### Chapter 7 - AI-assisted renovation financing

- Explain after-renovation valuation, scope verification, staged funding, and risk/compliance agents.
- Label lending, automated valuation, regulated settlement, and provider integrations as planned or partner-gated where appropriate.
- Link to the Whitepaper 1.4 section that defines the future regulated path.

### Chapter 8 - Evidence and accountability

- Present the audit trail: identity event, proposal version, proof artifact, approval, and settlement reference.
- Avoid claiming all private documents or every application event is stored on-chain.

### Chapter 9 - What exists now / what comes next

- A plain comparison of current working product, testnet integrations, active development, and future regulated capabilities.
- Include the current milestone, external gates, and pilot scope.

### Chapter 10 - Enter SmartContractor

- Full-width final scene and direct entry into the operational product.
- Separate routes for homeowner and contractor demonstrations when both are verified.
- Whitepaper and contact/grant links remain secondary.

## 6. Video Production Slate

| Asset | Duration | Purpose | Evidence rule |
|---|---:|---|---|
| Master brand film | 75-90 sec | Complete problem-to-solution story for grant reviewers | No unsupported production claims |
| Hero loop | 8-12 sec | Immediate first-viewport identity | Seamless, muted, readable behind text |
| Before GCSC | 20-30 sec | Emotional construction failure story | Realistic, non-sensational |
| Verified identity/WebAuth | 20-30 sec | Explain wallet connection and signing | Real testnet capture required for final version |
| Priority access marketplace | 20-30 sec | Visualize lead discovery and timed exclusivity | Economics marked proposed until implemented |
| Proposal and milestones | 25-35 sec | Show project progression and proof | Match actual app states |
| Escrow-ready settlement | 20-30 sec | Explain protected staged payment | Never depict live custody without evidence |
| AI renovation financing | 25-35 sec | Present Whitepaper 1.4 future model | Clearly labeled concept/future path |
| Mobile and desktop demos | 10-20 sec each | Prove usable product paths | Recorded from accepted builds only |

### Production pipeline for every asset

1. Write the business truth and claim status.
2. Produce a beat sheet and spoken script.
3. Create a storyboard with shot numbers and durations.
4. Generate or photograph reference frames for visual continuity.
5. Build a shot prompt sheet: subject, construction phase, camera, lighting, motion, continuity anchors, exclusions.
6. Generate short shots; do not ask one model generation to create the entire film.
7. Review anatomy, tools, PPE, site logic, signage, text, continuity, and brand fidelity.
8. Composite real SmartContractor UI/device capture where the product must be demonstrated.
9. Edit picture, sound design, licensed music, voice, captions, and legal/status labels.
10. Export master, desktop web, mobile web, poster frames, captions, and social derivatives.
11. Store source masters outside Git; commit only optimized web derivatives, posters, captions, and manifests.

## 7. Higgsfield Workflow

Correct service name: **Higgsfield**.

### Phase A - manual look development

Use [Higgsfield Cinema Studio](https://higgsfield.ai/ai-video) to establish the visual language, hero references, camera grammar, and continuity. Manual look development comes before automated batch generation so credits are not spent scaling a weak direction.

### Phase B - Codex-controlled generation

After the founder connects the Higgsfield account and approves credit use, use the official CLI/skills path described in [Higgsfield CLI access](https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-access-higgsfield-via-cli):

```powershell
npx skills add higgsfield-ai/skills
higgsfield auth login
```

This is an external-account and paid-credit gate. Login/OAuth and purchases remain founder actions. Generated assets must be downloaded promptly and catalogued locally/cloud-side.

### Phase C - API automation only when justified

Use the [Higgsfield API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api) only for repeatable batch jobs, asset manifests, polling/webhooks, and controlled regeneration. The API account and billing are separate; API keys stay server-side and out of browser bundles and Git.

The [Higgsfield MCP](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp) is an alternative OAuth route for supported clients. It still consumes credits. It should be tested in a small isolated proof before it becomes part of the permanent workflow.

### Cost control

- Begin with a fixed prototype allowance, not an open-ended generation loop.
- Track cost, model, prompt, seed/reference, result, and acceptance for every shot.
- Generate low-cost look tests first; approve one visual direction before production resolution.
- A proposed USD 100-200 starting budget is a prototype allowance, not a promise that it funds the complete film slate.

## 8. Creative Direction

### Visual principles

- Real construction is the dominant visual signal: people, materials, measurements, site conditions, and progress.
- Blockchain is represented through evidence, authorization, and traceability, not glowing coins, purple networks, or abstract crypto tunnels.
- Palette must include neutral construction materials, safety orange as an action accent, restrained cool technical tones, and high-contrast white/black. Avoid a one-hue purple or dark-blue interface.
- Motion serves causality: a signed decision changes the project timeline; proof unlocks the next stage; status travels from site to owner.
- Typography is editorial in the cinematic site and compact/utilitarian in SmartContractor.
- UI shown inside videos must use accepted product screens, not AI-generated illegible interfaces.

### Reference benchmark, not copying

- Apple product storytelling: disciplined pacing, product-first framing, media-led chapters.
- Stripe infrastructure storytelling: complex systems explained through progressive visual models.
- High-end architecture and automotive film: material detail, controlled camera movement, sound design, and continuity.
- Top digital studios: coherent art direction across film, motion, typography, and interaction.

The goal is comparable decision quality and finish, not imitation of another company's page or brand.

## 9. Repository and Asset Structure

```text
apps/marketing/
  src/
    chapters/
    components/
    motion/
    scenes/
    styles/
  public/
    media/
      hero/
      chapters/
      posters/
      captions/
    manifests/
  scripts/
    validate-media.mjs
    validate-claims.mjs
    validate-links.mjs

docs/creative/
  CREATIVE-BRIEF.md
  CLAIMS-MATRIX.md
  VIDEO-SLATE.md
  storyboards/
  scripts/
  shot-lists/
  prompt-sheets/
  reviews/
```

Large masters, project files, raw generations, and audio stems live in an approved cloud/archive location. The repository stores source documents and web-ready assets only. Each exported asset receives a manifest entry with origin, rights, model/service, status, checksum, and usage location.

## 10. Performance and Accessibility Budget

- LCP target: <= 2.5 s at p75.
- INP target: <= 200 ms at p75.
- CLS target: <= 0.1 at p75.
- Hero poster appears before video; page meaning does not depend on autoplay.
- Desktop, tablet, and mobile receive different video sizes. Do not ship a 4K master to a phone.
- Provide MP4 and WebM where useful, explicit dimensions/aspect ratios, preload metadata only, and lazy loading below the fold.
- Respect `prefers-reduced-motion`; provide a still/low-motion composition without losing content.
- Captions/transcript for all narrated material; keyboard operation and visible focus for all controls.
- Color contrast, zoom to 200%, low-data behavior, muted autoplay, and Safari/iOS restrictions are acceptance items.

## 11. Validation Matrix

### Viewports

- 360x800 and 390x844 mobile
- 768x1024 tablet
- 1440x900 laptop/desktop
- 1920x1080 wide desktop

### Required checks

- Production build and lint/type checks.
- Playwright screenshots for every chapter at all target viewports.
- Canvas/video pixel checks to detect blank WebGL, missing poster, or failed playback.
- Chrome, Edge, Safari/iOS behavior; Android Chrome on the physical test phone.
- Throttled mobile network and CPU test.
- Lighthouse performance, accessibility, best practices, and SEO evidence.
- Reduced-motion, keyboard-only, captions, pause/mute, and no-video fallback.
- Every CTA, whitepaper link, deep link, form, and product route.
- Claims matrix cross-check against the current implementation and Whitepaper 1.4.
- Final founder walkthrough and separate code/QA review before publication.

## 12. Original Delivery Schedule (Superseded by October MVP Checklist)

### 23-27 September - audit and creative brief

- Inventory all current marketing and app routes.
- Build claims matrix: current, testnet, prototype, planned, regulated/partner-gated.
- Define audiences, conversion actions, brand vocabulary, and visual exclusions.
- Produce information architecture and measurable baseline.

**Gate:** creative brief, claims matrix, route map, and technical decision accepted.

### 28 September-4 October - design system and storyboards

- Build three art-direction style frames and select one.
- Define typography, color, grid, motion grammar, icons, and media treatment.
- Write master film and chapter scripts; create storyboards and shot lists.
- Scaffold React/Vite marketing app while preserving existing public routes.

**Gate:** one accepted design direction and approved storyboard package.

### 5-11 October - first video batch and site skeleton

- Generate approved reference frames and first Higgsfield shots.
- Implement navigation, hero, chapter system, media loader, poster fallback, and analytics events.
- Implement claims/status labels and SmartContractor route handoffs.

**Gate:** complete desktop narrative with provisional media and no fabricated claims.

### 12-18 October - media integration and product journeys

- Complete problem, identity, marketplace, milestones, and financing chapters.
- Capture verified mobile/desktop product workflows where available.
- Integrate final copy, captions, sound controls, reduced-motion behavior, and responsive media.

**Gate:** end-to-end desktop/mobile presentation and verified app deep links.

### 19-25 October - final media and hardening

- Final edit, sound, voice, captions, color, and compressed exports.
- Performance, accessibility, browser, device, and visual-regression work.
- Correct all unsupported or ambiguous claims.

**Gate:** release candidate meeting performance and truthful-content acceptance criteria.

### 26-30 October - acceptance and freeze

- Full grant-reviewer rehearsal from a fresh browser/device.
- Independent review, final defect pass, legal/content approval, backup, and rollback preparation.
- Freeze code and media except release blockers.

### 31 October-1 November - contingency

- Release-blocking corrections only.
- Verify DNS, certificates, analytics, forms, app routes, whitepaper, and fallback assets.

### 2 November - submission

- Publish only the founder-approved candidate.
- Save immutable evidence: version, commit, URLs, screenshots, performance report, and submitted package.

## 13. Definition of World-Class for This Project

The work is acceptable only when:

- GCSC is unmistakable within three seconds of arrival.
- A first-time visitor can explain the problem, solution, current status, and next action after one guided visit.
- Film, typography, interface, motion, and sound feel like one directed system.
- No screen resembles a generic crypto template or an unrelated stock-video montage.
- The presentation site remains usable without video, sound, WebGL, or high bandwidth.
- Every product demonstration corresponds to a working or explicitly labeled testnet/prototype state.
- The presentation routes cleanly into SmartContractor without confusing marketing authentication with wallet authorization.
- Mobile text, controls, and media never overlap or shift unpredictably.
- Performance, accessibility, browser, device, claims, and link checks produce retained evidence.
- Production publication has explicit founder approval and a rollback path.

## 14. External Gates and Risks

- Higgsfield account connection, OAuth/login, and paid credits.
- Final product name and trademark decision for SmartContractor versus Leviton.
- Music, voice, person/model, site-footage, and third-party-logo rights.
- Verified WebAuth flow and XPR testnet footage.
- Legal wording for escrow, lending, insurance, valuation, investments, and returns.
- Production domain/DNS and publication approval.
- A media archive that is independent of Git and preserves licensed/source masters.

No blocked gate should stop unrelated local work. For example, wallet footage can remain a storyboard placeholder while the site architecture, copy, performance system, and non-wallet chapters proceed.

## 15. First Executable Work Package

The first implementation package must be narrow and reversible:

1. Create `docs/creative/CREATIVE-BRIEF.md` and `docs/creative/CLAIMS-MATRIX.md` from the current product and Whitepaper 1.4.
2. Inventory every current `apps/marketing` route, metadata item, domain file, and outbound link.
3. Inventory verified `apps/web` demo routes and mark routes that cannot yet be shown publicly.
4. Capture baseline screenshots and Lighthouse results before migration.
5. Scaffold the in-place React/Vite marketing app without changing production DNS or publishing.
6. Implement only the media loader, hero poster/video fallback, navigation, and status-label primitives.
7. Validate desktop/mobile rendering before proceeding to full chapter production.

This package creates a reliable foundation without waiting for Higgsfield, WebAuth support, legal review, or production credentials.
