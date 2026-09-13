/**
 * ============================================================================
 * GCSC Renovation Module — Service Wiring (single import surface)
 * ============================================================================
 *
 * pure-server.js requires THIS file only:
 *   const renovation = require('./services/renovation');
 *   const analysis = renovation.analyze(input);
 *   const visual = await renovation.generateVisual(input);
 *
 * Everything runs on offline MOCK providers by default (no AI key needed). To
 * plug in real AI later, pass adapters into createRenovationServices() — see
 * README.md in this folder. No external npm dependencies are used.
 * ============================================================================
 */

'use strict';

const constants = require('./constants');
const { RenovationAnalysisService } = require('./RenovationAnalysisService');
const { PermitRiskHeuristicService } = require('./PermitRiskHeuristicService');
const { MilestoneGenerationService } = require('./MilestoneGenerationService');
const { VisualGenerationService } = require('./VisualGenerationService');

/**
 * Build a set of renovation services. Pass providers to swap the mock AI.
 * @param {object} [opts]
 * @param {object} [opts.analysisProvider]  implements analyze(input)
 * @param {object} [opts.visualProvider]    implements generateVisual(input)
 */
function createRenovationServices(opts = {}) {
  const permitRiskService = new PermitRiskHeuristicService();
  const analysisService = new RenovationAnalysisService({ provider: opts.analysisProvider });
  const milestoneService = new MilestoneGenerationService();
  const visualService = new VisualGenerationService({ provider: opts.visualProvider });

  /**
   * Compose a full renovation analysis: permit risk + scope/materials/cost/
   * timeline + milestone release schedule + checklists.
   * @param {object} input
   * @returns {object} the complete analysis object
   */
  function analyze(input = {}) {
    const permitRisk = permitRiskService.assess(input);
    const analysis = analysisService.analyze({ ...input, permitRiskLevel: permitRisk.level });
    const milestonesResult = milestoneService.generate(input, analysis.costEstimate);

    return {
      projectType: analysis.projectType,
      projectLabel: analysis.projectLabel,
      category: analysis.category,
      summary: analysis.summary,
      scopeOfWork: analysis.scopeOfWork,
      materialCategories: analysis.materialCategories,
      costEstimate: analysis.costEstimate,
      timeline: analysis.timeline,
      permitRisk,
      milestones: milestonesResult.milestones,
      milestonesNote: milestonesResult.note,
      homeownerChecklist: analysis.homeownerChecklist,
      contractorChecklist: analysis.contractorChecklist,
      provider: analysis.provider,
      disclaimer: analysis.disclaimer,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a before/after preview. Never throws — returns a status object.
   * @param {object} input
   * @returns {Promise<object>}
   */
  function generateVisual(input = {}) {
    return visualService.generateVisual(input);
  }

  return {
    permitRiskService,
    analysisService,
    milestoneService,
    visualService,
    analyze,
    generateVisual,
  };
}

// Default instance used by pure-server.js (offline mock providers).
const defaultServices = createRenovationServices();

module.exports = {
  ...constants,
  createRenovationServices,
  analyze: defaultServices.analyze,
  generateVisual: defaultServices.generateVisual,
  services: defaultServices,
};
