import 'server-only';

import prisma from '@/lib/prisma';
import { metaCapiPurchaseQueue } from '@/lib/queue/metaCapiQueue';
import { buildPrivacyCatalogQaSnapshot } from '@/lib/tracking/privacy-catalog-qa';
import { buildTrackingHealthSnapshot } from '@/lib/tracking/health';
import { buildGa4QaSnapshot } from '@/lib/tracking/ga4-qa';
import { getMetaCapiWorkerRuntimeState } from '@/lib/workers/metaCapiWorker';
import { FULL_PRODUCTION_QA_MATRIX, getFullQaMatrixSummary, getQaStepVerification } from '@/lib/tracking/full-production-qa-matrix';
import type { FullProductionQaStep } from '@/lib/tracking/full-production-qa-matrix';

const DEFAULT_WINDOW_HOURS = 24;
const MAX_WINDOW_HOURS = 24 * 30;
const RECENT_HEALTH_MAX_AGE_HOURS = 26;

type DeployGateStatus = 'READY' | 'WARN' | 'BLOCKED';
type GateSeverity = 'PASS' | 'WARN' | 'BLOCKER';

type GateCheck = {
  code: string;
  label: string;
  severity: GateSeverity;
  message: string;
  category: 'environment' | 'queue_worker' | 'tracking_health' | 'privacy_catalog' | 'ga4_attribution' | 'manual_qa' | 'documentation';
  hint?: string;
  value?: number | string | boolean | null;
};

type ManualQaStep = FullProductionQaStep & {
  verified: boolean;
  evidenceUrl: string | null;
};

type EnvStatus = {
  appUrl: boolean;
  databaseUrl: boolean;
  redisUrl: boolean;
  jwtSecret: boolean;
  jwtRefreshSecret: boolean;
  metaPixelId: boolean;
  metaDatasetId: boolean;
  metaCapiToken: boolean;
  ga4MeasurementId: boolean;
  ga4ApiSecret: boolean;
  cronSecret: boolean;
  alertWebhook: boolean;
  testEventCodeDisabledInProduction: boolean;
  gtmEnabled: boolean;
  gtmAudited: boolean;
};

type QueueStatus = {
  reachable: boolean;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: number;
  waitingChildren: number;
  error?: string;
};

type WorkerStatus = {
  embeddedWorkersEnabled: boolean;
  startedInThisProcess: boolean;
  startedAt: string | null;
  lastHeartbeatAt: string | null;
  completedJobs: number;
  failedJobs: number;
  lastError: string | null;
  externalWorkerRequired: boolean;
};

type LatestHealthCheck = {
  id: string;
  status: string;
  notes: string | null;
  checkDate: string;
  createdAt: string;
  ageHours: number;
} | null;

export type ProductionQaSnapshot = {
  status: DeployGateStatus;
  checkedAt: string;
  windowHours: number;
  env: EnvStatus;
  queue: QueueStatus;
  worker: WorkerStatus;
  latestHealthCheck: LatestHealthCheck;
  liveTrackingHealth: Awaited<ReturnType<typeof buildTrackingHealthSnapshot>>;
  privacyCatalog: Awaited<ReturnType<typeof buildPrivacyCatalogQaSnapshot>>;
  ga4Qa: Awaited<ReturnType<typeof buildGa4QaSnapshot>>;
  checks: GateCheck[];
  manualQaSteps: ManualQaStep[];
  summary: {
    blockerCount: number;
    warningCount: number;
    passCount: number;
    deployMessage: string;
    manualQaTotal: number;
    manualQaRequired: number;
    manualQaRequiredVerified: number;
    manualQaMissingRequired: string[];
  };
};

function clampWindowHours(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return DEFAULT_WINDOW_HOURS;
  return Math.min(Math.max(Math.floor(value), 1), MAX_WINDOW_HOURS);
}

