#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTrackingDeployEnv, runTrackingEnvAudit } from './tracking-env-audit.mjs';
import { runTrackingRuntimeHealthCheck } from './tracking-runtime-health-check.mjs';
import { runTikTokTrackingDeployGate } from './tiktok-tracking-deploy-gate.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function parseCliArgs(argv) {
  return {
    productionMode: argv.includes('--production') || argv.includes('--prod'),
    liveRedis: argv.includes('--live-redis') || argv.includes('--live'),
    json: argv.includes('--json'),
    failOnWarn: argv.includes('--fail-on-warn'),
  };
}

function mergeResults(envResult, runtimeResult, tiktokResult) {
  const checks = [...envResult.checks, ...runtimeResult.checks, ...tiktokResult.checks];
  const blockerCount = checks.filter((check) => check.status === 'BLOCKER').length;
  const warningCount = checks.filter((check) => check.status === 'WARN').length;
  const passCount = checks.filter((check) => check.status === 'PASS').length;
  const status = blockerCount > 0 ? 'BLOCKED' : warningCount > 0 ? 'WARN' : 'PASS';

  return {
    ok: blockerCount === 0,
    status,
    checkedAt: new Date().toISOString(),
    productionMode: envResult.productionMode,
    liveRedis: runtimeResult.liveRedis,
    passCount,
    warningCount,
    blockerCount,
    checks,
    sections: {
      environment: envResult,
      runtime: runtimeResult,
      tiktok: tiktokResult,
    },
  };
}

function printGate(result) {
  const title = result.ok ? 'Production tracking deploy gate passed' : 'Production tracking deploy gate blocked';
  console.log(title);
  console.log(`Status: ${result.status}`);
  console.log(`Pass: ${result.passCount}, Warn: ${result.warningCount}, Blocker: ${result.blockerCount}`);

  const importantCodes = new Set([
    'NO_PLACEHOLDER_CREDENTIALS',
    'META_TEST_EVENT_DISABLED_IN_PRODUCTION',
    'REDIS_URL_SHAPE_OK',
    'REDIS_LIVE_PING_OK',
    'WORKER_START_PATH_PRESENT',
    'WORKER_SCRIPT_PRESENT',
    'TRACKING_HEALTH_CRON_SCRIPT_PRESENT',
    'CRON_SECRET_GUARD_PRESENT',
    'MASTER_DEPLOY_GATE_SCRIPT_PRESENT',
    'TIKTOK_CSP_ALLOWED_WITH_META_GA4_PRESERVED',
    'TIKTOK_BROWSER_PURCHASE_BLOCKED_AND_PAYLOAD_MAPPER_PRESENT',
    'TIKTOK_EVENTS_API_SENDER_SCHEMA_AND_MATCH_KEYS_PRESENT',
    'TIKTOK_VERIFIED_PURCHASE_GATES_PRESENT',
    'TIKTOK_ACCESS_TOKEN_NOT_PUBLIC',
  ]);

  for (const check of result.checks) {
    if (check.status === 'PASS' && !importantCodes.has(check.code)) continue;
    const prefix = check.status === 'PASS' ? '✓' : check.status === 'WARN' ? '!' : '✗';
    console.log(`${prefix} [${check.status}] ${check.code}: ${check.message}`);
    if (check.hint && check.status !== 'PASS') console.log(`  Hint: ${check.hint}`);
  }

  if (result.ok) {
    console.log('No placeholder credentials');
    console.log('No production test event code');
    console.log('Redis/queue config present');
    console.log('Meta/GA4 env present');
    if (!result.liveRedis) {
      console.log('Live Redis ping skipped; set TRACKING_DEPLOY_GATE_LIVE_REDIS=true for network-level verification.');
    }
    if (result.sections?.tiktok?.status) {
      console.log(`TikTok static deploy gate status: ${result.sections.tiktok.status}`);
    }
  }
}

export async function runTrackingDeployGate(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const env = options.env ?? loadTrackingDeployEnv({ root });
  const productionMode = options.productionMode ?? options.production ?? true;
  const envResult = runTrackingEnvAudit({ root, env, productionMode });
  const runtimeResult = await runTrackingRuntimeHealthCheck({ root, env, productionMode, liveRedis: options.liveRedis });
  const tiktokResult = runTikTokTrackingDeployGate({ root, env, productionMode });
  return mergeResults(envResult, runtimeResult, tiktokResult);
}

const args = parseCliArgs(process.argv.slice(2));
const result = await runTrackingDeployGate({ productionMode: args.productionMode || true, liveRedis: args.liveRedis });

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printGate(result);
}

if (!result.ok || (args.failOnWarn && result.warningCount > 0)) {
  process.exitCode = 1;
}
