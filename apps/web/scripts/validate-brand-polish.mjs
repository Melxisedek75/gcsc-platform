import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const home = read('src/pages/Home.tsx');
const token = read('src/pages/Token.tsx');
const navbar = read('src/components/Navbar.tsx');
const banner = read('src/components/HeaderBanner.tsx');
const css = read('src/index.css');

const checks = [
  {
    ok: !navbar.includes('<img') && !navbar.includes('gcsc-logo'),
    message: 'Navbar must not reintroduce the small logo under the main banner.',
  },
  {
    ok: banner.includes('gcsc-header-banner.jpg') && banner.includes('brand-logo-wave'),
    message: 'The large top GCSC banner must remain visible with the logo wave effect.',
  },
  {
    ok: home.includes('Construction payments') && home.includes('protected by escrow.'),
    message: 'Homepage hero slogan must stay restored.',
  },
  {
    ok: home.includes('gradient-text shimmer-text') && token.includes('gradient-text shimmer-text'),
    message: 'Hero headings must use the GCSC gradient shimmer palette.',
  },
  {
    ok: css.includes('.shimmer-text') && css.includes('@keyframes shimmer-wave') && css.includes('.brand-logo-wave'),
    message: 'Shimmer text and logo wave animations must exist.',
  },
  {
    ok: token.includes('gcsc-logo-round-80.png') && token.includes('Why Hold GCSC?'),
    message: 'Token utility section must keep the centered round logo above Why Hold GCSC.',
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure.message}`);
  process.exit(1);
}

console.log('brand polish validation passed');