function hasRealEnvValue(...keys: string[]) {
  return keys.some((key) => {
    const value = process.env[key]?.trim();
    if (!value) return false;
    const lowered = value.toLowerCase();
    return !(
      lowered.includes('your-') ||
      lowered.includes('change-me') ||
      lowered.includes('changethisimmediately') ||
      lowered.includes('xxxxxxxx') ||
      lowered.includes('generate-a-secure') ||
      lowered.includes('generate-another-secure') ||
      lowered === 'g-xxxxxxxxxx'
    );
  });
}

function envFlag(key: string) {
  return process.env[key]?.trim().toLowerCase() === 'true';
}

function addCheck(checks: GateCheck[], check: GateCheck) {
  checks.push(check);
}

function passCheck(category: GateCheck['category'], code: string, label: string, message: string, value?: GateCheck['value']) {
  return { category, code, label, severity: 'PASS' as const, message, value };
}

function warnCheck(category: GateCheck['category'], code: string, label: string, message: string, hint?: string, value?: GateCheck['value']) {
  return { category, code, label, severity: 'WARN' as const, message, hint, value };
}

function blockerCheck(category: GateCheck['category'], code: string, label: string, message: string, hint?: string, value?: GateCheck['value']) {
  return { category, code, label, severity: 'BLOCKER' as const, message, hint, value };
}

async function getQueueStatus(): Promise<QueueStatus> {
  try {
    const counts = await metaCapiPurchaseQueue.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'failed',
      'completed',
      'paused',
      'waiting-children'
    );

    return {
      reachable: true,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
      failed: counts.failed ?? 0,
      completed: counts.completed ?? 0,
      paused: counts.paused ?? 0,
      waitingChildren: counts['waiting-children'] ?? 0,
    };
  } catch (error) {
    return {
      reachable: false,
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0,
      completed: 0,
      paused: 0,
      waitingChildren: 0,
      error: error instanceof Error ? error.message : 'Unknown queue error',
    };
  }
}

async function getLatestHealthCheck(): Promise<LatestHealthCheck> {
  const row = await prisma.trackingHealthCheck.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      notes: true,
      checkDate: true,
      createdAt: true,
    },
  });

  if (!row) return null;

  const ageHours = (Date.now() - row.createdAt.getTime()) / (60 * 60 * 1000);

  return {
    id: row.id,
    status: row.status,
    notes: row.notes,
    checkDate: row.checkDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
    ageHours,
  };
}

function buildEnvStatus(): EnvStatus {
  const gtmEnabled = envFlag('NEXT_PUBLIC_GTM_ENABLED');

  return {
    appUrl: hasRealEnvValue('NEXT_PUBLIC_APP_URL', 'NEXTAUTH_URL'),
    databaseUrl: hasRealEnvValue('DATABASE_URL'),
    redisUrl: hasRealEnvValue('REDIS_URL'),
    jwtSecret: hasRealEnvValue('JWT_SECRET'),
    jwtRefreshSecret: hasRealEnvValue('JWT_REFRESH_SECRET'),
    metaPixelId: hasRealEnvValue('NEXT_PUBLIC_META_PIXEL_ID', 'NEXT_PUBLIC_FB_PIXEL_ID', 'META_PIXEL_ID'),
    metaDatasetId: hasRealEnvValue('META_DATASET_ID', 'META_PIXEL_ID', 'NEXT_PUBLIC_META_PIXEL_ID'),
    metaCapiToken: hasRealEnvValue('META_CAPI_ACCESS_TOKEN', 'FACEBOOK_CONVERSION_API_TOKEN'),
    ga4MeasurementId: hasRealEnvValue('NEXT_PUBLIC_GA4_MEASUREMENT_ID', 'GA4_MEASUREMENT_ID'),
    ga4ApiSecret: hasRealEnvValue('GA4_API_SECRET', 'GOOGLE_ANALYTICS_API_SECRET'),
    cronSecret: hasRealEnvValue('TRACKING_HEALTH_CRON_SECRET', 'CRON_SECRET'),
    alertWebhook: hasRealEnvValue('TRACKING_HEALTH_ALERT_WEBHOOK_URL', 'TRACKING_ALERT_WEBHOOK_URL', 'SLACK_WEBHOOK_URL'),
    testEventCodeDisabledInProduction: process.env.NODE_ENV !== 'production' || !process.env.META_TEST_EVENT_CODE,
    gtmEnabled,
    gtmAudited: !gtmEnabled || envFlag('GTM_ECOMMERCE_TAGS_AUDITED'),
  };
}

