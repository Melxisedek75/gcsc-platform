import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveApiOrigin } from '../packages/api-config/index.mjs';

export function createBuildPlan(inputEnv) {
  const origin = resolveApiOrigin(inputEnv.EXPO_PUBLIC_API_BASE_URL, 'EXPO_PUBLIC_API_BASE_URL');
  if (!['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(new URL(origin).hostname)) {
    throw new Error('Local Android baseline requires an explicit loopback or emulator API URL.');
  }
  const env = Object.fromEntries(Object.entries(inputEnv).filter(([key]) =>
    /^(path|systemroot|windir|comspec|temp|tmp|home|userprofile|appdata|localappdata)$/i.test(key)));
  Object.assign(env, {
    NODE_ENV: 'production', CI: '1', EXPO_OFFLINE: '1', EXPO_NO_TELEMETRY: '1',
    EXPO_NO_DOTENV: '1', EXPO_PUBLIC_API_BASE_URL: origin,
  });
  return {
    cwd: fileURLToPath(new URL('../apps/mobile/', import.meta.url)),
    args: [
      'node_modules/expo/bin/cli', 'export', '--platform', 'android', '--max-workers', '1',
      '--output-dir', fileURLToPath(new URL('../.tmp/android-baseline/', import.meta.url)),
    ],
    env,
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const plan = createBuildPlan(process.env);
    const result = spawnSync(process.execPath, plan.args, {
      cwd: plan.cwd, env: plan.env, stdio: 'inherit', windowsHide: true,
    });
    if (result.error) console.error(result.error.message);
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
