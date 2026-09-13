/**
 * ============================================================================
 * GCSC Renovation — Analysis Service (scope / materials / cost / timeline)
 * ============================================================================
 *
 * Produces the planning analysis a homeowner sees before hiring a pro:
 *   - a short summary
 *   - scope of work (line items)
 *   - material categories to choose from
 *   - a preliminary cost ESTIMATE PLACEHOLDER range
 *   - a timeline broken into phases
 *   - pre-contract checklists for the homeowner and contractor
 *
 * PROVIDER MODEL
 *   The "creative" analysis comes from a pluggable provider that implements
 *   `analyze(input) -> { summary, scopeOfWork, materialCategories, timeline }`.
 *   The default `MockRenovationProvider` is fully offline (no AI key needed) and
 *   reads from constants.js. To use a real model later, pass a provider that
 *   satisfies the same interface (see services/renovation/README.md).
 *
 *   Cost is computed deterministically by this service (not the provider) so the
 *   money figures stay auditable and never hallucinated.
 * ============================================================================
 */

'use strict';

const {
  STYLE_COST_MULTIPLIER,
  STYLE_PREFERENCES,
  ANALYSIS_DISCLAIMER,
  getProjectTypeConfig,
} = require('./constants');

function roundTo(value, step) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / step) * step;
}

function clampStyle(style) {
  const value = String(style || 'modern').toLowerCase().trim();
  return STYLE_PREFERENCES.includes(value) ? value : 'modern';
}

/**
 * Default offline provider. Returns the "creative" portions of the analysis
 * from the static project-type catalog so the module works with no AI key.
 */
class MockRenovationProvider {
  get name() {
    return 'mock';
  }

  analyze(input = {}) {
    const config = getProjectTypeConfig(input.projectType);
    const style = clampStyle(input.stylePreference);
    const styleWord = style.replace('_', '-');

    const summary =
      `A ${styleWord} ${config.label.toLowerCase()} plan based on what you described. ` +
      `Below is a starting scope, the materials you'll choose from, an estimated cost range, and a phase-by-phase timeline.`;

    return {
      summary,
      scopeOfWork: [...config.scope],
      materialCategories: config.materials.map((group) => ({
        category: group.category,
        items: [...group.items],
        note: '',
      })),
      timeline: {
        totalDays: config.totalDays,
        phases: config.timeline.map((phase) => ({ name: phase.name, days: phase.days })),
      },
    };
  }
}

class RenovationAnalysisService {
  /**
   * @param {object} [deps]
   * @param {{ name: string, analyze: Function }} [deps.provider]
   */
  constructor({ provider } = {}) {
    this.provider = provider || new MockRenovationProvider();
  }

  /** Deterministic preliminary cost estimate (USD). Never from the AI provider. */
  computeCostEstimate(input) {
    const config = getProjectTypeConfig(input.projectType);
    const style = clampStyle(input.stylePreference);
    const multiplier = STYLE_COST_MULTIPLIER[style] || 1;

    const low = roundTo(config.costLow * multiplier, 100);
    const high = roundTo(config.costHigh * multiplier, 100);

    const budgetMin = Number(input.budgetMin) || 0;
    const budgetMax = Number(input.budgetMax) || 0;
    const hasBudget = budgetMin > 0 || budgetMax > 0;

    return {
      low,
      high,
      currency: 'USD',
      basis: `Preliminary ${style.replace('_', '-')} estimate for ${config.label.toLowerCase()}. Placeholder only — not a quote.`,
      homeownerBudget: hasBudget ? { min: budgetMin, max: budgetMax } : null,
      withinBudget: hasBudget && budgetMax > 0 ? low <= budgetMax : null,
    };
  }

  /** Pre-contract checklists. High risk adds permit/engineering items. */
  buildChecklists(riskLevel) {
    const homeowner = [
      'Confirm your budget range and how you will fund the project',
      'Take clear, well-lit photos of the existing area',
      'Note any HOA, condo, or building rules that apply',
      'Decide on must-have materials and finishes',
      'Confirm site access and a preferred start-date window',
    ];

    const contractor = [
      'Provide a current license and proof of liability insurance',
      'Provide a written, itemized estimate',
      'Confirm who pulls any required permits',
      'Provide a milestone schedule and warranty terms',
      'Confirm a realistic start date and crew size',
    ];

    if (riskLevel === 'high') {
      homeowner.push('Allow extra time for permit/plan review before work starts');
      contractor.push('Provide professional drawings or engineering where required');
      contractor.push('List the inspections required and who schedules them');
    }

    return { homeownerChecklist: homeowner, contractorChecklist: contractor };
  }

  /**
   * @param {object} input
   * @param {string} input.projectType
   * @param {string} [input.userDescription]
   * @param {string} [input.stylePreference]
   * @param {number} [input.budgetMin]
   * @param {number} [input.budgetMax]
   * @param {string} [input.permitRiskLevel] used only for checklist tailoring
   * @returns {object} analysis (scope/materials/cost/timeline/checklists)
   */
  analyze(input = {}) {
    const creative = this.provider.analyze(input);
    const costEstimate = this.computeCostEstimate(input);
    const checklists = this.buildChecklists(input.permitRiskLevel);
    const config = getProjectTypeConfig(input.projectType);

    return {
      projectType: String(input.projectType || '').toLowerCase().trim(),
      projectLabel: config.label,
      category: config.category,
      summary: creative.summary,
      scopeOfWork: Array.isArray(creative.scopeOfWork) ? creative.scopeOfWork : [],
      materialCategories: Array.isArray(creative.materialCategories) ? creative.materialCategories : [],
      costEstimate,
      timeline: creative.timeline || { totalDays: config.totalDays, phases: [] },
      homeownerChecklist: checklists.homeownerChecklist,
      contractorChecklist: checklists.contractorChecklist,
      provider: this.provider.name || 'mock',
      disclaimer: ANALYSIS_DISCLAIMER,
    };
  }
}

module.exports = { RenovationAnalysisService, MockRenovationProvider };