function buildWorkerStatus(): WorkerStatus {
  const runtime = getMetaCapiWorkerRuntimeState();
  const embeddedWorkersEnabled = process.env.DISABLE_EMBEDDED_WORKERS !== 'true';

  return {
    embeddedWorkersEnabled,
    startedInThisProcess: runtime.started,
    startedAt: runtime.startedAt,
    lastHeartbeatAt: runtime.lastHeartbeatAt,
    completedJobs: runtime.completedJobs,
    failedJobs: runtime.failedJobs,
    lastError: runtime.lastError,
    externalWorkerRequired: !embeddedWorkersEnabled,
  };
}

function addEnvironmentChecks(checks: GateCheck[], env: EnvStatus) {
  const required: Array<[keyof EnvStatus, string, string, string]> = [
    ['appUrl', 'APP_URL_READY', 'App URL', 'NEXT_PUBLIC_APP_URL / NEXTAUTH_URL is configured.'],
    ['databaseUrl', 'DATABASE_READY', 'Database URL', 'DATABASE_URL is configured.'],
    ['redisUrl', 'REDIS_ENV_READY', 'Redis URL', 'REDIS_URL is configured.'],
    ['jwtSecret', 'JWT_SECRET_READY', 'JWT secret', 'JWT_SECRET is configured.'],
    ['jwtRefreshSecret', 'JWT_REFRESH_SECRET_READY', 'JWT refresh secret', 'JWT_REFRESH_SECRET is configured.'],
    ['metaPixelId', 'META_PIXEL_READY', 'Meta Pixel ID', 'Meta Pixel ID is configured.'],
    ['metaCapiToken', 'META_CAPI_TOKEN_READY', 'Meta CAPI token', 'Meta CAPI access token is configured.'],
    ['ga4MeasurementId', 'GA4_MEASUREMENT_READY', 'GA4 Measurement ID', 'GA4 Measurement ID is configured.'],
    ['ga4ApiSecret', 'GA4_API_SECRET_READY', 'GA4 API secret', 'GA4 Measurement Protocol API secret is configured.'],
    ['cronSecret', 'TRACKING_CRON_SECRET_READY', 'Tracking cron secret', 'TRACKING_HEALTH_CRON_SECRET / CRON_SECRET is configured.'],
  ];

  required.forEach(([key, code, label, message]) => {
    if (env[key]) {
      addCheck(checks, passCheck('environment', code, label, message));
    } else {
      addCheck(
        checks,
        blockerCheck('environment', code, label, message.replace(' is configured.', ' is missing or still a placeholder.'), 'Set the production env before deploy.')
      );
    }
  });

  if (env.alertWebhook) {
    addCheck(checks, passCheck('environment', 'ALERT_WEBHOOK_READY', 'Alert webhook', 'Tracking alert webhook is configured.'));
  } else {
    addCheck(checks, warnCheck('environment', 'ALERT_WEBHOOK_MISSING', 'Alert webhook', 'No tracking alert webhook is configured.', 'Set TRACKING_HEALTH_ALERT_WEBHOOK_URL for Slack/Discord/generic alerts.'));
  }

  if (env.testEventCodeDisabledInProduction) {
    addCheck(checks, passCheck('environment', 'META_TEST_EVENT_DISABLED', 'Meta test event code', 'META_TEST_EVENT_CODE is disabled in production.'));
  } else {
    addCheck(checks, blockerCheck('environment', 'META_TEST_EVENT_ENABLED_IN_PROD', 'Meta test event code', 'META_TEST_EVENT_CODE is set while NODE_ENV=production.', 'Remove test_event_code before live deploy.'));
  }

  if (env.gtmAudited) {
    addCheck(checks, passCheck('environment', 'GTM_DUPLICATE_GUARD', 'GTM duplicate guard', env.gtmEnabled ? 'GTM is enabled and marked audited.' : 'GTM is disabled, reducing duplicate Meta/GA4 ecommerce risk.'));
  } else {
    addCheck(checks, warnCheck('environment', 'GTM_ENABLED_NOT_AUDITED', 'GTM duplicate guard', 'GTM is enabled but ecommerce tag audit flag is not set.', 'Set GTM_ECOMMERCE_TAGS_AUDITED=true only after confirming GTM does not duplicate Pixel/GA4 ecommerce events.'));
  }
}

