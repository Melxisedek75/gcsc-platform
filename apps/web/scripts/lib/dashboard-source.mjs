import fs from 'node:fs';
import path from 'node:path';

/*
 * The dashboard used to live in a single src/pages/Dashboard.tsx monolith.
 * It was split into modules under src/pages/dashboard/. These helpers let the
 * validators keep grepping the dashboard's *full* source as one blob, so the
 * capability checks survive the code being spread across many files.
 */

export function dashboardSourceFiles(root = process.cwd()) {
  const files = [];
  const entry = path.join(root, 'src/pages/Dashboard.tsx');
  if (fs.existsSync(entry)) files.push(entry);

  const dir = path.join(root, 'src/pages/dashboard');
  if (fs.existsSync(dir)) {
    const walk = (current) => {
      for (const name of fs.readdirSync(current).sort()) {
        const full = path.join(current, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name)) files.push(full);
      }
    };
    walk(dir);
  }

  return files;
}

export function readDashboardSource(root = process.cwd()) {
  return dashboardSourceFiles(root)
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
}
