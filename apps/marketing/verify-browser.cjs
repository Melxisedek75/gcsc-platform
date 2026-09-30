const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = __dirname;
const output = path.resolve(__dirname, '../../.tmp/marketing-browser');
fs.mkdirSync(output, { recursive: true });
const errors = [];
const cases = [];
const failures = [];
function check(condition, message) { if (!condition) failures.push(message); }
function contrast(foreground, background) {
  const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const pair = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (pair[0] + 0.05) / (pair[1] + 0.05);
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.GCSC_BROWSER_CHANNEL || undefined, headless: true });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', javaScriptEnabled: false });
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const variants = [
      ['desktop', 1440, 1000, false], ['wide', 1920, 1080, false],
      ['tablet', 768, 1024, false], ['mobile', 390, 844, false],
      ['small-mobile', 360, 800, false], ['narrow', 320, 740, false],
      ['landscape', 844, 390, false], ['text-200', 390, 844, true],
    ];
    for (const [name, width, height, enlarge] of variants) {
      await page.setViewportSize({ width, height });
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      if (enlarge) await page.evaluate(() => {
        const sizes = [...document.querySelectorAll('body *')].map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
        for (const [el, size] of sizes) el.style.fontSize = `${size * 2}px`;
      });
      await page.locator('.hero-image').evaluate(img => img.decode());
      const metrics = await page.evaluate(() => {
        const bounds = selector => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
        };
        const image = document.querySelector('.hero-image');
        return {
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          hero: bounds('.hero'), content: bounds('.hero-content'),
          title: bounds('.hero h1'), actions: bounds('.hero-actions'), status: bounds('.hero-status'),
          image: { width: image.naturalWidth, height: image.naturalHeight },
        };
      });
      cases.push({ name, ...metrics });
      check(metrics.scrollWidth <= width + 1, `${name}: horizontal overflow ${metrics.scrollWidth} > ${width}`);
      check(metrics.content.top >= metrics.hero.top - 1 && metrics.content.bottom <= metrics.hero.bottom + 1,
        `${name}: hero clips its content`);
      check(metrics.image.width > 0 && metrics.image.height > 0, `${name}: hero image missing`);
      await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
      if (name === 'mobile') {
        await page.locator('.mobile-menu summary').click();
        check(await page.locator('.mobile-menu').getAttribute('open') !== null, 'Mobile menu did not open');
        check(await page.locator('.mobile-menu a[href="#pilot"]').isVisible(), 'Mobile pilot link unavailable');
        await page.locator('.mobile-menu a[href="#pilot"]').click();
        check(page.url().endsWith('#pilot'), 'Mobile anchor did not navigate');
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.locator('.future .text-link-light').hover();
    const darkHover = await page.locator('.future .text-link-light').evaluate(el => ({
      foreground: getComputedStyle(el).color,
      background: getComputedStyle(el.closest('.future')).backgroundColor,
    }));
    darkHover.ratio = contrast(darkHover.foreground, darkHover.background);
    check(darkHover.ratio >= 4.5, `Dark hover contrast ${darkHover.ratio}`);
    const focus = [];
    for (const [selector, parent] of [['.pilot .text-link', '.pilot'], ['.future .text-link-light', '.future']]) {
      await page.keyboard.press('Tab');
      await page.locator(selector).focus();
      const style = await page.locator(selector).evaluate((el, parent) => ({
        foreground: getComputedStyle(el).outlineColor,
        outline: getComputedStyle(el).outlineStyle,
        width: getComputedStyle(el).outlineWidth,
        background: getComputedStyle(el.closest(parent)).backgroundColor,
      }), parent);
      style.ratio = contrast(style.foreground, style.background);
      check(style.outline !== 'none' && parseFloat(style.width) >= 3 && style.ratio >= 3, `Focus visibility ${selector}`);
      focus.push({ selector, ...style });
    }
    check(errors.length === 0, `Page errors: ${errors.join(', ')}`);
    const report = { browser: await browser.version(), cases, darkHover, focus, errors, failures };
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    assert.equal(failures.length, 0, failures.join('\n'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