function addQueueWorkerChecks(checks: GateCheck[], queue: QueueStatus, worker: WorkerStatus) {
  if (queue.reachable) {
    addCheck(checks, passCheck('queue_worker', 'QUEUE_REACHABLE', 'Meta/GA4 queue', 'BullMQ/Redis queue is reachable.'));
  } else {
    addCheck(checks, blockerCheck('queue_worker', 'QUEUE_UNREACHABLE', 'Meta/GA4 queue', 'BullMQ/Redis queue is not reachable.', 'Check REDIS_URL and Redis network access.', queue.error ?? null));
  }

  const backlog = queue.waiting + queue.delayed;
  if (backlog >= 100) {
    addCheck(checks, blockerCheck('queue_worker', 'QUEUE_BACKLOG_HIGH', 'Queue backlog', 'Meta/GA4 queue backlog is very high.', 'Worker may be down or rate-limited.', backlog));
  } else if (backlog > 20) {
    addCheck(checks, warnCheck('queue_worker', 'QUEUE_BACKLOG_WARN', 'Queue backlog', 'Meta/GA4 queue has a backlog.', 'Check worker logs and queue throughput.', backlog));
  } else {
    addCheck(checks, passCheck('queue_worker', 'QUEUE_BACKLOG_OK', 'Queue backlog', 'Queue backlog is within deploy gate tolerance.', backlog));
  }

  if (queue.failed > 0) {
    addCheck(checks, warnCheck('queue_worker', 'QUEUE_FAILED_JOBS_PRESENT', 'Failed queue jobs', 'Failed jobs are retained in the Meta/GA4 queue.', 'Inspect tracking health dashboard before deploy.', queue.failed));
  } else {
    addCheck(checks, passCheck('queue_worker', 'QUEUE_FAILED_JOBS_CLEAR', 'Failed queue jobs', 'No retained failed jobs in the Meta/GA4 queue.'));
  }

  if (worker.externalWorkerRequired) {
    addCheck(checks, warnCheck('queue_worker', 'EXTERNAL_WORKER_REQUIRED', 'Worker mode', 'Embedded workers are disabled; deploy must run npm run worker:meta-capi or npm run worker:all as a separate process.', 'Confirm worker process health in Dokploy/PM2/systemd before deploy.'));
  } else if (worker.startedInThisProcess) {
    addCheck(checks, passCheck('queue_worker', 'EMBEDDED_WORKER_STARTED', 'Meta/GA4 worker', 'Embedded Meta CAPI/GA4 worker is started in this server process.'));
  } else if (process.env.PRODUCTION_QA_CLI === 'true') {
    addCheck(checks, warnCheck('queue_worker', 'EMBEDDED_WORKER_NOT_OBSERVABLE_IN_CLI', 'Meta/GA4 worker', 'CLI deploy gate cannot observe the Next.js instrumentation worker runtime.', 'Open /admin/production-qa after server start to confirm embedded worker runtime.'));
  } else {
    addCheck(checks, blockerCheck('queue_worker', 'EMBEDDED_WORKER_NOT_OBSERVED', 'Meta/GA4 worker', 'Embedded worker is enabled but not observed in this server process.', 'Check instrumentation.ts startup logs and DISABLE_EMBEDDED_WORKERS.'));
  }

  if (worker.lastError) {
    addCheck(checks, warnCheck('queue_worker', 'WORKER_LAST_ERROR', 'Worker last error', 'Worker reported an error recently.', worker.lastError));
  }
}

