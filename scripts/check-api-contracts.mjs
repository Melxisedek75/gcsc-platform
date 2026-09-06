import fs from 'node:fs';
const source = fs.readFileSync(new URL('../services/api/v3/pure-server.js', import.meta.url), 'utf8');
const spec = JSON.parse(fs.readFileSync(new URL('../docs/migration/api-contract-requirements.json', import.meta.url), 'utf8'));
// This is a declared-route inventory, not a JavaScript parser or runtime API test.
const declared = new Set([...source.matchAll(/^  ['"]((?:GET|POST|PUT|PATCH|DELETE) \/api\/[^'"]+)['"]:\s*async\s*\(/gm)].map(m => m[1]));
if (!declared.size) throw new Error('Route declaration shape changed; inventory needs review');
const missing = spec.requiredRoutes.filter(r => !declared.has(`${r.method} ${r.path}`));
for (const r of missing) console.error(`MISSING ${r.method} ${r.path}: ${r.purpose}`);
console.log(`${declared.size} declared API routes; ${spec.requiredRoutes.length - missing.length}/${spec.requiredRoutes.length} required entrypoints present. This does not verify behavior.`);
if (missing.length) process.exitCode = 1;
