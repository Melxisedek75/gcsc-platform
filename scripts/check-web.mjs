import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../apps/web/', import.meta.url));
for (const script of [
  'validate-webauth-integration.mjs',
  'validate-xpr-settlement-layer.mjs',
  'validate-production-trust-workflow.mjs',
]) {
  const result = spawnSync(process.execPath, [`scripts/${script}`], { cwd, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Static web migration baseline passed. This is NOT wallet/device/E2E evidence.');