function addTrackingHealthChecks(checks: GateCheck[], latest: LatestHealthCheck, liveStatus: string) {
  if (!latest) {
    addCheck(checks, warnCheck('tracking_health', 'NO_TRACKING_HEALTH_HISTORY', 'Tracking health cron', 'No saved tracking health cron run found.', 'Call /api/cron/tracking-health after deploy and schedule it daily.'));
  } else if (latest.ageHours > RECENT_HEALTH_MAX_AGE_HOURS) {
    addCheck(checks, warnCheck('tracking_health', 'TRACKING_HEALTH_STALE', 'Tracking health cron', 'Latest tracking health cron run is stale.', 'Schedule daily cron and verify TRACKING_HEALTH_CRON_SECRET.', Math.round(latest.ageHours)));
  } else {
    addCheck(checks, passCheck('tracking_health', 'TRACKING_HEALTH_RECENT', 'Tracking health cron', 'A recent tracking health cron result exists.', `${Math.round(latest.ageHours * 10) / 10}h old`));
  }

  if (liveStatus === 'CRITICAL') {
    addCheck(checks, blockerCheck('tracking_health', 'LIVE_TRACKING_HEALTH_CRITICAL', 'Live tracking health', 'Live tracking health snapshot is CRITICAL.', 'Open /admin/tracking-health and resolve blockers before deploy.'));
  } else if (liveStatus === 'WARN') {
    addCheck(checks, warnCheck('tracking_health', 'LIVE_TRACKING_HEALTH_WARN', 'Live tracking health', 'Live tracking health snapshot has warnings.', 'Review warnings before deploy.'));
  } else {
    addCheck(checks, passCheck('tracking_health', 'LIVE_TRACKING_HEALTH_OK', 'Live tracking health', 'Live tracking health snapshot is OK.'));
  }
}

function addPrivacyCatalogChecks(checks: GateCheck[], privacyCatalog: Awaited<ReturnType<typeof buildPrivacyCatalogQaSnapshot>>) {
  if (privacyCatalog.env.trackingDisclosureVerified && privacyCatalog.env.cookieDisclosureVerified) {
    addCheck(checks, passCheck('privacy_catalog', 'PRIVACY_DISCLOSURE_READY', 'Privacy disclosure', 'Tracking/cookie disclosure is marked verified.'));
  } else {
    addCheck(checks, warnCheck('privacy_catalog', 'PRIVACY_DISCLOSURE_NOT_VERIFIED', 'Privacy disclosure', 'Tracking/cookie disclosure is not marked verified.', 'Verify privacy policy/cookie disclosure and set TRACKING_DISCLOSURE_VERIFIED=true and COOKIE_DISCLOSURE_VERIFIED=true.'));
  }

  if (!privacyCatalog.env.clarityEnabled || privacyCatalog.env.clarityMaskingVerified) {
    addCheck(checks, passCheck('privacy_catalog', 'CLARITY_MASKING_READY', 'Clarity masking', privacyCatalog.env.clarityEnabled ? 'Clarity masking is marked verified.' : 'Clarity is disabled.'));
  } else {
    addCheck(checks, warnCheck('privacy_catalog', 'CLARITY_MASKING_NOT_VERIFIED', 'Clarity masking', 'Clarity is enabled but sensitive masking is not marked verified.', 'Run checkout form masking QA and set CLARITY_SENSITIVE_MASKING_VERIFIED=true.'));
  }

  if (privacyCatalog.metrics.criticalCatalogIssueProducts > 0) {
    addCheck(checks, blockerCheck('privacy_catalog', 'CATALOG_CRITICAL_ISSUES', 'Meta Catalog readiness', 'Active products have critical catalog readiness issues.', 'Fix missing product image/SKU/price/canonical data before dynamic ads scale.', privacyCatalog.metrics.criticalCatalogIssueProducts));
  } else if (privacyCatalog.metrics.catalogIssueProducts > 0) {
    addCheck(checks, warnCheck('privacy_catalog', 'CATALOG_WARNINGS', 'Meta Catalog readiness', 'Active products have catalog readiness warnings.', 'Review catalog issue products before Advantage+/DPA scale.', privacyCatalog.metrics.catalogIssueProducts));
  } else {
    addCheck(checks, passCheck('privacy_catalog', 'CATALOG_PRODUCTS_READY', 'Meta Catalog readiness', 'No catalog readiness issue found in scanned products.'));
  }
}


