# GCSC web: product design quality brief

Status: approved direction from founder feedback, 2026-09-14.

## Outcome

The public GCSC website must feel like a credible construction trust product,
not a crypto template or an animation demo. A first-time homeowner or contractor
must understand within seconds what the product does, who it serves, and what the
next safe action is.

## First-visit questions

The first viewport and primary navigation must answer:

1. What is SmartContractor?
2. Is it for a homeowner or a contractor?
3. How does a protected project work?
4. What is available now, and what is planned?
5. What should the visitor do next?

## Visual direction

- Construction-first photography and evidence; no abstract crypto atmosphere.
- Calm professional palette: neutral light surfaces, charcoal text, safety orange
  for the primary action, and restrained blue for trust/status information.
- One dominant action per view. Progressive disclosure for technical details.
- Clear type hierarchy, generous but purposeful spacing, and no nested card grids.
- Motion explains hierarchy or state. It must not compete with reading.
- Product and construction are visible in the first viewport; the next section is
  partially visible on desktop and mobile.

## Remove from the current home page

- Particle network and decorative aurora/mesh layers.
- Decrypting headline text, magnetic controls, shimmer text, star borders.
- Marquee of unsupported trust claims.
- Repeated pills, gradients and animated effects without user value.
- Claims such as live escrow, instant settlement, bank-grade security, zero fees,
  or verified contractors unless the exact release evidence supports them.

## Information architecture

1. Header: Product, How it works, For homeowners, For contractors, Safety, Sign in.
2. Hero: SmartContractor name, literal protected-renovation proposition, one main
   action and one secondary explanation link over a real construction image.
3. Role choice: homeowner and contractor paths with concrete outcomes.
4. How it works: publish project, compare verified bids, agree milestones, record
   progress, approve completion. Planned payment functionality is labeled planned.
5. Product proof: screenshots or real tested workflow evidence, not invented stats.
6. Safety and limitations: identity, records, disputes and current release status.
7. Final action and concise footer.

## Acceptance gates

- Content comprehension review for a first-time homeowner and contractor.
- Keyboard navigation, semantic landmarks, visible focus, alt text, form labels.
- WCAG AA contrast; color is never the only state signal.
- Responsive screenshots at 360x800, 768x1024 and 1440x900.
- No horizontal overflow, clipped text, overlapping controls or hidden next section.
- Reduced-motion mode, 200% zoom and keyboard-only pass.
- Lighthouse/accessibility and browser console checked; no serious/critical finding.
- Core Web Vitals budget: LCP <= 2.5s, CLS <= 0.1, INP <= 200ms on representative
  preview conditions; results recorded rather than inferred.
- Independent design critic compares the exact candidate against this brief before
  integration. A build PASS alone is not design approval.

## Implementation rule

Keep Radix/shadcn accessibility primitives and Lucide icons already present. Use
one motion system only and a small motion-token set. Do not introduce another UI
framework or copy a third-party website. External repositories are references and
dependencies only after license, maintenance, bundle and migration review.

## Parallel work lanes

Parallel work is split by evidence and ownership, not by decorative job titles:

- Product/UX investigator: maps homeowner and contractor first-visit journeys,
  content hierarchy, trust questions and exit risks. Read-only output.
- Visual-system designer: owns tokens, typography, imagery, components and motion
  rules in an isolated frontend worktree.
- Frontend implementer: implements one approved page slice at a time against the
  existing React application and does not invent backend capabilities.
- Independent design critic: reviews screenshots, interaction traces, accessibility,
  performance and wording against this brief; it does not edit its own candidate.
- Parent integrator: reconciles findings, runs the complete acceptance set and is
  solely responsible for proposing integration.

Writers never share a worktree. Research and criticism can run in parallel. Closely
coupled changes to the same page remain with one writer. No background worker may
publish, deploy, change DNS, add a paid service or claim design approval by itself.

## Delivery sequence

1. Inventory and screenshot the exact current public and local candidates.
2. Produce the homeowner and contractor journey map and a content-first wireframe.
3. Approve factual copy and identify which claims require evidence or removal.
4. Implement the design tokens, header, hero and role-selection slice.
5. Run visual, responsive, accessibility and performance acceptance.
6. Obtain independent design-critic findings and fix them in one bounded pass.
7. Continue section by section, then verify the full site as one release candidate.
