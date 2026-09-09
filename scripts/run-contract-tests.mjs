import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const core = fileURLToPath(new URL('../contracts/gcsc-core/', import.meta.url));
const require = createRequire(import.meta.url);
const { localEnvironment, localBinary } = require(path.join(core, 'test/harness.cjs'));
const result = spawnSync(process.execPath, ['--no-experimental-strip-types', '--require', path.join(core, 'test/offline.cjs'),
  localBinary(core, 'mocha', 'mocha'), '--no-config', '--no-package', '--require',
  path.join(core, 'node_modules/ts-node/register'), 'test/**/*.test.ts'], {
  cwd: core, env: localEnvironment(), shell: false, windowsHide: true, stdio: 'inherit', timeout: 900000,
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
