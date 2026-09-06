import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../services/api/v3/', import.meta.url));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(path|systemroot|windir|comspec|temp|tmp|home|userprofile)$/i.test(key)));
Object.assign(env, {
  NODE_ENV: 'test', JWT_SECRET: 'local-migration-fixture-key-not-for-production',
  SETTLEMENT_ENABLED: 'false', CI: 'true',
});
const result = spawnSync(process.execPath, ['node_modules/jest/bin/jest.js', '--runInBand'], {
  cwd, env, stdio: 'inherit', windowsHide: true,
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
