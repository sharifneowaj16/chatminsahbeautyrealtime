#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTrackingDeployEnv, isPlaceholderValue } from './tracking-env-audit.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readIfExists(root, relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) return '';
  return fs.readFileSync(absolute, 'utf8');
}

function fileExists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function getEnvValue(env, key) {
  return String(env[key] ?? '').trim();
}

function maskUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '[missing]';
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
  } catch {
    return '[invalid-url]';
  }
}

function check({ code, status, category, label, message, hint, value }) {
  return {
    code,
    status,
    severity: status,
    category,
    label,
    message,
    ...(hint ? { hint } : {}),
    ...(value !== undefined ? { value } : {}),
  };
}

const pass = (args) => check({ ...args, status: 'PASS' });
const warn = (args) => check({ ...args, status: 'WARN' });
const blocker = (args) => check({ ...args, status: 'BLOCKER' });

function isValidRedisUrl(value) {
  try {
    const url = new URL(value);
    return ['redis:', 'rediss:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

async function pingRedis(redisUrl, timeoutMs = 3_000) {
  const redisModule = await import('ioredis');
  const Redis = redisModule.default;
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectTimeout: timeoutMs,
    commandTimeout: timeoutMs,
  });

  try {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Redis ping timed out after ${timeoutMs}ms`)), timeoutMs + 500);
    });
    const pong = await Promise.race([
      redis.connect().then(() => redis.ping()),
      timeout,
    ]);
    return { ok: pong === 'PONG', response: pong };
  } finally {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
  }
}

async function maybeRunLiveRedisCheck({ checks, env, liveRedis, productionMode }) {
  const redisUrl = getEnvValue(env, 'REDIS_URL');
  if (!redisUrl) {
    checks.push(blocker({
      code: 'REDIS_URL_MISSING_FOR_RUNTIME',
      category: 'runtime',
      label: 'Redis runtime check',
      message: 'REDIS_URL is missing, so BullMQ tracking queue cannot run.',
      hint: 'Set REDIS_URL to the production Redis instance.',
    }));
    return;
  }

  if (isPlaceholderValue(redisUrl) || !isValidRedisUrl(redisUrl)) {
    checks.push(blocker({
      code: 'REDIS_URL_INVALID_FOR_RUNTIME',
      category: 'runtime',
      label: 'Redis runtime check',
      message: 'REDIS_URL is not a valid production redis:// or rediss:// URL.',
      hint: 'Use the production Redis provider URL.',
      value: maskUrl(redisUrl),
    }));
    return;
  }

  checks.push(pass({
    code: 'REDIS_URL_SHAPE_OK',
    category: 'runtime',
    label: 'Redis URL shape',
    message: 'REDIS_URL has a valid Redis URL shape.',
    value: maskUrl(redisUrl),
  }));

  if (!liveRedis) {
    checks.push(warn({
      code: 'REDIS_LIVE_PING_SKIPPED',
      category: 'runtime',
      label: 'Redis live ping',
      message: 'Live Redis ping was skipped.',
      hint: productionMode
        ? 'Run `TRACKING_DEPLOY_GATE_LIVE_REDIS=true npm run qa:tracking-deploy-gate` on the production network for a real queue connectivity gate.'
        : 'Use --live-redis to verify queue connectivity.',
    }));
    return;
  }

  try {
    const result = await pingRedis(redisUrl);
    if (result.ok) {
      checks.push(pass({
        code: 'REDIS_LIVE_PING_OK',
        category: 'runtime',
        label: 'Redis live ping',
        message: 'Redis live ping succeeded.',
      }));
    } else {
      checks.push(blocker({
        code: 'REDIS_LIVE_PING_BAD_RESPONSE',
        category: 'runtime',
        label: 'Redis live ping',
        message: 'Redis ping returned an unexpected response.',
        value: String(result.response ?? ''),
        hint: 'Verify Redis provider health and credentials.',
      }));
    }
  } catch (error) {
    const missingModule = String(error?.message ?? '').includes('Cannot find package') || String(error?.code ?? '') === 'ERR_MODULE_NOT_FOUND';
    checks.push(blocker({
      code: missingModule ? 'REDIS_CLIENT_MODULE_MISSING' : 'REDIS_LIVE_PING_FAILED',
      category: 'runtime',
      label: 'Redis live ping',
      message: missingModule
        ? 'Live Redis ping could not run because ioredis is not installed in this checkout.'
        : 'Redis live ping failed.',
      hint: missingModule ? 'Run npm install before live deploy gate.' : String(error?.message ?? error),
    }));
  }
}

function addStaticRuntimeChecks(checks, root, env) {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = fileExists(root, 'package.json') ? readJson(packageJsonPath) : { scripts: {} };
  const scripts = packageJson.scripts ?? {};

  const requiredFiles = [
    ['QUEUE_FILE_PRESENT', 'lib/queue/metaCapiQueue.ts', 'Meta/GA4 BullMQ queue file'],
    ['WORKER_FILE_PRESENT', 'lib/workers/metaCapiWorker.ts', 'Meta/GA4 worker file'],
    ['TRACKING_HEALTH_ROUTE_PRESENT', 'app/api/cron/tracking-health/route.ts', 'Tracking health cron route'],
    ['TRACKING_HEALTH_CLI_PRESENT', 'scripts/tracking-health-cron.ts', 'Tracking health cron CLI'],
    ['PRODUCTION_QA_ROUTE_PRESENT', 'app/api/admin/production-qa/route.ts', 'Admin production QA route'],
  ];

  for (const [code, relativePath, label] of requiredFiles) {
    if (fileExists(root, relativePath)) {
      checks.push(pass({ code, category: 'runtime', label, message: `${relativePath} exists.` }));
    } else {
      checks.push(blocker({ code, category: 'runtime', label, message: `${relativePath} is missing.`, hint: 'Restore this file before production deploy.' }));
    }
  }

  const queue = readIfExists(root, 'lib/queue/metaCapiQueue.ts');
  const durableQueues = readIfExists(root, 'lib/jobs/queues.ts');
  const retryPolicy = readIfExists(root, 'lib/jobs/retry-policy.ts');
  const worker = readIfExists(root, 'lib/workers/metaCapiWorker.ts');
  const capiSenderWorker = readIfExists(root, 'workers/meta-capi-sender.worker.ts');
  const ga4Worker = readIfExists(root, 'workers/ga4-events.worker.ts');
  const tiktokWorker = readIfExists(root, 'workers/tiktok-events.worker.ts');
  const cronRoute = readIfExists(root, 'app/api/cron/tracking-health/route.ts');
  const instrumentation = readIfExists(root, 'instrumentation.ts');

  if (durableQueues.includes('meta-provider') && retryPolicy.includes('3_600_000') && durableQueues.includes('removeOnFail')) {
    checks.push(pass({ code: 'QUEUE_RETRY_CONFIG_PRESENT', category: 'runtime', label: 'Queue retry config', message: 'Provider-isolated queues have bounded retry/backoff/failure retention config.' }));
  } else {
    checks.push(blocker({ code: 'QUEUE_RETRY_CONFIG_MISSING', category: 'runtime', label: 'Queue retry config', message: 'Provider queue retry/backoff/failure config is incomplete.', hint: 'Check lib/jobs/queues.ts and lib/jobs/retry-policy.ts.' }));
  }

  if (capiSenderWorker.includes('processMetaOutboxById') && ga4Worker.includes('sendGa4Purchase') && tiktokWorker.includes('sendCodPurchaseToTikTok')) {
    checks.push(pass({ code: 'WORKER_PURCHASE_HANDLERS_PRESENT', category: 'runtime', label: 'Worker handlers', message: 'Meta outbox, GA4 and TikTok purchase handlers are wired to isolated workers.' }));
  } else {
    checks.push(blocker({ code: 'WORKER_PURCHASE_HANDLERS_MISSING', category: 'runtime', label: 'Worker handlers', message: 'Provider-isolated purchase handler wiring is incomplete.', hint: 'Check workers/meta-capi-sender.worker.ts, workers/ga4-events.worker.ts and workers/tiktok-events.worker.ts.' }));
  }

  const embeddedDisabled = getEnvValue(env, 'DISABLE_EMBEDDED_WORKERS').toLowerCase() === 'true';
  const externalVerified = getEnvValue(env, 'META_CAPI_WORKER_PROCESS_VERIFIED').toLowerCase() === 'true';
  if (embeddedDisabled) {
    if (externalVerified) {
      checks.push(pass({ code: 'EXTERNAL_WORKER_VERIFIED', category: 'runtime', label: 'Worker process mode', message: 'Embedded workers are disabled and external worker process is marked verified.' }));
    } else {
      checks.push(warn({ code: 'EXTERNAL_WORKER_NEEDS_MANUAL_VERIFY', category: 'runtime', label: 'Worker process mode', message: 'Embedded workers are disabled but external worker process is not marked verified.', hint: 'Run and monitor `npm run worker:meta-capi`; set META_CAPI_WORKER_PROCESS_VERIFIED=true after verification.' }));
    }
  } else if (instrumentation.includes('startMetaCapiWorker') || scripts['worker:meta-capi']) {
    checks.push(pass({ code: 'WORKER_START_PATH_PRESENT', category: 'runtime', label: 'Worker start path', message: 'Embedded or external Meta/GA4 worker start path is present.' }));
  } else {
    checks.push(blocker({ code: 'WORKER_START_PATH_MISSING', category: 'runtime', label: 'Worker start path', message: 'No worker start path was found.', hint: 'Wire startMetaCapiWorker in instrumentation or run worker:meta-capi externally.' }));
  }

  if (scripts['worker:meta-capi']?.includes('meta-capi-sender.worker')) {
    checks.push(pass({ code: 'WORKER_SCRIPT_PRESENT', category: 'runtime', label: 'worker:meta-capi script', message: 'package.json has worker:meta-capi script.' }));
  } else {
    checks.push(blocker({ code: 'WORKER_SCRIPT_MISSING', category: 'runtime', label: 'worker:meta-capi script', message: 'package.json is missing worker:meta-capi script.', hint: 'Add a script to start workers/meta-capi-sender.worker.ts.' }));
  }

  if (scripts['cron:tracking-health']?.includes('tracking-health-cron')) {
    checks.push(pass({ code: 'TRACKING_HEALTH_CRON_SCRIPT_PRESENT', category: 'runtime', label: 'tracking health cron script', message: 'package.json has cron:tracking-health script.' }));
  } else {
    checks.push(blocker({ code: 'TRACKING_HEALTH_CRON_SCRIPT_MISSING', category: 'runtime', label: 'tracking health cron script', message: 'package.json is missing cron:tracking-health script.' }));
  }

  if (cronRoute.includes('authorizeSharedSecretRequest') && cronRoute.includes('TRACKING_HEALTH_CRON_SECRET') && cronRoute.includes("headerNames: ['x-cron-secret']") && cronRoute.includes('allowQueryParamInNonProduction: true')) {
    checks.push(pass({ code: 'CRON_SECRET_GUARD_PRESENT', category: 'runtime', label: 'Cron secret guard', message: 'Tracking health cron route requires secret auth and rejects query-string secrets in production.' }));
  } else {
    checks.push(blocker({ code: 'CRON_SECRET_GUARD_MISSING', category: 'runtime', label: 'Cron secret guard', message: 'Tracking health cron auth guard is incomplete.', hint: 'Use Authorization Bearer or x-cron-secret, and reject query secret in production.' }));
  }

  if (scripts['qa:tracking-deploy-gate'] === 'node scripts/tracking-deploy-gate.mjs --production') {
    checks.push(pass({ code: 'MASTER_DEPLOY_GATE_SCRIPT_PRESENT', category: 'runtime', label: 'Master deploy gate script', message: 'package.json exposes qa:tracking-deploy-gate.' }));
  } else {
    checks.push(blocker({ code: 'MASTER_DEPLOY_GATE_SCRIPT_MISSING', category: 'runtime', label: 'Master deploy gate script', message: 'package.json does not expose the expected qa:tracking-deploy-gate script.' }));
  }

  if (scripts['qa:predeploy']?.includes('qa:tracking-deploy-gate')) {
    checks.push(pass({ code: 'PREDEPLOY_INCLUDES_TRACKING_GATE', category: 'runtime', label: 'Predeploy script wiring', message: 'qa:predeploy includes qa:tracking-deploy-gate.' }));
  } else {
    checks.push(warn({ code: 'PREDEPLOY_MISSING_TRACKING_GATE', category: 'runtime', label: 'Predeploy script wiring', message: 'qa:predeploy does not include qa:tracking-deploy-gate.', hint: 'Add it to fail fast before production deploy.' }));
  }
}

export async function runTrackingRuntimeHealthCheck(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const env = options.env ?? loadTrackingDeployEnv({ root });
  const productionMode = options.productionMode ?? options.production ?? env.NODE_ENV === 'production';
  const liveRedis = Boolean(options.liveRedis ?? options.live ?? getEnvValue(env, 'TRACKING_DEPLOY_GATE_LIVE_REDIS').toLowerCase() === 'true');
  const checks = [];

  addStaticRuntimeChecks(checks, root, env);
  await maybeRunLiveRedisCheck({ checks, env, liveRedis, productionMode });

  const blockerCount = checks.filter((item) => item.status === 'BLOCKER').length;
  const warningCount = checks.filter((item) => item.status === 'WARN').length;
  const passCount = checks.filter((item) => item.status === 'PASS').length;

  return {
    ok: blockerCount === 0,
    status: blockerCount > 0 ? 'BLOCKED' : warningCount > 0 ? 'WARN' : 'PASS',
    productionMode,
    liveRedis,
    passCount,
    warningCount,
    blockerCount,
    checks,
  };
}

function parseCliArgs(argv) {
  return {
    productionMode: argv.includes('--production') || argv.includes('--prod'),
    liveRedis: argv.includes('--live-redis') || argv.includes('--live'),
    json: argv.includes('--json'),
    failOnWarn: argv.includes('--fail-on-warn'),
  };
}

function printHuman(result) {
  console.log(`Tracking runtime health check: ${result.status}`);
  console.log(`Pass: ${result.passCount}, Warn: ${result.warningCount}, Blocker: ${result.blockerCount}`);
  for (const item of result.checks) {
    const prefix = item.status === 'PASS' ? '✓' : item.status === 'WARN' ? '!' : '✗';
    console.log(`${prefix} [${item.status}] ${item.code}: ${item.message}`);
    if (item.hint && item.status !== 'PASS') console.log(`  Hint: ${item.hint}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = parseCliArgs(process.argv.slice(2));
  const result = await runTrackingRuntimeHealthCheck({ productionMode: args.productionMode, liveRedis: args.liveRedis });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }
  if (!result.ok || (args.failOnWarn && result.warningCount > 0)) {
    process.exitCode = 1;
  }
}
