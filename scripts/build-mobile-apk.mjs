import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createBuildPlan } from './bundle-mobile-local.mjs';

export const MIN_FREE_BYTES = 4 * 1024 ** 3;

export function assertDiskBudget(freeBytes) {
  if (!Number.isFinite(freeBytes) || freeBytes < MIN_FREE_BYTES) {
    throw new Error('Native APK build needs at least 4 GiB free disk before starting; no build was started.');
  }
}

export function createApkPlan(inputEnv) {
  const bundle = createBuildPlan(inputEnv);
  const env = { ...bundle.env, GCSC_LOCAL_ANDROID_BUILD: '1' };
  for (const key of ['JAVA_HOME', 'ANDROID_HOME', 'GRADLE_USER_HOME']) {
    if (inputEnv[key]) env[key] = inputEnv[key];
  }
  if (!env.JAVA_HOME || !env.ANDROID_HOME || !env.GRADLE_USER_HOME) {
    throw new Error('Set explicit JAVA_HOME, ANDROID_HOME and GRADLE_USER_HOME for the local APK build.');
  }
  env.ANDROID_SDK_ROOT = env.ANDROID_HOME;
  return {
    cwd: bundle.cwd, env,
    prebuildArgs: ['node_modules/expo/bin/cli', 'prebuild', '--platform', 'android', '--no-install'],
    gradleArgs: [':app:assembleRelease', '--offline', '--no-daemon', '--max-workers=1',
      '-PreactNativeArchitectures=arm64-v8a', '-Dorg.gradle.parallel=false',
      '-Dorg.gradle.jvmargs=-Xmx768m', '-Pkotlin.compiler.execution.strategy=in-process'],
  };
}

function run(command, args, options) {
  const result = spawnSync(command, args, { ...options, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Build step failed (exit ${result.status}): ${path.basename(command)}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    if (process.platform !== 'win32') throw new Error('This local APK runner currently supports Windows only.');
    const plan = createApkPlan(process.env);
    for (const dir of [plan.cwd, plan.env.ANDROID_HOME, plan.env.GRADLE_USER_HOME]) {
      const disk = fs.statfsSync(dir);
      assertDiskBudget(disk.bavail * disk.bsize);
    }
    for (const file of [path.join(plan.env.JAVA_HOME, 'bin/java.exe'),
      path.join(plan.env.ANDROID_HOME, 'build-tools/36.0.0/aapt.exe')]) {
      if (!fs.existsSync(file)) throw new Error(`Required native tool missing: ${file}`);
    }
    run(process.execPath, plan.prebuildArgs, { cwd: plan.cwd, env: plan.env });
    // Release bundles JS/Hermes and disables Metro developer support. It still
    // uses the generated debug signing key: this is a local test APK, not a release.
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `& .\\gradlew.bat ${plan.gradleArgs.join(' ')}\nexit $LASTEXITCODE`],
    { cwd: path.join(plan.cwd, 'android'), env: plan.env });
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-File',
      fileURLToPath(new URL('./verify-mobile-apk.ps1', import.meta.url)),
      '-ApkPath', path.join(plan.cwd, 'android/app/build/outputs/apk/release/app-release.apk'),
      '-SdkPath', plan.env.ANDROID_HOME, '-ApiOrigin', plan.env.EXPO_PUBLIC_API_BASE_URL],
    { cwd: plan.cwd, env: plan.env });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
