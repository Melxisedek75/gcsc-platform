# Whitepaper v1.4 Renovation Financing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an internal GCSC Whitepaper v1.4 that makes AI-supported renovation-financing workflow central while preserving demo-only, no-lender, no-custody, and no-publication boundaries.

**Architecture:** v1.4 is a new internal Markdown draft derived from v1.3; it does not replace v1.3 or `whitepaper.html`. A focused changelog records narrative changes, while a static Node validator confirms required sections and rejects unqualified live-finance claims in the v1.4 files.

**Tech Stack:** Markdown, Node.js built-in `fs` and `path`, existing `construction-ai/scripts` validator conventions.

---

## File Structure

- Create: `docs/whitepaper-v1-4-renovation-financing-draft.md` — internal whitepaper draft.
- Create: `docs/whitepaper-v1-4-renovation-financing-changelog.md` — v1.3-to-v1.4 editorial and capability-status changes.
- Create: `construction-ai/scripts/validate-whitepaper-v1-4-renovation-financing.mjs` — deterministic required-content and claim-boundary validator.
- Modify: `construction-ai/package.json` — add `check:whitepaper-v1-4` script.
- Modify: `docs/gcsc-active-context.md` — link v1.4 as the latest internal draft while retaining the public-file boundary.
- Create later in separate plans: `docs/superpowers/plans/2026-09-05-renovation-ai-domain-models.md`, `docs/superpowers/plans/2026-09-05-gcscrenovate-state-contract.md`, `docs/superpowers/plans/2026-09-05-renovation-demo-ui.md`.

## Workstream Order

1. Whitepaper v1.4 and claims validator.
2. Pure local AI domain models and fixtures.
3. `gcscrenovate` no-transfer state contract.
4. Demo-only SmartContractor API and UI.
5. Independent review, founder/legal/provider gates before any live-action work.

### Task 1: Create the v1.4 internal draft

**Files:**
- Create: `docs/whitepaper-v1-4-renovation-financing-draft.md`
- Reference: `docs/whitepaper-v1-3-hybrid-regulated-web3-draft.md`
- Reference: `docs/superpowers/specs/2026-09-05-renovation-financing-v14-design.md`

- [ ] **Step 1: Write the failing validator first**

Create `construction-ai/scripts/validate-whitepaper-v1-4-renovation-financing.mjs` with the implementation shown in Task 3, Step 1. Do not add the package script yet.

- [ ] **Step 2: Run the validator before the draft exists**

Run:

```powershell
node construction-ai/scripts/validate-whitepaper-v1-4-renovation-financing.mjs
```

Expected: FAIL with missing v1.4 draft and changelog files.

- [ ] **Step 3: Write the internal draft**

The draft must state all of the following explicitly:

```text
GCSC turns planned renovations into structured, lender-ready, milestone-controlled construction projects.
```

It must define the workflow:

```text
Property and scope -> preliminary AI analysis -> verified contractor bid ->
Renovation Finance Package -> lender underwriting -> controlled draw plan ->
milestone evidence -> AI recommendation -> human/lender review ->
simulation-only draw authorization -> final completion audit.
```

It must describe four agents, their input/output, and their limitations:

```text
Renovation Valuation Agent
Milestone Evidence Agent
Draw Recommendation Agent
Finance Package Agent
```

It must define `gcscrenovate` as a future no-transfer state and audit contract, and state that it cannot custody, lend, deposit, transfer, settle, or autonomously release funds.

- [ ] **Step 4: Run the validator after draft creation**

Run:

```powershell
node construction-ai/scripts/validate-whitepaper-v1-4-renovation-financing.mjs
```

Expected: FAIL only because the changelog and context link do not yet exist.

- [ ] **Step 5: Commit the draft**

```powershell
git add docs/whitepaper-v1-4-renovation-financing-draft.md
git commit -m "Add renovation financing whitepaper v1.4 draft"
```

### Task 2: Add v1.3-to-v1.4 changelog and context link

**Files:**
- Create: `docs/whitepaper-v1-4-renovation-financing-changelog.md`
- Modify: `docs/gcsc-active-context.md`

- [ ] **Step 1: Create the changelog**

Use these exact sections:

```markdown
## Status Change
## New Central Narrative
## New AI Decision-Support Components
## New Future Smart Contract Boundary
## Built / In Development / Long-Term Changes
## Claims Explicitly Not Added
## Public Publication Boundary
```

Under `Claims Explicitly Not Added`, state that v1.4 does not claim loan approval, appraisal licensing, value guarantees, real escrow, real custody, real payments, provider approval, or public readiness.

- [ ] **Step 2: Update active context**

Add a dated v1.4 entry stating that it is the current internal renovation-financing draft and that `whitepaper.html` remains unchanged and unapproved for replacement.

- [ ] **Step 3: Run the validator**

Run:

```powershell
node construction-ai/scripts/validate-whitepaper-v1-4-renovation-financing.mjs
```

