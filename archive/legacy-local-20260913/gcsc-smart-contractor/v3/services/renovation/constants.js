/**
 * ============================================================================
 * GCSC Renovation Module — Shared Constants & Project-Type Configuration
 * ============================================================================
 *
 * Pure data. No external dependencies. Every renovation service reads its
 * project-type knowledge from here so the catalog stays in one place.
 *
 * Money figures are PRELIMINARY ESTIMATE PLACEHOLDERS in US dollars — they are
 * not quotes. Risk levels are HEURISTIC screening only, never legal approval.
 * ============================================================================
 */

'use strict';

// Required by the spec — surfaced anywhere a permit/code risk is shown.
const PERMIT_RISK_DISCLAIMER =
  'Preliminary permit/code risk screening only. Final approval requires licensed professionals and local jurisdiction review.';

// General homeowner-facing disclaimer for the whole analysis.
const ANALYSIS_DISCLAIMER =
  'This is an automated planning estimate to help you scope your project before hiring a pro. ' +
  'Actual scope, materials, cost, and timeline are confirmed by licensed professionals after an on-site visit.';

const RISK_LEVELS = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };

const STYLE_PREFERENCES = ['modern', 'classic', 'luxury', 'budget', 'energy_efficient'];

// Cost multiplier per style choice (applied to the base placeholder range).
const STYLE_COST_MULTIPLIER = {
  budget: 0.82,
  modern: 1.0,
  classic: 1.08,
  energy_efficient: 1.18,
  luxury: 1.6,
};

// Keywords in the homeowner's description that escalate permit risk to HIGH,
// regardless of the base project type (structural / systems work).
const HIGH_RISK_KEYWORDS = [
  'structural',
  'load-bearing',
  'load bearing',
  'foundation',
  'addition',
  'add a room',
  'add room',
  'second story',
  'remove wall',
  'removing a wall',
  'knock down wall',
  'tear down wall',
  'electrical panel',
  'sub-panel',
  'subpanel',
  'service upgrade',
  'plumbing relocation',
  'relocate plumbing',
  'move plumbing',
  'gas line',
  'move the kitchen',
  'move bathroom',
];

/**
 * Per-project-type knowledge base.
 *
 * baseRisk      — heuristic starting risk (may escalate via keywords).
 * costLow/High  — preliminary placeholder range in USD (whole project).
 * totalDays     — representative working-day estimate.
 * category      — maps to the marketplace project category on conversion.
 * scope         — default scope-of-work line items.
 * materials     — grouped material categories the homeowner will choose.
 * milestones    — release-schedule template (percentages sum to 100).
 * timeline      — named phases with day counts.
 */
