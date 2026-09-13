/**
 * ============================================================================
 * GCSC Renovation — Permit / Code Risk Heuristic Service
 * ============================================================================
 *
 * HEURISTIC SCREENING ONLY. This is NOT legal approval and NOT a permit
 * determination. It is a deterministic, rule-based "is this likely to need a
 * permit / professional review" hint to help a homeowner scope the job.
 *
 *   Low    = cosmetic paint / flooring / cabinet refinishing
 *   Medium = window / door / siding / roofing / bath / kitchen
 *   High   = structural / additions / decks / foundation / electrical panel /
 *            plumbing relocation / load-bearing changes
 *
 * Every result carries the mandatory disclaimer string.
 * ============================================================================
 */

'use strict';

const {
  RISK_LEVELS,
  PERMIT_RISK_DISCLAIMER,
  HIGH_RISK_KEYWORDS,
  LOW_RISK_TYPES,
  getProjectTypeConfig,
  isKnownProjectType,
} = require('./constants');

const RISK_RANK = { low: 1, medium: 2, high: 3 };

const RECOMMENDED_ACTIONS = {
  low: [
    'Confirm HOA color/finish rules if you live in a managed community',
    'Most jurisdictions do not require a permit for cosmetic finishes — verify locally',
  ],
  medium: [
    'A building permit is commonly required — confirm with your local jurisdiction',
    'Hire a licensed contractor who will pull the permit under their license',
    'Schedule any required inspections before closing out the work',
  ],
  high: [
    'A permit AND professional drawings or engineering are typically required',
    'Use a licensed general contractor; structural/system changes need inspections',
    'Confirm setbacks, easements, and zoning before committing to the scope',
    'Budget extra time for plan review and permit approval',
  ],
};

/** Reasons text per base risk tier (homeowner-friendly). */
function baseFactors(level, label) {
  if (level === RISK_LEVELS.LOW) {
    return [`${label} is generally a cosmetic/finish job that rarely requires a permit.`];
  }
  if (level === RISK_LEVELS.HIGH) {
    return [`${label} commonly involves structural or system work that requires permits and inspections.`];
  }
  return [`${label} typically requires a building permit and at least one inspection in most jurisdictions.`];
}

class PermitRiskHeuristicService {
  /**
   * @param {object} input
   * @param {string} input.projectType
   * @param {string} [input.userDescription]
   * @returns {{
   *   level: 'low'|'medium'|'high',
   *   label: string,
   *   factors: string[],
   *   matchedKeywords: string[],
   *   escalated: boolean,
   *   recommendedActions: string[],
   *   isLegalApproval: false,
   *   disclaimer: string
   * }}
   */
  assess(input = {}) {
    const projectType = String(input.projectType || '').toLowerCase().trim();
    const config = getProjectTypeConfig(projectType);
    const description = String(input.userDescription || '').toLowerCase();

    // 1. Base level from the project type.
    let level = LOW_RISK_TYPES.has(projectType) ? RISK_LEVELS.LOW : config.baseRisk;

    const factors = baseFactors(level, config.label);
    if (!isKnownProjectType(projectType) && projectType) {
      factors.push('Project type was not recognized — treated as a general renovation for screening.');
    }

    // 2. Keyword escalation: structural / systems work pushes to HIGH.
    const matchedKeywords = HIGH_RISK_KEYWORDS.filter((kw) => description.includes(kw));
    const escalated = matchedKeywords.length > 0 && RISK_RANK[level] < RISK_RANK.high;
    if (matchedKeywords.length > 0) {
      level = RISK_LEVELS.HIGH;
      factors.push(
        `Your description mentions ${matchedKeywords
          .map((kw) => `"${kw}"`)
          .join(', ')}, which usually means structural or system work and a higher review bar.`
      );
    }

    return {
      level,
      label: config.label,
      factors,
      matchedKeywords,
      escalated,
      recommendedActions: RECOMMENDED_ACTIONS[level] || RECOMMENDED_ACTIONS.medium,
      isLegalApproval: false,
      disclaimer: PERMIT_RISK_DISCLAIMER,
    };
  }
}

module.exports = { PermitRiskHeuristicService };
