import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLocalTestDatabase } from './local-test-database.cjs';
import { localAbsolute, captureProjectSources } from '../tests/postgres-project-sources.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const apiRoot = path.join(root, 'services', 'api', 'v3');

function hostEnvironment(ambient) {
  return Object.fromEntries(Object.entries(ambient).filter(([key]) =>
    /^(path|systemroot|windir|comspec|temp|tmp|home|userprofile)$/i.test(key)));
}

export function testEnvironment(ambient, databaseUrl, runDirectory) {
  validateLocalTestDatabase(databaseUrl);
  const env = hostEnvironment(ambient);
  return Object.assign(env, {
    NODE_ENV: 'test', CI: 'true', PGSSL: 'false',
    JWT_SECRET: 'local-postgres-baseline-fixture-not-a-production-key',
    SETTLEMENT_ENABLED: 'false', XPR_TX_VERIFIER_ENABLED: 'false',
    TEST_DATABASE_URL: databaseUrl, DATABASE_URL: databaseUrl,
    GCSC_TEST_RUN_DIRECTORY: runDirectory,
  });
}

export function parseRunnerArgs(args) {
  const usage = () => { throw new Error('Usage: npm run test:postgres:local -- --postgres-bin <absolute bin directory> [--project-publication [--api-root <worktree/services/api/v3>] | --project-draft-edit --api-root <worktree/services/api/v3> | --project-browser --playwright-dir <absolute installed node_modules> [--api-root <worktree/services/api/v3>] [--web-root <worktree/apps/web>] | --lead-checkout --api-root <worktree/services/api/v3>]'); };
  if (args[0] !== '--postgres-bin' || !args[1] || !path.isAbsolute(args[1])) usage();
  const result = { binaryDir: args[1], suite: 'baseline' };
  const seen = new Set();
  const values = { '--api-root': 'apiRoot', '--web-root': 'webRoot', '--playwright-dir': 'playwrightDir' };
  for (let index = 2; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) usage();
    seen.add(flag);
    if (['--project-publication', '--project-draft-edit', '--project-browser', '--lead-checkout'].includes(flag)) {
      if (result.suite !== 'baseline') usage();
      result.suite = flag.slice(2);
    } else {
      if (!Object.hasOwn(values, flag)) usage();
      const value = args[++index];
      if (!value || !path.isAbsolute(value)) usage();
      if (flag !== '--playwright-dir') localAbsolute(value);
      result[values[flag]] = value;
    }
  }
  if ((result.suite === 'baseline' && seen.size)
    || (result.suite !== 'project-browser' && (result.webRoot || result.playwrightDir))
    || (result.suite === 'project-browser' && !result.playwrightDir)
    || (['lead-checkout', 'project-draft-edit'].includes(result.suite) && !result.apiRoot)) usage();
  return result;
}