const PROJECT_TYPES = {
  siding: {
    label: 'Siding Replacement',
    category: 'exterior',
    baseRisk: RISK_LEVELS.MEDIUM,
    costLow: 8000,
    costHigh: 20000,
    totalDays: 12,
    scope: [
      'Remove existing siding and inspect sheathing for damage',
      'Repair or replace damaged sheathing and trim',
      'Install weather-resistant barrier and flashing',
      'Install new siding panels, corners, and J-channel',
      'Caulk, paint/finish, and full site cleanup',
    ],
    materials: [
      { category: 'Siding material', items: ['Fiber cement', 'Vinyl', 'Engineered wood', 'Composite'] },
      { category: 'Weather barrier', items: ['House wrap', 'Rainscreen', 'Flashing tape'] },
      { category: 'Trim & finish', items: ['Corner trim', 'J-channel', 'Exterior caulk', 'Paint / factory finish'] },
    ],
    milestones: [
      { title: 'Materials ordered & tear-off', pct: 20, deliverable: 'Old siding removed, sheathing inspected, materials on site' },
      { title: 'Weather barrier & flashing', pct: 20, deliverable: 'House wrap and flashing installed and approved' },
      { title: 'Siding installation', pct: 35, deliverable: 'New siding panels installed across all elevations' },
      { title: 'Trim & finish', pct: 15, deliverable: 'Corners, trim, caulking, and finish complete' },
      { title: 'Final inspection & cleanup', pct: 10, deliverable: 'Walkthrough passed and site fully cleaned' },
    ],
    timeline: [
      { name: 'Materials & tear-off', days: 3 },
      { name: 'Barrier & flashing', days: 2 },
      { name: 'Siding install', days: 4 },
      { name: 'Trim & finish', days: 2 },
      { name: 'Final inspection', days: 1 },
    ],
  },

  windows: {
    label: 'Window Replacement',
    category: 'exterior',
    baseRisk: RISK_LEVELS.MEDIUM,
    costLow: 6000,
    costHigh: 18000,
    totalDays: 6,
    scope: [
      'Measure all openings and order made-to-fit units',
      'Remove existing windows and inspect framing',
      'Install new units, level, and flash openings',
      'Insulate gaps and install interior/exterior trim',
      'Final adjustment, weather-seal, and cleanup',
    ],
    materials: [
      { category: 'Window type', items: ['Double-hung', 'Casement', 'Sliding', 'Picture / fixed'] },
      { category: 'Frame & glass', items: ['Vinyl frame', 'Fiberglass frame', 'Double-pane Low-E', 'Triple-pane'] },
      { category: 'Trim & seal', items: ['Interior casing', 'Exterior trim', 'Flashing tape', 'Low-expansion foam'] },
    ],
    milestones: [
      { title: 'Measure & order units', pct: 25, deliverable: 'Final measurements taken, units ordered' },
      { title: 'Removal of old units', pct: 20, deliverable: 'Old windows removed, openings prepped' },
      { title: 'Installation & flashing', pct: 30, deliverable: 'New units set, leveled, and flashed' },
      { title: 'Insulation & trim', pct: 15, deliverable: 'Gaps insulated, interior/exterior trim installed' },
      { title: 'Final adjustment & inspection', pct: 10, deliverable: 'Operation checked, sealed, walkthrough passed' },
    ],
    timeline: [
      { name: 'Measure & order', days: 1 },
      { name: 'Removal', days: 1 },
      { name: 'Installation', days: 2 },
      { name: 'Trim & insulate', days: 1 },
      { name: 'Final', days: 1 },
    ],
  },

  doors: {
    label: 'Door Replacement',
    category: 'exterior',
    baseRisk: RISK_LEVELS.MEDIUM,
    costLow: 1500,
    costHigh: 6000,
    totalDays: 3,
    scope: [
      'Measure openings and order pre-hung units',
      'Remove existing doors and inspect framing',
      'Set, level, and shim new units; flash thresholds',
      'Install hardware, weatherstripping, and trim',
      'Adjust operation and final cleanup',
    ],
    materials: [
      { category: 'Door type', items: ['Entry / exterior', 'Patio / sliding', 'French', 'Interior'] },
      { category: 'Material', items: ['Fiberglass', 'Steel', 'Solid wood', 'Composite'] },
      { category: 'Hardware', items: ['Lockset', 'Smart lock', 'Hinges', 'Weatherstripping'] },
    ],
    milestones: [
      { title: 'Measure & order units', pct: 25, deliverable: 'Openings measured, units ordered' },
      { title: 'Removal & prep', pct: 20, deliverable: 'Old doors removed, framing inspected' },
      { title: 'Installation & flashing', pct: 30, deliverable: 'New units set, leveled, and flashed' },
      { title: 'Hardware & trim', pct: 15, deliverable: 'Hardware, weatherstripping, and trim installed' },
      { title: 'Final adjustment & inspection', pct: 10, deliverable: 'Operation checked, walkthrough passed' },
    ],
    timeline: [
      { name: 'Measure & order', days: 1 },
      { name: 'Install', days: 1 },
      { name: 'Hardware & final', days: 1 },
    ],
  },

  bathroom: {
    label: 'Bathroom Remodel',
    category: 'interior',
    baseRisk: RISK_LEVELS.MEDIUM,
    costLow: 9000,
    costHigh: 28000,
    totalDays: 18,
    scope: [
      'Demolition of existing fixtures, tile, and vanity',
      'Rough plumbing and any electrical updates',
      'Waterproofing and substrate / backer board',
      'Tile, fixtures, vanity, and lighting installation',
      'Final plumbing trim, sealing, and punch list',
    ],
    materials: [
      { category: 'Fixtures', items: ['Toilet', 'Tub / shower', 'Vanity', 'Faucets'] },
      { category: 'Surfaces', items: ['Floor tile', 'Wall tile', 'Countertop', 'Waterproof membrane'] },
      { category: 'Finishes', items: ['Lighting', 'Mirror', 'Hardware', 'Paint'] },
    ],
    milestones: [
      { title: 'Demo & rough plumbing', pct: 20, deliverable: 'Old bath removed, rough-in updated and inspected' },
      { title: 'Waterproofing & substrate', pct: 20, deliverable: 'Waterproofing and backer board complete' },
      { title: 'Tile & fixtures', pct: 30, deliverable: 'Tile set, tub/shower and major fixtures installed' },
      { title: 'Vanity & finish', pct: 20, deliverable: 'Vanity, lighting, mirror, and finishes installed' },
      { title: 'Final & punch list', pct: 10, deliverable: 'Plumbing trim, sealing, and walkthrough complete' },
    ],
    timeline: [
      { name: 'Demo & rough-in', days: 4 },
      { name: 'Waterproof & substrate', days: 3 },
      { name: 'Tile & fixtures', days: 6 },
      { name: 'Vanity & finish', days: 3 },
      { name: 'Final', days: 2 },
    ],
  },

  kitchen: {
    label: 'Kitchen Remodel',
    category: 'interior',
    baseRisk: RISK_LEVELS.MEDIUM,
    costLow: 15000,
    costHigh: 55000,
    totalDays: 30,
    scope: [
      'Demolition of cabinets, counters, and flooring',
      'Rough plumbing, electrical, and any venting updates',
      'Cabinet installation and alignment',
      'Countertops, backsplash, and appliance install',
      'Finish carpentry, paint, and final walkthrough',
    ],
    materials: [
      { category: 'Cabinets', items: ['Stock', 'Semi-custom', 'Custom', 'Hardware'] },
      { category: 'Surfaces', items: ['Quartz', 'Granite', 'Butcher block', 'Backsplash tile'] },
      { category: 'Appliances & finish', items: ['Range', 'Refrigerator', 'Sink & faucet', 'Lighting'] },
    ],
    milestones: [
      { title: 'Demo & rough-in', pct: 20, deliverable: 'Kitchen demolished, rough plumbing/electrical inspected' },
      { title: 'Cabinets', pct: 25, deliverable: 'Cabinets installed and aligned' },
      { title: 'Countertops & backsplash', pct: 25, deliverable: 'Counters templated, installed, backsplash set' },
      { title: 'Appliances & finish', pct: 20, deliverable: 'Appliances, sink, lighting, and finishes installed' },
      { title: 'Final walkthrough', pct: 10, deliverable: 'Punch list cleared and walkthrough passed' },
    ],
    timeline: [
      { name: 'Demo & rough-in', days: 6 },
      { name: 'Cabinets', days: 7 },
      { name: 'Counters & backsplash', days: 8 },
      { name: 'Appliances & finish', days: 6 },
      { name: 'Final', days: 3 },
    ],
  },

  room_addition: {
    label: 'Room Addition',
    category: 'structural',
    baseRisk: RISK_LEVELS.HIGH,
    costLow: 30000,
    costHigh: 120000,
    totalDays: 90,
    scope: [
      'Permitting, engineering, and foundation work',
      'Framing, roof tie-in, windows, and exterior',
      'Rough mechanical, electrical, and plumbing',
      'Insulation, drywall, flooring, and finishes',
      'Final inspections and certificate of occupancy',
    ],
    materials: [
      { category: 'Structure', items: ['Foundation', 'Framing lumber', 'Roofing', 'Sheathing'] },
      { category: 'Envelope', items: ['Windows', 'Exterior doors', 'Siding', 'Insulation'] },
      { category: 'Interior', items: ['Drywall', 'Flooring', 'Trim', 'Paint'] },
    ],
    milestones: [
      { title: 'Permit & foundation', pct: 20, deliverable: 'Permits issued, foundation poured and inspected' },
      { title: 'Framing & roof', pct: 25, deliverable: 'Walls framed, roof tied in, dried-in' },
      { title: 'Rough mechanicals', pct: 20, deliverable: 'Electrical, plumbing, HVAC rough-in inspected' },
      { title: 'Insulation, drywall & finish', pct: 25, deliverable: 'Insulated, drywalled, flooring and finishes complete' },
      { title: 'Final inspection & CO', pct: 10, deliverable: 'Final inspections passed, certificate of occupancy' },
    ],
    timeline: [
      { name: 'Permit & foundation', days: 21 },
      { name: 'Framing & roof', days: 21 },
      { name: 'Rough mechanicals', days: 14 },
      { name: 'Insulation & finish', days: 25 },
      { name: 'Final', days: 9 },
    ],
  },

  deck: {
    label: 'Deck Build',
    category: 'exterior',
    baseRisk: RISK_LEVELS.HIGH,
    costLow: 5000,
    costHigh: 18000,
    totalDays: 14,
    scope: [
      'Permitting and layout of footings',
      'Excavate and pour footings / set posts',
      'Frame beams, joists, and ledger attachment',
      'Install decking, railings, and stairs',
      'Final inspection, sealing, and cleanup',
    ],
    materials: [
      { category: 'Decking', items: ['Pressure-treated', 'Composite', 'Cedar', 'Hardwood'] },
      { category: 'Structure', items: ['Posts', 'Beams', 'Joists', 'Concrete footings'] },
      { category: 'Rails & stairs', items: ['Railing system', 'Balusters', 'Stair stringers', 'Fasteners'] },
    ],
    milestones: [
      { title: 'Permit & footings', pct: 20, deliverable: 'Permit issued, footings poured and inspected' },
      { title: 'Framing', pct: 25, deliverable: 'Ledger, beams, and joists framed and inspected' },
      { title: 'Decking & rails', pct: 30, deliverable: 'Decking boards and railing system installed' },
      { title: 'Stairs & finish', pct: 15, deliverable: 'Stairs built, sealing and finish applied' },
      { title: 'Final inspection', pct: 10, deliverable: 'Final inspection passed and site cleaned' },
    ],
    timeline: [
      { name: 'Permit & footings', days: 4 },
      { name: 'Framing', days: 4 },
      { name: 'Decking & rails', days: 3 },
      { name: 'Stairs & finish', days: 2 },
      { name: 'Final', days: 1 },
    ],
  },

  roofing: {
    label: 'Roof Replacement',
    category: 'exterior',
    baseRisk: RISK_LEVELS.MEDIUM,
    costLow: 8000,
    costHigh: 25000,
    totalDays: 7,
    scope: [
      'Tear off existing roofing to the deck',
      'Inspect and replace damaged decking',
      'Install underlayment and ice-and-water shield',
      'Install shingles, flashing, and ventilation',
      'Final inspection, magnet sweep, and cleanup',
    ],
    materials: [
      { category: 'Roofing material', items: ['Architectural shingles', 'Metal', 'Standing seam', 'Tile'] },
      { category: 'Underlayment', items: ['Synthetic underlayment', 'Ice & water shield', 'Drip edge'] },
      { category: 'Flashing & vents', items: ['Step flashing', 'Ridge vent', 'Pipe boots', 'Valley metal'] },
    ],
    milestones: [
      { title: 'Materials & tear-off', pct: 25, deliverable: 'Old roofing removed, materials staged' },
      { title: 'Deck & underlayment', pct: 20, deliverable: 'Decking repaired, underlayment installed' },
      { title: 'Shingle installation', pct: 30, deliverable: 'Roofing material installed across all planes' },
      { title: 'Flashing & vents', pct: 15, deliverable: 'Flashing, vents, and penetrations sealed' },
      { title: 'Final inspection & cleanup', pct: 10, deliverable: 'Inspection passed, magnet sweep, cleanup done' },
    ],
    timeline: [
      { name: 'Tear-off', days: 2 },
      { name: 'Deck & underlayment', days: 1 },
      { name: 'Shingles', days: 2 },
      { name: 'Flashing & vents', days: 1 },
      { name: 'Final', days: 1 },
    ],
  },

  fence: {
    label: 'Fence Installation',
    category: 'exterior',
    baseRisk: RISK_LEVELS.MEDIUM,
    costLow: 2500,
    costHigh: 9000,
    totalDays: 5,
    scope: [
      'Verify property lines and locate utilities',
      'Lay out the fence run and set posts in concrete',
      'Install rails, panels, or pickets',
      'Hang gates and install hardware',
      'Final alignment, finish, and cleanup',
    ],
    materials: [
      { category: 'Fence material', items: ['Wood', 'Vinyl', 'Aluminum', 'Chain-link'] },
      { category: 'Posts & footings', items: ['Posts', 'Concrete', 'Post caps', 'Brackets'] },
      { category: 'Gates & hardware', items: ['Gate frame', 'Hinges', 'Latch', 'Drop rod'] },
    ],
    milestones: [
      { title: 'Layout & materials', pct: 25, deliverable: 'Property lines verified, utilities located, materials on site' },
      { title: 'Post setting', pct: 25, deliverable: 'Posts set in concrete and cured' },
      { title: 'Panels / pickets', pct: 30, deliverable: 'Rails and panels or pickets installed' },
      { title: 'Gates & hardware', pct: 10, deliverable: 'Gates hung and hardware installed' },
      { title: 'Final walkthrough', pct: 10, deliverable: 'Alignment checked, finish applied, site cleaned' },
    ],
    timeline: [
      { name: 'Layout & materials', days: 1 },
      { name: 'Post setting', days: 2 },
      { name: 'Panels', days: 1 },
      { name: 'Gates & final', days: 1 },
    ],
  },

  exterior_paint: {
    label: 'Exterior Painting',
    category: 'exterior',
    baseRisk: RISK_LEVELS.LOW,
    costLow: 3000,
    costHigh: 9000,
    totalDays: 5,
    scope: [
      'Pressure wash and surface preparation',
      'Scrape, sand, and repair damaged surfaces',
      'Caulk gaps and prime bare/repaired areas',
      'Apply finish coats to siding and trim',
      'Touch-up, inspection, and cleanup',
    ],
    materials: [
      { category: 'Paint', items: ['Exterior acrylic', 'Elastomeric', 'Primer', 'Trim enamel'] },
      { category: 'Prep', items: ['Caulk', 'Wood filler', 'Sandpaper', 'Masking'] },
      { category: 'Color & sheen', items: ['Body color', 'Trim color', 'Accent color', 'Sheen'] },
    ],
    milestones: [
      { title: 'Prep & wash', pct: 25, deliverable: 'Surfaces washed, scraped, and sanded' },
      { title: 'Repairs & priming', pct: 25, deliverable: 'Caulking, repairs, and priming complete' },
      { title: 'First coat', pct: 25, deliverable: 'First finish coat applied to all surfaces' },
      { title: 'Final coat', pct: 15, deliverable: 'Final coat applied to body and trim' },
      { title: 'Touch-up & walkthrough', pct: 10, deliverable: 'Touch-ups done and walkthrough passed' },
    ],
    timeline: [
      { name: 'Prep & wash', days: 1 },
      { name: 'Repairs & prime', days: 1 },
      { name: 'First coat', days: 1 },
      { name: 'Final coat', days: 1 },
      { name: 'Touch-up', days: 1 },
    ],
  },

  interior_paint: {
    label: 'Interior Painting',
    category: 'interior',
    baseRisk: RISK_LEVELS.LOW,
    costLow: 2000,
    costHigh: 7000,
    totalDays: 4,
    scope: [
      'Protect floors, furniture, and fixtures',
      'Patch, sand, and repair walls and ceilings',
      'Caulk trim and prime patched/bare areas',
      'Apply finish coats to walls, ceilings, and trim',
      'Touch-up, cleanup, and walkthrough',
    ],
    materials: [
      { category: 'Paint', items: ['Wall paint', 'Ceiling paint', 'Trim enamel', 'Primer'] },
      { category: 'Prep', items: ['Spackle', 'Painters tape', 'Drop cloths', 'Sandpaper'] },
      { category: 'Color & sheen', items: ['Wall color', 'Accent wall', 'Trim color', 'Sheen'] },
    ],
    milestones: [
      { title: 'Prep & masking', pct: 25, deliverable: 'Rooms protected, surfaces masked' },
      { title: 'Patch & prime', pct: 25, deliverable: 'Walls patched, sanded, and primed' },
      { title: 'First coat', pct: 25, deliverable: 'First finish coat applied' },
      { title: 'Final coat', pct: 15, deliverable: 'Final coat on walls, ceilings, and trim' },
      { title: 'Touch-up & walkthrough', pct: 10, deliverable: 'Touch-ups done, cleanup and walkthrough complete' },
    ],
    timeline: [
      { name: 'Prep & masking', days: 1 },
      { name: 'Patch & prime', days: 1 },
      { name: 'Coats', days: 1 },
      { name: 'Touch-up', days: 1 },
    ],
  },
};

