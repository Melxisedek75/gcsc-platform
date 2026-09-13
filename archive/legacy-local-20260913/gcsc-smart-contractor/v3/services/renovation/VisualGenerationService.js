/**
 * ============================================================================
 * GCSC Renovation — Visual Generation Service (before / after preview)
 * ============================================================================
 *
 * Produces an "after" preview image for a renovation. The default provider is a
 * fully offline MOCK that renders a deterministic styled SVG (returned as a
 * data: URL) so the whole feature is demoable with NO real image-AI key.
 *
 * PROVIDER MODEL
 *   A provider implements:
 *     generateVisual(input) -> Promise<{ outputImageUrl, status, prompt? }>
 *   Swap `MockVisualProvider` for a real adapter (Replicate, Gemini image, SDXL,
 *   etc.) without touching callers — see services/renovation/README.md.
 *
 * NEVER throws to the caller on a provider error; returns a failed status object
 * so the route can persist the failure and the UI can show a clean error state.
 * ============================================================================
 */

'use strict';

const crypto = require('crypto');
const { getProjectTypeConfig } = require('./constants');

// Palette per style so the mock "after" image visibly reflects the choice.
const STYLE_PALETTE = {
  modern: { sky: '#dbeafe', wall: '#e2e8f0', accent: '#7B2FF7', roof: '#1e293b', trim: '#0f172a' },
  classic: { sky: '#fef3c7', wall: '#f5f0e6', accent: '#b45309', roof: '#7c2d12', trim: '#3f2d1e' },
  luxury: { sky: '#0b1020', wall: '#1f2937', accent: '#d4af37', roof: '#111827', trim: '#d4af37' },
  budget: { sky: '#f1f5f9', wall: '#e5e7eb', accent: '#3B6BF7', roof: '#475569', trim: '#334155' },
  energy_efficient: { sky: '#d1fae5', wall: '#ecfdf5', accent: '#10B981', roof: '#065f46', trim: '#064e3b' },
};

function clampStyle(style) {
  const value = String(style || 'modern').toLowerCase().trim();
  return STYLE_PALETTE[value] ? value : 'modern';
}

function escapeXml(text) {
  return String(text || '').replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ));
}

/** Build a small deterministic SVG that reads as a styled "after" render. */
function buildAfterSvg(projectType, style, seedHex) {
  const config = getProjectTypeConfig(projectType);
  const p = STYLE_PALETTE[style];
  const label = escapeXml(config.label);
  const styleLabel = escapeXml(style.replace('_', ' '));
  // Use a couple of seed bytes to nudge window layout so two requests differ.
  const windows = 2 + (parseInt(seedHex.slice(0, 2), 16) % 3);

  let windowRects = '';
  for (let i = 0; i < windows; i += 1) {
    const x = 150 + i * 130;
    windowRects += `<rect x="${x}" y="250" width="80" height="90" rx="6" fill="${p.sky}" stroke="${p.trim}" stroke-width="3"/>`;
    windowRects += `<line x1="${x + 40}" y1="250" x2="${x + 40}" y2="340" stroke="${p.trim}" stroke-width="2"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.sky}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#sky)"/>
  <rect x="0" y="400" width="800" height="100" fill="#cbd5e1"/>
  <polygon points="100,200 400,80 700,200" fill="${p.roof}"/>
  <rect x="130" y="200" width="540" height="200" fill="${p.wall}" stroke="${p.trim}" stroke-width="4"/>
  <rect x="360" y="300" width="80" height="100" rx="4" fill="${p.accent}"/>
  ${windowRects}
  <rect x="0" y="0" width="800" height="46" fill="${p.accent}" opacity="0.92"/>
  <text x="20" y="30" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff">AFTER · ${label}</text>
  <text x="20" y="470" font-family="Arial, sans-serif" font-size="16" fill="#475569">${styleLabel} preview · automated concept, not a final rendering</text>
</svg>`;
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

class MockVisualProvider {
  get name() {
    return 'mock';
  }

  async generateVisual(input = {}) {
    const style = clampStyle(input.stylePreference);
    const seed = crypto
      .createHash('sha256')
      .update(`${input.projectType || ''}|${input.prompt || ''}|${input.inputImageUrl || ''}|${Date.now()}`)
      .digest('hex');
    const svg = buildAfterSvg(input.projectType, style, seed);
    return {
      status: 'completed',
      outputImageUrl: svgToDataUrl(svg),
      prompt: input.prompt || '',
    };
  }
}

class VisualGenerationService {
  /**
   * @param {object} [deps]
   * @param {{ name: string, generateVisual: Function }} [deps.provider]
   */
  constructor({ provider } = {}) {
    this.provider = provider || new MockVisualProvider();
  }

  /**
   * @param {object} input
   * @param {string} input.projectType
   * @param {string} [input.prompt]
   * @param {string} [input.stylePreference]
   * @param {string} [input.inputImageUrl]
   * @returns {Promise<{
   *   provider: string,
   *   status: 'completed'|'failed',
   *   inputImageUrl: string,
   *   outputImageUrl: string,
   *   prompt: string,
   *   errorMessage: string,
   *   note: string
   * }>}
   */
  async generateVisual(input = {}) {
    const providerName = this.provider.name || 'mock';
    const inputImageUrl = String(input.inputImageUrl || '');
    try {
      const result = await this.provider.generateVisual(input);
      return {
        provider: providerName,
        status: result.status === 'completed' ? 'completed' : 'failed',
        inputImageUrl,
        outputImageUrl: result.outputImageUrl || '',
        prompt: result.prompt || String(input.prompt || ''),
        errorMessage: '',
        note:
          providerName === 'mock'
            ? 'Automated concept preview. Connect a real image provider to generate photoreal renderings.'
            : '',
      };
    } catch (err) {
      return {
        provider: providerName,
        status: 'failed',
        inputImageUrl,
        outputImageUrl: '',
        prompt: String(input.prompt || ''),
        errorMessage: err && err.message ? err.message : 'Visual generation failed',
        note: '',
      };
    }
  }
}

module.exports = { VisualGenerationService, MockVisualProvider };
