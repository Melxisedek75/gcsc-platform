const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadAnimatic() {
  const html = fs.readFileSync(path.join(__dirname, 'VIDEO-ANIMATIC-A-B.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'inline animatic script exists');

  class Element {
    constructor() {
      this.dataset = {};
      this.style = {};
      this.attributes = {};
      this.listeners = {};
      this.children = [];
      this.textContent = '';
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    dispatch(name) { this.listeners[name]?.({ target: this }); }
    replaceChildren(...children) { this.children = children; }
  }

  const ids = Object.fromEntries(
    ['scene-number', 'scene-title', 'scene-shot', 'end-slate', 'scrub', 'time',
      'play', 'narration', 'production', 'timeline'].map(id => [id, new Element()]),
  );
  const stage = new Element();
  const directions = ['A', 'B'].map(value => {
    const button = new Element();
    button.dataset.direction = value;
    return button;
  });
  const formats = ['explainer', 'hero'].map(value => {
    const button = new Element();
    button.dataset.format = value;
    return button;
  });
  const document = {
    getElementById: id => ids[id],
    createElement: () => new Element(),
    querySelector: selector => selector === '.stage' ? stage : null,
    querySelectorAll(selector) {
      if (selector === '[data-direction]') return directions;
      if (selector === '[data-format]') return formats;
      if (selector === '#timeline button') return ids.timeline.children;
      return [];
    },
  };
  let nextFrame = null;
  const context = vm.createContext({
    document,
    requestAnimationFrame: callback => { nextFrame = callback; return 1; },
    cancelAnimationFrame: () => { nextFrame = null; },
  });
  vm.runInContext(script, context);
  return {
    ids, stage, directions, formats,
    frame(now) {
      const callback = nextFrame;
      nextFrame = null;
      assert.ok(callback, 'frame is scheduled');
      callback(now);
    },
    hasFrame: () => nextFrame !== null,
  };
}

test('A/B and format switches rebuild the matching storyboard', () => {
  const app = loadAnimatic();
  assert.equal(app.ids.timeline.children.length, 6);
  assert.equal(app.ids.scrub.max, '67');
  assert.equal(app.ids['scene-title'].textContent, 'A better starting point');
  app.directions[1].dispatch('click');
  assert.equal(app.ids['scene-title'].textContent, 'Less guessing');
  assert.equal(app.directions[1].attributes['aria-pressed'], 'true');
  app.formats[1].dispatch('click');
  assert.equal(app.ids.timeline.children.length, 4);
  assert.equal(app.ids.scrub.max, '10');
  assert.equal(app.ids['scene-title'].textContent, 'The worksite');
  assert.equal(app.ids['end-slate'].textContent, '');
});

test('scrub, timeline, play, pause and hero loop keep scene and time in sync', () => {
  const app = loadAnimatic();
  app.ids.scrub.value = '35';
  app.ids.scrub.dispatch('input');
  assert.equal(app.ids['scene-title'].textContent, 'Preview before details');
  assert.equal(app.ids.time.textContent, '0:35 / 1:07');
  app.ids.timeline.children[5].dispatch('click');
  assert.equal(app.ids['scene-title'].textContent, 'GCSC');
  assert.match(app.ids['end-slate'].textContent, /pilot in development/);

  app.formats[1].dispatch('click');
  app.ids.play.dispatch('click');
  assert.equal(app.hasFrame(), true);
  app.frame(1000);
  app.frame(13000);
  assert.equal(app.ids.time.textContent, '0:00 / 0:12');
  assert.equal(app.stage.dataset.scene, '0');
  assert.equal(app.hasFrame(), true);
  app.ids.play.dispatch('click');
  assert.equal(app.hasFrame(), false);
  assert.equal(app.ids.play.textContent, 'Play');
});

test('explainer stops at the end slate without scheduling another frame', () => {
  const app = loadAnimatic();
  app.ids.play.dispatch('click');
  app.frame(1000);
  app.frame(69000);
  assert.equal(app.ids.time.textContent, '1:07 / 1:07');
  assert.equal(app.ids.play.textContent, 'Play');
  assert.equal(app.hasFrame(), false);
  assert.match(app.ids['end-slate'].textContent, /pilot in development/);
});
