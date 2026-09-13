/**
 * ============================================================================
 * GCSC Renovation — Milestone Generation Service
 * ============================================================================
 *
 * Turns a project type + a cost range into a homeowner-friendly milestone
 * release schedule ("Milestone Payments"). Each milestone is a verifiable
 * deliverable; payment is only suggested to release after "Verified Progress".
 *
 * Deterministic: templates live in constants.js. The siding and windows/doors
 * templates from the spec are the reference shape; every other type follows the
 * same percentage-of-total pattern (percentages always sum to 100).
 *
 * No money moves here — this is planning data only.
 * ============================================================================
 */

'use strict';

const { getProjectTypeConfig } = require('./constants');

function roundCurrency(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

class MilestoneGenerationService {
  /**
   * @param {object} input
   * @param {string} input.projectType
   * @param {object} [costEstimate]  { low, high } total project cost range.
   * @returns {{
   *   milestones: Array<{
   *     order: number,
   *     title: string,
   *     description: string,
   *     percentage: number,
   *     amountLow: number,
   *     amountHigh: number,
   *     deliverable: string,
   *     verificationRequired: boolean
   *   }>,
   *   totalPercentage: number,
   *   note: string
   * }}
   */
  generate(input = {}, costEstimate = {}) {
    const config = getProjectTypeConfig(input.projectType);
    const low = Number(costEstimate.low) || config.costLow;
    const high = Number(costEstimate.high) || config.costHigh;

    const template = Array.isArray(config.milestones) && config.milestones.length
      ? config.milestones
      : [];

    const milestones = template.map((m, index) => ({
      order: index + 1,
      title: m.title,
      description: m.deliverable,
      percentage: m.pct,
      amountLow: roundCurrency((low * m.pct) / 100),
      amountHigh: roundCurrency((high * m.pct) / 100),
      deliverable: m.deliverable,
      // Every milestone payment is gated on confirmed progress.
      verificationRequired: true,
    }));

    const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);

    return {
      milestones,
      totalPercentage,
      note:
        'Each milestone payment is suggested to release only after the work for that stage is confirmed complete. ' +
        'Amounts are preliminary and split from the estimate range — your contractor confirms the final figures.',
    };
  }
}

module.exports = { MilestoneGenerationService };
