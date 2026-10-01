const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    channel: process.env.GCSC_BROWSER_CHANNEL || undefined,
    headless: true,
  });
  const errors = [];
  let cases = 0;
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.route(/^https?:/, route => route.abort());
    page.on('pageerror', error => errors.push(error.message));
    const url = pathToFileURL(path.join(__dirname, 'VIDEO-ANIMATIC-A-B.html')).href;
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(url);
      for (const direction of ['A', 'B']) {
        for (const format of ['explainer', 'hero']) {
          await page.locator(`[data-direction="${direction}"]`).click();
          await page.locator(`[data-format="${format}"]`).click();
          const metrics = await page.evaluate(() => {
            const stage = document.querySelector('.stage').getBoundingClientRect();
            const content = document.querySelector('.stage-inner').getBoundingClientRect();
            const title = document.querySelector('h1').getBoundingClientRect();
            const poster = document.querySelector('.scene-image');
            return {
              scrollWidth: document.documentElement.scrollWidth,
              contentTop: content.top,
              contentBottom: content.bottom,
              stageTop: stage.top,
              stageBottom: stage.bottom,
              titleRight: title.right,
              posterWidth: poster.naturalWidth,
            };
          });
          const label = `${width}px ${direction}/${format}`;
          assert.ok(metrics.posterWidth > 0, `${label}: poster did not decode`);
          assert.ok(metrics.scrollWidth <= width + 1, `${label}: horizontal overflow`);
          assert.ok(metrics.contentTop >= metrics.stageTop - 1, `${label}: clipped top`);
          assert.ok(metrics.contentBottom <= metrics.stageBottom + 1, `${label}: clipped bottom`);
          assert.ok(metrics.titleRight <= width + 1, `${label}: title overflow`);
          cases++;
        }
      }
    }
    await page.locator('[data-format="hero"]').click();
    await page.locator('#play').click();
    assert.equal(await page.locator('#play').textContent(), 'Pause');
    await page.locator('#play').click();
    assert.equal(await page.locator('#play').textContent(), 'Play');
    assert.deepEqual(errors, []);
    console.log(`video animatic Edge browser PASS: ${cases} layout cases, controls, no page errors`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