// Cosmetic / finish-only project types that stay LOW risk.
const LOW_RISK_TYPES = new Set(['exterior_paint', 'interior_paint', 'flooring', 'cabinet', 'cabinets']);

const DEFAULT_PROJECT_TYPE = {
  label: 'General Renovation',
  category: 'general',
  baseRisk: RISK_LEVELS.MEDIUM,
  costLow: 4000,
  costHigh: 20000,
  totalDays: 14,
  scope: [
    'Confirm scope with an on-site assessment',
    'Order materials and stage the work area',
    'Complete the core installation work',
    'Apply finishes and detail the work',
    'Final walkthrough and cleanup',
  ],
  materials: [
    { category: 'Primary materials', items: ['To be confirmed on site'] },
    { category: 'Finishes', items: ['To be confirmed on site'] },
  ],
  milestones: [
    { title: 'Agreement & mobilization', pct: 20, deliverable: 'Scope confirmed, materials ordered, work scheduled' },
    { title: 'Preparation', pct: 20, deliverable: 'Demolition / prep complete and inspected' },
    { title: 'Core work', pct: 30, deliverable: 'Main installation work complete' },
    { title: 'Finishes', pct: 20, deliverable: 'Finish work complete' },
    { title: 'Final walkthrough', pct: 10, deliverable: 'Punch list cleared and walkthrough passed' },
  ],
  timeline: [
    { name: 'Mobilization', days: 3 },
    { name: 'Preparation', days: 3 },
    { name: 'Core work', days: 4 },
    { name: 'Finishes', days: 3 },
    { name: 'Final', days: 1 },
  ],
};

function getProjectTypeConfig(projectType) {
  const key = String(projectType || '').toLowerCase().trim();
  return PROJECT_TYPES[key] || DEFAULT_PROJECT_TYPE;
}

function isKnownProjectType(projectType) {
  const key = String(projectType || '').toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(PROJECT_TYPES, key);
}

module.exports = {
  PERMIT_RISK_DISCLAIMER,
  ANALYSIS_DISCLAIMER,
  RISK_LEVELS,
  STYLE_PREFERENCES,
  STYLE_COST_MULTIPLIER,
  HIGH_RISK_KEYWORDS,
  LOW_RISK_TYPES,
  PROJECT_TYPES,
  DEFAULT_PROJECT_TYPE,
  getProjectTypeConfig,
  isKnownProjectType,
};