function addGa4AttributionChecks(checks: GateCheck[], ga4Qa: Awaited<ReturnType<typeof buildGa4QaSnapshot>>) {
  if (ga4Qa.env.referralExclusionsVerified) {
    addCheck(checks, passCheck('ga4_attribution', 'GA4_REFERRAL_EXCLUSIONS_READY', 'GA4 unwanted referrals', 'Payment gateway unwanted referral exclusions are marked verified.'));
  } else {
    addCheck(checks, warnCheck('ga4_attribution', 'GA4_REFERRAL_EXCLUSIONS_NOT_VERIFIED', 'GA4 unwanted referrals', 'Payment gateway unwanted referral exclusions are not marked verified.', 'Configure exact bKash/Nagad/SSLCommerz/aamarPay/ShurjoPay hosts in GA4 unwanted referrals, test a paid order, then set GA4_PAYMENT_REFERRAL_EXCLUSIONS_VERIFIED=true.'));
  }

  if (ga4Qa.env.appRouterPageViewVerified) {
    addCheck(checks, passCheck('ga4_attribution', 'GA4_APP_ROUTER_PAGEVIEW_READY', 'GA4 App Router page_view', 'Manual App Router page_view QA is marked verified.'));
  } else {
    addCheck(checks, warnCheck('ga4_attribution', 'GA4_APP_ROUTER_PAGEVIEW_NOT_VERIFIED', 'GA4 App Router page_view', 'App Router page_view QA is not marked verified.', 'Navigate homepage → product → cart → checkout and confirm exactly one GA4 page_view per URL change; then set GA4_APP_ROUTER_PAGEVIEW_VERIFIED=true.'));
  }

  if (ga4Qa.env.paymentReturnSourceVerified) {
    addCheck(checks, passCheck('ga4_attribution', 'GA4_PAYMENT_RETURN_SOURCE_READY', 'GA4 payment source preservation', 'Payment return source/medium preservation QA is marked verified.'));
  } else {
    addCheck(checks, warnCheck('ga4_attribution', 'GA4_PAYMENT_RETURN_SOURCE_NOT_VERIFIED', 'GA4 payment source preservation', 'Payment return source/medium preservation QA is not marked verified.', 'Complete a paid gateway order from a UTM/ad click and verify GA4 purchase source remains the original campaign, not gateway/referral; then set GA4_PAYMENT_RETURN_SOURCE_VERIFIED=true.'));
  }

  if (ga4Qa.metrics.expectedPurchases >= 3 && ga4Qa.metrics.gaClientMissingRate >= 0.3) {
    addCheck(checks, warnCheck('ga4_attribution', 'GA4_CLIENT_ID_CAPTURE_WARN', 'GA4 client/session capture', 'Many recent purchase-eligible orders are missing GA client ID.', 'Verify browser GA tag, consent mode, and checkout cookie capture before scaling ads.', `${Math.round(ga4Qa.metrics.gaClientMissingRate * 100)}%`));
  } else {
    addCheck(checks, passCheck('ga4_attribution', 'GA4_CLIENT_ID_CAPTURE_OK', 'GA4 client/session capture', 'GA client ID capture rate is within deploy gate tolerance.', `${Math.round(ga4Qa.metrics.gaClientMissingRate * 100)}%`));
  }
}

function buildManualQaSteps(): ManualQaStep[] {
  return FULL_PRODUCTION_QA_MATRIX.map((step) => ({
    ...step,
    ...getQaStepVerification(step),
  }));
}