Expected: PASS after Task 3 provides the validator implementation.

- [ ] **Step 4: Commit documentation context**

```powershell
git add docs/whitepaper-v1-4-renovation-financing-changelog.md docs/gcsc-active-context.md
git commit -m "Document whitepaper v1.4 renovation financing changes"
```

### Task 3: Implement the v1.4 static validator

**Files:**
- Create: `construction-ai/scripts/validate-whitepaper-v1-4-renovation-financing.mjs`
- Modify: `construction-ai/package.json`

- [ ] **Step 1: Verify the existing failing validator source**

The validator created in Task 1 must contain this implementation before the required v1.4 files are complete:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const requiredFiles = [
  'docs/whitepaper-v1-4-renovation-financing-draft.md',
  'docs/whitepaper-v1-4-renovation-financing-changelog.md',
  'docs/gcsc-active-context.md',
];
const requiredPhrases = [
  '## Projected Post-Renovation Value',
  '## GCSC Renovation Finance Package',
  '## AI-Powered Renovation Financing Workflow',
  'Renovation Valuation Agent',
  'Milestone Evidence Agent',
  'Draw Recommendation Agent',
  'Finance Package Agent',
  'gcscrenovate',
  'GCSC does not issue loans',
  'GCSC does not custody funds',
  'simulation-only draw authorization',
];
const blockedPhrases = [
  'guaranteed property value',
  'automatic loan approval',
  'funds are automatically released',
  'GCSC holds customer funds',
  'GCSC is a licensed lender',
];
const errors = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required file: ${file}`);
}

const draftPath = path.join(root, requiredFiles[0]);
if (fs.existsSync(draftPath)) {
  const draft = fs.readFileSync(draftPath, 'utf8');
  for (const phrase of requiredPhrases) {
    if (!draft.includes(phrase)) errors.push(`Missing required phrase: ${phrase}`);
  }
  for (const phrase of blockedPhrases) {
    if (draft.includes(phrase)) errors.push(`Blocked claim in v1.4 draft: ${phrase}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('whitepaper v1.4 renovation financing validation passed');
```

- [ ] **Step 2: Run the failing validator**

Run:

```powershell
node construction-ai/scripts/validate-whitepaper-v1-4-renovation-financing.mjs
```

Expected: FAIL until all required documentation is present and safe.

- [ ] **Step 3: Add package command**

Add this exact script entry to `construction-ai/package.json`:

```json
"check:whitepaper-v1-4": "node construction-ai/scripts/validate-whitepaper-v1-4-renovation-financing.mjs"
```

- [ ] **Step 4: Run the green validator**

Run:

```powershell
npm run check:whitepaper-v1-4
```

Expected: `whitepaper v1.4 renovation financing validation passed`.

- [ ] **Step 5: Commit the validator**

```powershell
git add construction-ai/scripts/validate-whitepaper-v1-4-renovation-financing.mjs package.json
git commit -m "Validate whitepaper v1.4 renovation financing claims"
```

### Task 4: Final documentation verification and review handoff

**Files:**
- Verify: `docs/whitepaper-v1-4-renovation-financing-draft.md`
- Verify: `docs/whitepaper-v1-4-renovation-financing-changelog.md`
- Verify: `docs/gcsc-active-context.md`
- Verify: `whitepaper.html`

- [ ] **Step 1: Confirm public file remains untouched**

Run:

```powershell
git diff HEAD -- whitepaper.html
```

Expected: no output.

- [ ] **Step 2: Run whitespace and content checks**

Run:

```powershell
git diff --check HEAD
npm run check:whitepaper-v1-4
```

Expected: no whitespace errors and a passing v1.4 validator.

- [ ] **Step 3: Create independent-review request**

Create an `ai-review` record that asks a reviewer to verify narrative accuracy, prohibited claims, v1.3 compatibility, and the public-file boundary. Do not self-approve.

- [ ] **Step 4: Commit review-request metadata only**

```powershell
git add ai-review
git commit -m "Request review for whitepaper v1.4 draft"
```

## Follow-On Plans

Do not implement these in this plan:

1. `2026-09-05-renovation-ai-domain-models.md`: pure local models and fixtures, no external data or model provider.
2. `2026-09-05-gcscrenovate-state-contract.md`: proton-tsc no-transfer state machine and simulation tests.
3. `2026-09-05-renovation-demo-ui.md`: demo-only project, valuation, evidence, and draw recommendation screens.
4. `2026-09-05-renovation-provider-integration-gates.md`: future legal/provider decision packets only; no outreach or live integration.

## Review Checklist

- [ ] Every specification requirement maps to Task 1, 2, 3, or a named follow-on plan.
- [ ] The only implementation in this plan is internal documentation and a local static validator.
- [ ] The plan contains no public deployment, provider outreach, wallet signature, lending, custody, payment, escrow, or token-transfer work.
- [ ] `whitepaper.html` remains outside the modification scope.