function command(binary, args, env, options = {}) {
  const result = spawnSync(binary, args, {
    cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 60000,
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${path.basename(binary)} failed: ${result.error?.message || result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

async function unusedPort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseRunnerArgs(args);
  let projectSources;
  if (options.suite !== 'baseline') {
    const registered = command('git', ['worktree', 'list', '--porcelain', '-z'], hostEnvironment(process.env), { timeout: 10000 })
      .split('\0').filter(field => field.startsWith('worktree ')).map(field => field.slice(9));
    projectSources = captureProjectSources({
      apiRoot: options.apiRoot || path.join(root, '..', 'backend', 'services', 'api', 'v3'),
      apiExplicit: !!options.apiRoot,
      ...(options.suite === 'project-browser' ? {
        webRoot: options.webRoot || path.join(root, '..', 'October-web', 'apps', 'web'),
        webExplicit: !!options.webRoot,
      } : {}),
    }, path.dirname(path.resolve(root)), registered);
  }
  const binaryDir = await realpath(options.binaryDir);
  const binary = name => path.join(binaryDir, name + (process.platform === 'win32' ? '.exe' : ''));
  const temporaryRoot = path.join(apiRoot, '.tmp');
  await mkdir(temporaryRoot, { recursive: true });
  if (await realpath(temporaryRoot) !== path.join(await realpath(apiRoot), '.tmp')) {
    throw new Error('Test directory must be inside the canonical API checkout');
  }
  const runDirectory = await mkdtemp(path.join(temporaryRoot, 'postgres-baseline-'));
  const cluster = path.join(runDirectory, 'cluster');
  const port = await unusedPort();
  const password = randomBytes(24).toString('hex');
  const databaseUrl = `postgres://gcsc_test:${password}@127.0.0.1:${port}/gcsc_test_baseline`;
  const env = testEnvironment(process.env, databaseUrl, runDirectory);
  if (projectSources) {
    const manifest = JSON.stringify(projectSources, null, 2) + '\n';
    await writeFile(path.join(runDirectory, 'project-sources.json'), manifest, { flag: 'wx' });
    env.GCSC_PROJECT_MANIFEST_SHA256 = createHash('sha256').update(manifest).digest('hex');
    env.GCSC_API_ROOT = projectSources.api.root;
    env.GCSC_API_SOURCE = path.join(projectSources.api.root, 'pure-server.js');
    env.GCSC_API_SOURCE_SHA256 = projectSources.api.files['pure-server.js'];
    if (projectSources.web) env.GCSC_WEB_ROOT = projectSources.web.root;
  }
  if (options.playwrightDir) env.GCSC_PLAYWRIGHT_DIR = await realpath(options.playwrightDir);
  const { Client } = createRequire(path.join(apiRoot, 'package.json'))('pg');
  const passwordFile = path.join(runDirectory, 'init-password');
  const report = { startedAt: new Date().toISOString(), runDirectory, port, suite: options.suite,
    ...(env.GCSC_API_SOURCE ? { apiSource: env.GCSC_API_SOURCE, apiSourceSha256: env.GCSC_API_SOURCE_SHA256 } : {}),
    ...(projectSources ? { projectSources, projectManifestSha256: env.GCSC_PROJECT_MANIFEST_SHA256 } : {}),
    status: 'STARTING' };
  let postgres;
  let stopped;
  let failure;
  let serverError;
  let serverLog = '';
  let testOutput = '';
  try {
    report.version = command(binary('postgres'), ['--version'], env);
    console.log(report.version);
    await writeFile(passwordFile, password + '\n', { flag: 'wx', mode: 0o600 });
    command(binary('initdb'), ['-D', cluster, '-U', 'gcsc_test', '--encoding=UTF8',
      '--locale=C', '--auth=scram-sha-256', `--pwfile=${passwordFile}`, '--no-sync'], env);
    postgres = spawn(binary('postgres'), ['-D', cluster, '-h', '127.0.0.1', '-p', String(port),
      '-c', 'shared_buffers=16MB', '-c', 'max_connections=20', '-c', 'max_wal_size=64MB'],
    { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    stopped = new Promise(resolve => {
      postgres.once('exit', code => resolve(code));
      postgres.once('error', error => { serverError = error; resolve(null); });
    });
    for (const stream of [postgres.stdout, postgres.stderr]) {
      stream.on('data', chunk => { serverLog = (serverLog + chunk).slice(-16000); });
    }
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (serverError || postgres.exitCode !== null) throw new Error(serverError?.message || serverLog);
      const probe = new Client({ host: '127.0.0.1', port, user: 'gcsc_test', password,
        database: 'postgres', connectionTimeoutMillis: 1000, query_timeout: 3000, ssl: false });
      let connected = false;
      try { await probe.connect(); connected = true; } catch { /* Server may still be starting. */ }
      if (connected) {
        // A port race must never send fixture SQL to a different local server.
        try {
          const pid = (await readFile(path.join(cluster, 'postmaster.pid'), 'utf8')).split(/\r?\n/)[0];
          if (Number(pid) !== postgres.pid) throw new Error('PostgreSQL process identity mismatch');
          const data = await probe.query('SHOW data_directory');
          if (await realpath(data.rows[0].data_directory) !== await realpath(cluster)) {
            throw new Error('PostgreSQL data directory mismatch');
          }
          await probe.query('CREATE DATABASE gcsc_test_baseline');
          ready = true;
        } finally { await probe.end(); }
        break;
      }
      await probe.end();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error('Fresh PostgreSQL cluster did not become ready');
    console.log(`Fresh loopback database ready; running ${options.suite} checks.`);
    const result = await new Promise((resolve, reject) => {
      const testFile = { baseline: 'tests/postgres-projects.integration.cjs',
        'project-publication': 'tests/postgres-project-publication.integration.cjs',
        'project-draft-edit': 'tests/postgres-project-draft-edit.integration.cjs',
        'project-browser': 'tests/postgres-project-browser.integration.cjs',
        'lead-checkout': 'tests/postgres-lead-checkout.integration.cjs' }[options.suite];
      const child = spawn(process.execPath, ['--test', testFile], {
        cwd: root, env, windowsHide: true,
        stdio: options.suite !== 'baseline' ? ['ignore', 'pipe', 'pipe'] : 'inherit',
        timeout: 120000,
      });
      if (options.suite !== 'baseline') {
        for (const [stream, output] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
          stream.on('data', chunk => {
            testOutput = (testOutput + chunk.toString()).slice(-1_000_000);
            output.write(chunk);
          });
        }
      }
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    report.testExitCode = result.code;
    if (result.code !== 0) throw new Error(`PostgreSQL checks failed (${result.code ?? result.signal})`);
    report.status = 'PASS';
  } catch (error) {
    failure = error;
    report.status = 'FAIL';
    report.error = error.message.replaceAll(password, '[fixture password]');
  } finally {
    if (postgres?.pid && postgres.exitCode === null && !serverError) {
      try {
        command(binary('pg_ctl'), ['-D', cluster, '-m', 'fast', '-w', '-t', '30', 'stop'], env);
        report.postgresExitCode = await stopped;
        if (report.postgresExitCode !== 0) throw new Error('PostgreSQL did not stop cleanly');
      } catch (error) {
        failure ||= error;
        report.status = 'FAIL';
        report.shutdownError = error.message;
      }
    }
    // Retain only disposable fixture data and evidence; no existing database is touched.
    await writeFile(passwordFile, '[expired local fixture password]\n');
    report.finishedAt = new Date().toISOString();
    await writeFile(path.join(runDirectory, 'result.json'), JSON.stringify(report, null, 2) + '\n');
    await writeFile(path.join(runDirectory, 'postgres.log'), serverLog.replaceAll(password, '[fixture password]'));
    if (options.suite !== 'baseline') {
      await writeFile(path.join(runDirectory, 'test-output.log'), testOutput.replaceAll(password, '[fixture password]'));
    }
    console.log(`Evidence: ${path.join(runDirectory, 'result.json')}`);
  }
  if (failure) throw new Error(report.error || report.shutdownError);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
