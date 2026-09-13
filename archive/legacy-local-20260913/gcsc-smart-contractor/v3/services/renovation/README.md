# GCSC Renovation Module (backend services)

Plain Node.js (CommonJS), **zero external dependencies**, used by the live
backend `v3/pure-server.js`. Everything runs on **offline MOCK providers** by
default, so the whole AI Renovation Visualizer works with **no AI/image API key
connected**.

## Files

| File | Responsibility |
|---|---|
| `constants.js` | Project-type catalog (scope, materials, cost ranges, milestone templates, timelines), risk rules, disclaimers. Pure data. |
| `RenovationAnalysisService.js` | Scope + materials + **cost estimate** + timeline + pre-contract checklists. AI-backed via a swappable `provider`. Cost is computed deterministically here (never from the AI) so money figures stay auditable. |
| `PermitRiskHeuristicService.js` | **Heuristic** permit/code risk screening (low/medium/high). Deterministic rules only — never legal approval. |
| `MilestoneGenerationService.js` | Milestone **release schedule** from project type + cost range (percentages sum to 100). |
| `VisualGenerationService.js` | Before/after preview. AI-backed via a swappable `provider`. Mock renders a styled SVG `data:` URL. |
| `index.js` | Wires the services together. The single import surface for `pure-server.js`. |

## Usage (already wired in pure-server.js)

```js
const renovation = require('./services/renovation');

const analysis = renovation.analyze({
  projectType: 'siding',
  userDescription: 'Replace old vinyl siding on a two-story house',
  stylePreference: 'modern',         // modern | classic | luxury | budget | energy_efficient
  budgetMin: 8000,
  budgetMax: 18000,
  zipCode: '98101',
});

const visual = await renovation.generateVisual({
  projectType: 'siding',
  prompt: 'modern fiber-cement siding, charcoal color',
  stylePreference: 'modern',
  inputImageUrl: '<optional data: URL or https URL>',
});
```

`analyze()` returns: `projectLabel`, `category`, `summary`, `scopeOfWork[]`,
`materialCategories[]`, `costEstimate{low,high,currency,basis}`,
`timeline{totalDays,phases[]}`, `permitRisk{level,factors[],recommendedActions[],
disclaimer}`, `milestones[]`, `homeownerChecklist[]`, `contractorChecklist[]`,
`provider`, `disclaimer`, `generatedAt`.

## Permit risk is screening, not approval

Every permit-risk result carries the mandatory disclaimer string:

> Preliminary permit/code risk screening only. Final approval requires licensed
> professionals and local jurisdiction review.

Tiers: **Low** = cosmetic paint/flooring/cabinet · **Medium** =
window/door/siding/roofing/bath/kitchen · **High** =
structural/additions/decks/foundation/electrical panel/plumbing
relocation/load-bearing. Structural keywords in the description escalate any job
to **High**.

---

## Swapping the MOCK provider for real AI

Two seams are provider-based. Each is a tiny adapter object/class with one
method. **No callers change** — only the wiring in `index.js` (or pass providers
into `createRenovationServices()`).

### 1. Analysis provider

Implement:

```js
class MyAnalysisProvider {
  get name() { return 'openai'; }              // or 'anthropic', etc.
  // input: { projectType, userDescription, stylePreference, budgetMin, budgetMax, ... }
  analyze(input) {
    // call your model, return ONLY the creative parts:
    return {
      summary: '...',
      scopeOfWork: ['...'],
      materialCategories: [{ category: '...', items: ['...'], note: '' }],
      timeline: { totalDays: 12, phases: [{ name: '...', days: 3 }] },
    };
  }
}
```

> Cost is intentionally **not** part of the provider contract — it is computed in
> `RenovationAnalysisService.computeCostEstimate()` so the AI cannot hallucinate
> prices. Adjust that method if you want model-assisted pricing.

### 2. Visual provider

Implement (async, must not throw — return a status object):

```js
class MyVisualProvider {
  get name() { return 'replicate'; }
  // input: { projectType, prompt, stylePreference, inputImageUrl }
  async generateVisual(input) {
    const url = await callImageModel(input);   // returns a hosted/https or data URL
    return { status: 'completed', outputImageUrl: url, prompt: input.prompt };
    // on failure: return { status: 'failed', outputImageUrl: '' }
  }
}
```

### Wire them in

Option A — edit `index.js` `createRenovationServices()` default, or
Option B — construct your own set:

```js
const { createRenovationServices } = require('./services/renovation');
const services = createRenovationServices({
  analysisProvider: new MyAnalysisProvider(),
  visualProvider: new MyVisualProvider(),
});
// services.analyze(input) / services.generateVisual(input)
```

Recommended: gate real providers behind an env flag (e.g.
`RENOVATION_AI_ENABLED === 'true'`) so production stays on the mock until keys +
budget are deliberately turned on — mirroring the `SETTLEMENT_ENABLED` pattern
used by `services/settlement.js`.

## Persistence

These services are **stateless** and do no DB I/O. Drafts and visual-generation
rows are persisted by `pure-server.js` (Postgres when `DATABASE_URL` is set, else
the local JSON file) in tables `renovation_project_drafts` and
`renovation_visual_generations` — see
`v3/database/renovation-module-migration.sql`.
