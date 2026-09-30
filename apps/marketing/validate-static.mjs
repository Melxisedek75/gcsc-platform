import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--test')) {
  console.error('Usage: node validate-static.mjs [--test]');
  process.exit(1);
}

// Use standard HTML/XML parsers without downloading a validator or its packages.
const script = args.length ? 'test_validate_static.py' : 'validate_static.py';
const python = process.platform === 'win32' ? 'python' : 'python3';
const result = spawnSync(python, ['-I', '-B', fileURLToPath(new URL(script, import.meta.url))], {
  stdio: 'inherit',
  windowsHide: true,
});
if (result.error) console.error(`Marketing checks require local Python 3: ${result.error.message}`);
process.exitCode = result.status ?? 1;
