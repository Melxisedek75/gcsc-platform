import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mobile = path.join(root, 'apps/mobile');
const require = createRequire(path.join(mobile, 'package.json'));
const ts = require('typescript');
const source = (name) => fs.readFileSync(path.join(mobile, name), 'utf8');

function loadData(name, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(source(name), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (id) => {
    assert(Object.hasOwn(imports, id), `Unexpected module ${id}`);
    return imports[id];
  } });
  return exports;
}

function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map((part) => {
    const s = parseInt(part, 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('working palette maintains ordinary-text contrast on both surfaces', () => {
  const { colors } = loadData('lib/tokens.ts');
  for (const fg of ['text', 'textMuted', 'textDim', 'brand', 'danger', 'homeowner', 'contractor']) {
    for (const bg of ['bg', 'surface']) {
      assert(contrast(colors[fg], colors[bg]) >= 4.5, `${fg}/${bg} contrast`);
    }
  }
  assert(contrast(colors.onBrand, colors.brand) >= 4.5, 'primary button label contrast');
});

test('all touch targets and text spacing have explicit accessible defaults', () => {
  const { control, typography, radius } = loadData('lib/tokens.ts');
  assert(control.minTouch >= 48);
  assert(control.primaryHeight >= 56);
  assert(radius.lg <= 8, 'repeated item cards remain compact');
  for (const entry of Object.values(typography)) assert.equal(entry.letterSpacing, 0);
});

test('each role has five explicit destinations and valid bundled icons', () => {
  const { roleNavigation } = loadData('lib/navigation.ts');
  const icons = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
  for (const role of ['homeowner', 'contractor']) {
    const nav = roleNavigation[role];
    assert.equal(nav.tabs.length, 5, role);
    for (const tab of nav.tabs) {
      assert(icons[tab.icon], `${role}/${tab.icon}`);
      assert(icons[tab.activeIcon], `${role}/${tab.activeIcon}`);
      assert(tab.label.length <= 5, 'short labels survive larger text sizes');
      assert(tab.title.length > 0);
    }
  }
});

test('detail routes are preserved and all leaf routes are accounted for', () => {
  const { roleNavigation } = loadData('lib/navigation.ts');
  for (const role of ['homeowner', 'contractor']) {
    const folder = path.join(mobile, 'app', `(${role})`);
    const routes = fs.readdirSync(folder, { recursive: true })
      .filter((name) => name.endsWith('.tsx') && !name.endsWith('_layout.tsx'))
      .map((name) => name.replaceAll('\\', '/').replace(/\.tsx$/, '')).sort();
    const nav = roleNavigation[role];
    const declared = [...nav.tabs.map((tab) => tab.name), ...nav.details].sort();
    assert.deepEqual(declared, routes, role);
    assert.equal(new Set(declared).size, declared.length, 'no duplicate routes');
  }
});

test('auth group has a real layout; Paper and icon dependencies are explicit', () => {
  assert.match(source('app/(auth)/_layout.tsx'), /Stack/);
  assert.match(source('app/_layout.tsx'), /PaperProvider/);
  const pkg = JSON.parse(source('package.json'));
  const lock = JSON.parse(source('package-lock.json'));
  for (const name of ['react-native-paper', '@expo/vector-icons']) {
    assert(pkg.dependencies[name]);
    assert.equal(lock.packages[''].dependencies[name], pkg.dependencies[name]);
    assert.equal(lock.packages[`node_modules/${name}`].version, pkg.dependencies[name]);
  }
});

test('buttons expose interaction state and never truncate command labels', () => {
  const button = source('components/Button.tsx');
  assert.match(button, /accessibilityRole="button"/);
  assert.match(button, /accessibilityState=/);
  assert.match(button, /TouchableRipple/);
  assert.doesNotMatch(button, /numberOfLines=\{1\}/);
});

test('password control reserves a full 48dp touch target', () => {
  const input = source('components/Input.tsx');
  assert.match(input, /style=\{styles\.passwordToggle\}/);
  assert.match(input, /width: control\.minTouch/);
  assert.match(input, /height: control\.minTouch/);
});

test('both role profiles wrap full account values', () => {
  for (const role of ['contractor', 'homeowner']) {
    const profile = source(`app/(${role})/profile.tsx`);
    assert.doesNotMatch(profile, /numberOfLines=\{1\}/);
    assert.match(profile, /<Text selectable/);
  }
});

test('soft status badges use readable text on pale custom status backgrounds', () => {
  const tokens = loadData('lib/tokens.ts');
  const { Badge } = loadData('components/Badge.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: (styles) => styles } },
    '../lib/tokens': tokens,
  });
  const consumers = fs.readdirSync(path.join(mobile, 'app'), { recursive: true })
    .filter((name) => name.endsWith('.tsx'));
  const customColors = new Set(consumers.flatMap((name) => source(`app/${name}`).match(/#[\da-f]{6}/ig) ?? []));
  for (const color of [...Object.values(tokens.colors), ...customColors]) {
    const badge = Badge({ label: 'In progress', color });
    const background = badge.props.style.find((style) => style.backgroundColor).backgroundColor;
    const foreground = badge.props.children.props.style.find((style) => style.color).color;
    const alpha = parseInt(background.slice(7), 16) / 255;
    for (const surface of [tokens.colors.bg, tokens.colors.surface, tokens.colors.surfaceAlt]) {
      const mixed = '#' + [1, 3, 5].map((offset) => Math.round(
        parseInt(background.slice(offset, offset + 2), 16) * alpha
        + parseInt(surface.slice(offset, offset + 2), 16) * (1 - alpha),
      ).toString(16).padStart(2, '0')).join('');
      assert(contrast(foreground, mixed) >= 4.5, `${color} badge on ${surface}`);
    }
  }
});

test('public-facing contractor profile does not import demonstration reviews', () => {
  const profile = source('app/(contractor)/profile.tsx');
  assert.doesNotMatch(profile, /MOCK_REVIEWS|summarize\(/);
  assert.match(profile, /Reviews unavailable/);
  assert.doesNotMatch(profile, /numberOfLines=\{1\}/);
  for (const folder of ['app', 'components']) {
    for (const name of fs.readdirSync(path.join(mobile, folder), { recursive: true }).filter((name) => /\.tsx?$/.test(name))) {
      assert.doesNotMatch(source(`${folder}/${name}`), /\bMOCK_REVIEWS\b|from\s+['"][^'"]*lib\/reviews['"]/, `${folder}/${name}`);
    }
  }
});