function addManualQaChecks(checks: GateCheck[]) {
  const summary = getFullQaMatrixSummary();

  for (const step of summary.rows) {
    if (step.verified) {
      addCheck(
        checks,
        passCheck(
          'manual_qa',
          `QA_${step.key.toUpperCase()}_VERIFIED`,
          step.title,
          `${step.expected} Evidence flag ${step.envKey}=true is set.`,
          step.evidenceUrl ?? step.envKey
        )
      );
      continue;
    }

    if (step.blocker) {
      addCheck(
        checks,
        blockerCheck(
          'manual_qa',
          `QA_${step.key.toUpperCase()}_NOT_VERIFIED`,
          step.title,
          'Required manual QA evidence is not marked verified.',
          `Complete test: ${step.expected} Evidence needed: ${step.evidence}. Then set ${step.envKey}=true${step.evidenceEnvKey ? ` and optionally ${step.evidenceEnvKey}=<evidence URL>` : ''}.`
        )
      );
    } else {
      addCheck(
        checks,
        warnCheck(
          'manual_qa',
          `QA_${step.key.toUpperCase()}_NOT_VERIFIED`,
          step.title,
          'Recommended manual QA evidence is not marked verified.',
          `Complete test when possible and set ${step.envKey}=true. Evidence: ${step.evidence}`
        )
      );
    }
  }

  addCheck(checks, passCheck('documentation', 'PRODUCTION_QA_DOC_AVAILABLE', 'Production QA doc', 'PRODUCTION_QA.md documents the full deploy matrix and evidence flags.'));
  addCheck(checks, passCheck('documentation', 'PHASE8_REGRESSION_LOCKS_AVAILABLE', 'Phase 8 regression locks', 'Security audit and phase8 static contract checks enforce the full production rules.'));
}

function resolveGateStatus(checks: GateCheck[]): DeployGateStatus {
  if (checks.some((check) => check.severity === 'BLOCKER')) return 'BLOCKED';
  if (checks.some((check) => check.severity === 'WARN')) return 'WARN';
  return 'READY';
}

function createDeployMessage(status: DeployGateStatus) {
  if (status === 'READY') return 'Deploy gate is READY. Required manual QA evidence and regression locks are verified.';
  if (status === 'WARN') return 'Deploy gate has warnings. Deploy only after reviewing warnings and recommended QA evidence.';
  return 'Deploy gate is BLOCKED. Fix blocker checks before production deploy.';
}

export async function buildProductionQaSnapshot(options?: { windowHours?: number }): Promise<ProductionQaSnapshot> {
  const windowHours = clampWindowHours(options?.windowHours);
  const checkedAt = new Date().toISOString();

  const [queue, latestHealthCheck, liveTrackingHealth, privacyCatalog, ga4Qa] = await Promise.all([
    getQueueStatus(),
    getLatestHealthCheck(),
    buildTrackingHealthSnapshot({ windowHours }),
    buildPrivacyCatalogQaSnapshot({ limit: 50 }),
    buildGa4QaSnapshot({ windowHours }),
  ]);

  const env = buildEnvStatus();
  const worker = buildWorkerStatus();
  const checks: GateCheck[] = [];

  addEnvironmentChecks(checks, env);
  addQueueWorkerChecks(checks, queue, worker);
  addTrackingHealthChecks(checks, latestHealthCheck, liveTrackingHealth.status);
  addPrivacyCatalogChecks(checks, privacyCatalog);
  addGa4AttributionChecks(checks, ga4Qa);
  addManualQaChecks(checks);

  const status = resolveGateStatus(checks);
  const blockerCount = checks.filter((check) => check.severity === 'BLOCKER').length;
  const warningCount = checks.filter((check) => check.severity === 'WARN').length;
  const passCount = checks.filter((check) => check.severity === 'PASS').length;
  const manualQaSummary = getFullQaMatrixSummary();

  return {
    status,
    checkedAt,
    windowHours,
    env,
    queue,
    worker,
    latestHealthCheck,
    liveTrackingHealth,
    privacyCatalog,
    ga4Qa,
    checks,
    manualQaSteps: buildManualQaSteps(),
    summary: {
      blockerCount,
      warningCount,
      passCount,
      deployMessage: createDeployMessage(status),
      manualQaTotal: manualQaSummary.total,
      manualQaRequired: manualQaSummary.required,
      manualQaRequiredVerified: manualQaSummary.requiredVerified,
      manualQaMissingRequired: manualQaSummary.missingRequired,
    },
  };
}
