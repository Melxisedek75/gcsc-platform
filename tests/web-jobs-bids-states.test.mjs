import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('bids expose denied, loading, error/retry, empty and responsive result states', () => {
  const source = read('apps/web/src/pages/dashboard/BidsPanel.tsx');
  assert.match(source, /Homeowner bids are managed/);
  assert.match(source, /aria-busy=\{loading\}/);
  assert.match(source, /role="alert"/);
  assert.match(source, /onClick=\{\(\) => void loadBids\(\)\}/);
  assert.match(source, /md:hidden/);
  assert.match(source, /hidden md:block/);
  assert.match(source, /No bids match your filter/);
});

test('projects expose loading, error/retry, empty and bounded mobile overflow states', () => {
  const source = read('apps/web/src/pages/dashboard/ProjectsPanel.tsx');
  assert.match(source, /aria-busy=\{loading\}/);
  assert.match(source, /role="alert"/);
  assert.match(source, /onClick=\{\(\) => void loadProjects\(\)\}/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /No projects yet|No open projects/);
});
