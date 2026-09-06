/* Pricing engine + estimator domain types for the dashboard cost estimator. */

export type ProjectType =
  | 'Kitchen Remodel'
  | 'Bathroom'
  | 'Roofing'
  | 'Flooring'
  | 'Electrical'
  | 'Plumbing'
  | 'Full Renovation'
  | 'New Construction';

export type MaterialQuality = 'Basic' | 'Standard' | 'Premium' | 'Luxury';
export type LaborComplexity = 'Simple' | 'Moderate' | 'Complex';

const BASE_SQFT_RATES: Record<ProjectType, number> = {
  'Kitchen Remodel': 175,
  Bathroom: 145,
  Roofing: 85,
  Flooring: 35,
  Electrical: 42,
  Plumbing: 55,
  'Full Renovation': 125,
  'New Construction': 165,
};

const MATERIAL_MULTIPLIERS: Record<MaterialQuality, number> = {
  Basic: 0.75,
  Standard: 1.0,
  Premium: 1.45,
  Luxury: 2.2,
};

const LABOR_MULTIPLIERS: Record<LaborComplexity, number> = {
  Simple: 0.85,
  Moderate: 1.0,
  Complex: 1.55,
};

const PERMITS_PCT = 0.08;
const TIMELINE_WEEKS: Record<ProjectType, number> = {
  'Kitchen Remodel': 6,
  Bathroom: 4,
  Roofing: 2,
  Flooring: 1.5,
  Electrical: 2,
  Plumbing: 2.5,
  'Full Renovation': 14,
  'New Construction': 26,
};

const TIMELINE_MULTIPLIERS: Record<LaborComplexity, number> = {
  Simple: 0.8,
  Moderate: 1.0,
  Complex: 1.5,
};

export interface EstimationResult {
  lowCost: number;
  highCost: number;
  materialsPct: number;
  laborPct: number;
  permitsPct: number;
  timelineWeeks: number;
  breakdown: { name: string; value: number; color: string }[];
  risks: string[];
}

export function calculateEstimate(
  projectType: ProjectType,
  sqft: number,
  material: MaterialQuality,
  labor: LaborComplexity
): EstimationResult | null {
  if (!projectType || !sqft || !material || !labor) return null;

  const baseRate = BASE_SQFT_RATES[projectType];
  const matMult = MATERIAL_MULTIPLIERS[material];
  const labMult = LABOR_MULTIPLIERS[labor];

  const baseCost = baseRate * sqft;
  const materialCost = baseCost * matMult * 0.52;
  const laborCost = baseCost * labMult * 0.40;
  const permitsCost = baseCost * PERMITS_PCT;

  const lowCost = Math.round(materialCost * 0.9 + laborCost * 0.9 + permitsCost * 0.95);
  const highCost = Math.round(materialCost * 1.15 + laborCost * 1.15 + permitsCost * 1.1);

  const total = materialCost + laborCost + permitsCost;
  const materialsPct = Math.round((materialCost / total) * 100);
  const laborPct = Math.round((laborCost / total) * 100);
  const permitsPct = Math.round((permitsCost / total) * 100);

  const baseWeeks = TIMELINE_WEEKS[projectType];
  const timelineWeeks = Math.round(baseWeeks * TIMELINE_MULTIPLIERS[labor] * 10) / 10;

  const risks: string[] = [];
  if (labor === 'Complex') {
    risks.push('Complex labor may require specialized subcontractors — factor 15% contingency.');
  }
  if (material === 'Luxury') {
    risks.push('Luxury materials may have extended lead times — confirm delivery schedules.');
  }
  if (projectType === 'Full Renovation' || projectType === 'New Construction') {
    risks.push('Large-scope projects carry higher variance — recommend phased contract milestones.');
  }
  if (timelineWeeks > 8) {
    risks.push('Extended timeline increases exposure to weather and market price fluctuations.');
  }
  if (risks.length === 0) {
    risks.push('Standard risk profile — typical safeguards recommended.');
  }

  const breakdown = [
    { name: 'Materials', value: materialsPct, color: '#7B2FF7' },
    { name: 'Labor', value: laborPct, color: '#3B6BF7' },
    { name: 'Permits & Fees', value: permitsPct, color: '#00D4FF' },
  ];

  return {
    lowCost,
    highCost,
    materialsPct,
    laborPct,
    permitsPct,
    timelineWeeks,
    breakdown,
    risks,
  };
}
