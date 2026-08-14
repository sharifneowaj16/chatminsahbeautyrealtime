#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTrackingDeployEnv, isPlaceholderValue } from './tracking-env-audit.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function read(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return '';
  return fs.readFileSync(absolutePath, 'utf8');
}

function fileExists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function hasAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

function check({ code, status, category = 'tiktok', label, message, hint, value }) {
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

function getEnvValue(env, key) {
  return String(env?.[key] ?? '').trim();
}

function isTrue(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

function looksLikeTikTokPixelId(value) {
  return /^[A-Za-z0-9_-]{8,64}$/.test(String(value ?? '').trim());
}

function looksLikeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function parsePositiveInt(value) {
  const parsed = Number(String(value ?? '').trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function summarize(checks, { env, productionMode }) {
  const blockerCount = checks.filter((item) => item.status === 'BLOCKER').length;
  const warningCount = checks.filter((item) => item.status === 'WARN').length;
  const passCount = checks.filter((item) => item.status === 'PASS').length;
  const status = blockerCount > 0 ? 'BLOCKED' : warningCount > 0 ? 'WARN' : 'PASS';

  return {
    ok: blockerCount === 0,
    status,
    checkedAt: new Date().toISOString(),
    productionMode,
    tiktokPixelEnabled: isTrue(getEnvValue(env, 'NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED')),
    tiktokEventsApiEnabled: isTrue(getEnvValue(env, 'TIKTOK_EVENTS_API_ENABLED')),
    passCount,
    warningCount,
    blockerCount,
    checks,
  };
}

function addStaticProjectChecks({ checks, root }) {
  const proxy = read(root, 'proxy.ts');
  const allPixels = read(root, 'lib/tracking/pixels/AllPixels.tsx');
  const manager = read(root, 'lib/tracking/manager.ts');
  const tiktokPixel = read(root, 'lib/tracking/pixels/TikTokPixel.tsx');
  const tiktokRouteTracker = read(root, 'lib/tracking/pixels/TikTokRouteTracker.tsx');
  const attributionHelper = read(root, 'lib/tracking/tiktok-attribution.ts');
  const attributionCapture = read(root, 'lib/tracking/pixels/AttributionCookieCapture.tsx');
  const orderAttribution = read(root, 'lib/tracking/order-attribution.ts');
  const schema = read(root, 'prisma/schema.prisma');
  const tiktokSender = read(root, 'lib/tracking/tiktok-events-api-purchase.ts');
  const queue = read(root, 'lib/queue/metaCapiQueue.ts');
  const worker = read(root, 'lib/workers/metaCapiWorker.ts');
  const adminOrders = read(root, 'app/api/admin/orders/[id]/route.ts');
  const telegramCallback = read(root, 'app/api/telegram/order-callback/route.ts');
  const verifiedPayment = read(root, 'app/api/payments/verified/route.ts');
  const trackingHealthRoute = read(root, 'app/api/admin/tracking-health/route.ts');
  const failureRetention = read(root, 'lib/tracking/failure-retention.ts');
  const health = read(root, 'lib/tracking/health.ts');
  const healthPage = read(root, 'app/admin/tracking-health/page.tsx');
  const trackingPage = read(root, 'app/admin/tracking/page.tsx');
  const envExample = read(root, '.env.example');
  const envProd = read(root, 'ENVIRONMENT_VARIABLES_PRODUCTION.md');
  const packageJsonText = read(root, 'package.json');
  const packageJson = packageJsonText ? JSON.parse(packageJsonText) : {};

  checks.push(hasAll(proxy, [
    'https://analytics.tiktok.com',
    'script-src',
    'connect-src',
    'img-src',
    'https://connect.facebook.net',
    'https://www.google-analytics.com',
    'https://graph.facebook.com',
  ]) ? pass({
    code: 'TIKTOK_CSP_ALLOWED_WITH_META_GA4_PRESERVED',
    label: 'TikTok CSP',
    message: 'TikTok analytics domain is allowed in CSP without removing Meta/GA4/GTM domains.',
  }) : blocker({
    code: 'TIKTOK_CSP_MISSING_OR_REGRESSION',
    label: 'TikTok CSP',
    message: 'CSP must allow analytics.tiktok.com while preserving Meta/GA4/GTM domains.',
  }));

  checks.push(hasAll(allPixels, [
    "process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED === 'true'",
    'process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID',
    'TikTokRouteTracker',
  ]) ? pass({
    code: 'TIKTOK_PIXEL_ENV_GATED_AND_ROUTE_TRACKER_MOUNTED',
    label: 'Browser Pixel gate',
    message: 'TikTok Pixel remains gated by enable flag plus Pixel ID, and route tracker is mounted only with TikTok enabled.',
  }) : blocker({
    code: 'TIKTOK_PIXEL_GATE_OR_ROUTE_TRACKER_MISSING',
    label: 'Browser Pixel gate',
    message: 'TikTok Pixel must require enabled=true plus Pixel ID and include the route tracker.',
  }));

  checks.push(hasAll(tiktokPixel, ['ttq.ready', '__mbTikTokInitReady', 'ttq.page()']) && fileExists(root, 'lib/tracking/pixels/TikTokRouteTracker.tsx') && hasAll(tiktokRouteTracker, ['usePathname', 'useSearchParams', 'window.ttq?.page?.()']) ? pass({
    code: 'TIKTOK_BROWSER_READY_AND_ROUTE_EVENTS_PRESENT',
    label: 'Browser reliability',
    message: 'TikTok browser ready flag and App Router page tracking are present.',
  }) : blocker({
    code: 'TIKTOK_BROWSER_READY_OR_ROUTE_EVENTS_MISSING',
    label: 'Browser reliability',
    message: 'TikTok ready flag and route-change page tracking are required.',
  }));

  checks.push(hasAll(manager, [
    'trackTikTok(event, data, attempt + 1)',
    'attempt < 50',
    'buildTikTokPayload',
    "if (event === 'Purchase')",
    'mb_tiktok_purchase_blocked',
    "Purchase: 'Purchase'",
  ]) && !manager.includes("Purchase: 'CompletePayment'") ? pass({
    code: 'TIKTOK_BROWSER_PURCHASE_BLOCKED_AND_PAYLOAD_MAPPER_PRESENT',
    label: 'Browser Purchase safety',
    message: 'Client-side TikTok Purchase is blocked, retry is bounded, and TikTok-specific payload mapping is present.',
  }) : blocker({
    code: 'TIKTOK_BROWSER_PURCHASE_OR_MAPPER_REGRESSION',
    label: 'Browser Purchase safety',
    message: 'TikTok browser Purchase must remain blocked and event mapping must use Purchase, not CompletePayment.',
  }));

  checks.push(hasAll(attributionHelper, [
    "TIKTOK_CLICK_ID_COOKIE = 'ttclid'",
    "TIKTOK_TTP_COOKIE = '_ttp'",
    'resolveTikTokClickIdMaxAgeSeconds',
    'DEFAULT_TIKTOK_CLICK_ID_MAX_AGE_DAYS = 90',
    'MAX_TIKTOK_CLICK_ID_MAX_AGE_DAYS = 365',
  ]) && hasAll(attributionCapture, [
    'captureTikTokClickId',
    "searchParams.get('ttclid')",
    'NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS',
    'canLoadNonEssentialTracking(getClientTrackingConsent())',
  ]) ? pass({
    code: 'TIKTOK_TTCLID_CAPTURE_CONFIGURABLE_AND_CONSENTED',
    label: 'ttclid attribution',
    message: 'ttclid capture uses configurable retention and consent guards.',
  }) : blocker({
    code: 'TIKTOK_TTCLID_CAPTURE_MISSING_OR_UNSAFE',
    label: 'ttclid attribution',
    message: 'ttclid capture must be configurable, consent-aware, and backed by helper constants.',
  }));

  checks.push(hasAll(orderAttribution, ['tiktokClickId', 'tiktokTtp', 'tiktokExternalId', 'nonEssentialTrackingAllowed']) && hasAll(schema, [
    'tiktokClickId',
    'tiktokTtp',
    'tiktokEventId',
    'tiktokPurchaseSent',
    '@@index([tiktokClickId])',
    '@@index([tiktokPurchaseSent])',
    'fbp                  String?',
    'fbc                  String?',
    'gaClientId           String?',
  ]) ? pass({
    code: 'TIKTOK_ORDER_ATTRIBUTION_ADDITIVE_META_GA4_PRESERVED',
    label: 'Order attribution',
    message: 'TikTok order attribution fields are additive and Meta/GA4 attribution fields remain present.',
  }) : blocker({
    code: 'TIKTOK_ORDER_ATTRIBUTION_OR_META_GA4_FIELD_REGRESSION',
    label: 'Order attribution',
    message: 'TikTok order attribution fields and existing Meta/GA4 fields are required.',
  }));

  checks.push(hasAll(tiktokSender, [
    "import 'server-only';",
    'sendCodPurchaseToTikTok',
    'sendOnlinePaidPurchaseToTikTok',
    'TIKTOK_EVENTS_API_URL',
    'https://business-api.tiktok.com/open_api/v1.3/event/track/',
    "'Access-Token': TIKTOK_ACCESS_TOKEN",
    "event_source: 'web'",
    'data: [',
    "event: 'Purchase'",
    'event_id: eventId',
    'ttclid: order.tiktokClickId',
    'ttp: order.tiktokTtp',
    'sha256(normalizedEmail)',
    'sha256(normalizedPhone)',
  ]) ? pass({
    code: 'TIKTOK_EVENTS_API_SENDER_SCHEMA_AND_MATCH_KEYS_PRESENT',
    label: 'Events API sender',
    message: 'TikTok server sender uses the v1.3 /event/track/ web data shape and match keys.',
  }) : blocker({
    code: 'TIKTOK_EVENTS_API_SENDER_SCHEMA_REGRESSION',
    label: 'Events API sender',
    message: 'TikTok server sender must use official Purchase/web payload shape and match keys.',
  }));

  checks.push(hasAll(tiktokSender, [
    "TIKTOK_EVENTS_API_ENABLED === 'true'",
    "TIKTOK_PURCHASE_LIVE_VERIFIED === 'true'",
    'claimTikTokPurchaseSend',
    'tiktokPurchaseSent: false',
    'tiktokPurchaseProcessingAt',
    'classifyStoredOrderTraffic(order, { skipBot: true })',
    "source === 'cod_phone_confirmed'",
    'isCodPaymentMethod(order.paymentMethod)',
    '!order.phoneConfirmedAt',
    "source: 'online_paid'",
    '!isCompletedPaymentStatus(order.paymentStatus)',
    "VERIFIED_PAYMENT_MISSING",
  ]) ? pass({
    code: 'TIKTOK_VERIFIED_PURCHASE_GATES_PRESENT',
    label: 'Verified Purchase gate',
    message: 'TikTok Purchase is gated to confirmed COD and verified online payments only.',
  }) : blocker({
    code: 'TIKTOK_VERIFIED_PURCHASE_GATE_REGRESSION',
    label: 'Verified Purchase gate',
    message: 'TikTok Purchase must be fail-closed and verified before sending.',
  }));

  checks.push(hasAll(queue, ['TikTokPurchaseJobData', 'enqueueTikTokPurchase', 'MetaCapiPurchaseJobData', 'Ga4PurchaseJobData']) && hasAll(worker, [
    'sendCodPurchaseToTikTok',
    'sendOnlinePaidPurchaseToTikTok',
    "job.data.type === 'tiktok_cod_purchase'",
    "job.data.type === 'tiktok_online_paid_purchase'",
    'META_CAPI_PURCHASE_QUEUE_NAME',
  ]) ? pass({
    code: 'TIKTOK_QUEUE_ADDITIVE_META_GA4_QUEUE_PRESERVED',
    label: 'Queue/worker',
    message: 'TikTok jobs are additive inside the existing queue without renaming the Meta CAPI worker path.',
  }) : blocker({
    code: 'TIKTOK_QUEUE_OR_META_GA4_QUEUE_REGRESSION',
    label: 'Queue/worker',
    message: 'TikTok queue jobs must be additive and Meta/GA4 queue types must remain present.',
  }));

  checks.push(hasAll(adminOrders, ['enqueueMetaCapiPurchase', 'enqueueGa4Purchase', 'enqueueTikTokPurchase', 'tiktok_cod_purchase']) && hasAll(telegramCallback, ['enqueueMetaCapiPurchase', 'enqueueGa4Purchase', 'enqueueTikTokPurchase', 'tiktok_cod_purchase']) && hasAll(verifiedPayment, ['tiktok_online_paid_purchase', 'tiktokPurchaseQueued', 'PAYMENT_RECORDED_TIKTOK_PURCHASE_QUEUE_FAILED']) ? pass({
    code: 'TIKTOK_ENQUEUE_POINTS_AFTER_EXISTING_META_GA4_PRESENT',
    label: 'Purchase enqueue points',
    message: 'TikTok Purchase enqueue points exist beside existing Meta/GA4 enqueue calls.',
  }) : blocker({
    code: 'TIKTOK_ENQUEUE_POINTS_MISSING_OR_META_GA4_REGRESSION',
    label: 'Purchase enqueue points',
    message: 'TikTok enqueue points must be present without removing Meta/GA4 enqueue calls.',
  }));

  checks.push(hasAll(tiktokSender, ["provider: 'TIKTOK'", 'hasTtclid', 'hasTtp']) && hasAll(failureRetention, ["provider === 'TIKTOK'", 'TIKTOK_ENV_MISSING']) && hasAll(trackingHealthRoute, ['tiktokPurchaseSent: true', 'manual_retry:tiktok_cod_purchase', 'manual_retry:tiktok_online_paid_purchase']) ? pass({
    code: 'TIKTOK_FAILURE_RETENTION_AND_MANUAL_RETRY_PRESENT',
    label: 'Failure/retry',
    message: 'TikTok failures use provider TIKTOK and manual retry can enqueue verified TikTok Purchase jobs.',
  }) : blocker({
    code: 'TIKTOK_FAILURE_RETENTION_OR_RETRY_MISSING',
    label: 'Failure/retry',
    message: 'TikTok failure retention and manual retry integration are required.',
  }));

  checks.push(hasAll(health, [
    'tiktokPurchaseSent',
    'tiktokFailures',
    'tiktokFinalFailures',
    "provider: 'TIKTOK', createdAt: { gte: since }",
    "provider: 'META', createdAt: { gte: since }",
    "provider: 'GA4', createdAt: { gte: since }",
    "code: 'TIKTOK_PURCHASE_GAP'",
  ]) && hasAll(healthPage, [
    'TikTok Events API Health',
    'TikTok Purchase Sent',
    'TikTok Pending Orders',
    'ttclid Coverage',
    '_ttp Coverage',
  ]) ? pass({
    code: 'TIKTOK_HEALTH_DASHBOARD_PROVIDER_SPECIFIC_PRESENT',
    label: 'Health dashboard',
    message: 'TikTok health metrics are surfaced and failure counts are provider-specific.',
  }) : blocker({
    code: 'TIKTOK_HEALTH_DASHBOARD_OR_PROVIDER_FILTER_REGRESSION',
    label: 'Health dashboard',
    message: 'TikTok health metrics and provider-specific failure filters are required.',
  }));

  checks.push(hasAll(trackingPage, ['ROAS hidden', 'Use Tracking Health for verified Purchase status']) && !trackingPage.includes("source: 'TikTok'") ? pass({
    code: 'TIKTOK_FAKE_ROAS_AND_MOCK_TRAFFIC_REMOVED',
    label: 'Fake ROAS guard',
    message: 'Admin analytics no longer shows fake TikTok ROAS or mock TikTok source revenue.',
  }) : blocker({
    code: 'TIKTOK_FAKE_ROAS_OR_MOCK_TRAFFIC_PRESENT',
    label: 'Fake ROAS guard',
    message: 'TikTok fake ROAS and mock source revenue must remain hidden until verified server events are live.',
  }));

  checks.push(hasAll(envExample, [
    'NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED=false',
    'NEXT_PUBLIC_TIKTOK_PIXEL_ID=',
    'TIKTOK_CLICK_ID_MAX_AGE_DAYS=90',
    'NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS=90',
    'TIKTOK_EVENTS_API_ENABLED=false',
    'TIKTOK_PIXEL_ID=',
    'TIKTOK_ACCESS_TOKEN=',
    'TIKTOK_EVENTS_API_URL=https://business-api.tiktok.com/open_api/v1.3/event/track/',
    'TIKTOK_PURCHASE_LIVE_VERIFIED=false',
  ]) && hasAll(envProd, [
    'NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED',
    'TIKTOK_EVENTS_API_ENABLED',
    'TIKTOK_ACCESS_TOKEN',
    'TIKTOK_PURCHASE_LIVE_VERIFIED',
    'TIKTOK_CLICK_ID_MAX_AGE_DAYS',
  ]) ? pass({
    code: 'TIKTOK_ENV_DOCUMENTED_WITH_SERVER_SECRET_SEPARATION',
    label: 'Environment docs',
    message: 'TikTok browser and server-side env variables are documented separately.',
  }) : blocker({
    code: 'TIKTOK_ENV_DOCS_INCOMPLETE',
    label: 'Environment docs',
    message: 'TikTok browser/server env variables and safety gates must be documented.',
  }));

  checks.push(packageJson.scripts?.['qa:phase31b-tiktok-browser'] && packageJson.scripts?.['qa:phase31c-tiktok-attribution'] && packageJson.scripts?.['qa:phase31d-tiktok-events-api'] && packageJson.scripts?.['qa:phase31e-tiktok-health'] ? pass({
    code: 'TIKTOK_PRIOR_PHASE_AUDITS_REGISTERED',
    label: 'Prior audits',
    message: 'Phase 31B–31E TikTok audit scripts remain registered.',
  }) : blocker({
    code: 'TIKTOK_PRIOR_PHASE_AUDITS_MISSING',
    label: 'Prior audits',
    message: 'Phase 31B–31E TikTok audit scripts must remain registered.',
  }));
}

function addEnvChecks({ checks, env, productionMode }) {
  const pixelEnabled = isTrue(getEnvValue(env, 'NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED'));
  const publicPixelId = getEnvValue(env, 'NEXT_PUBLIC_TIKTOK_PIXEL_ID');
  const serverPixelId = getEnvValue(env, 'TIKTOK_PIXEL_ID');
  const eventsApiEnabled = isTrue(getEnvValue(env, 'TIKTOK_EVENTS_API_ENABLED'));
  const accessToken = getEnvValue(env, 'TIKTOK_ACCESS_TOKEN');
  const liveVerified = isTrue(getEnvValue(env, 'TIKTOK_PURCHASE_LIVE_VERIFIED'));
  const testEventCode = getEnvValue(env, 'TIKTOK_TEST_EVENT_CODE');
  const eventsApiUrl = getEnvValue(env, 'TIKTOK_EVENTS_API_URL') || 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
  const clickIdMaxAge = getEnvValue(env, 'TIKTOK_CLICK_ID_MAX_AGE_DAYS') || getEnvValue(env, 'NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS');
  const publicToken = getEnvValue(env, 'NEXT_PUBLIC_TIKTOK_ACCESS_TOKEN');

  if (!pixelEnabled) {
    checks.push(warn({
      code: 'TIKTOK_PIXEL_DISABLED',
      label: 'TikTok Pixel env',
      message: 'NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED is not true. TikTok browser Pixel will stay disabled.',
      hint: 'This is safe for deploys before TikTok activation. Set it to true only with a real Pixel ID after staging verification.',
    }));
  } else if (!publicPixelId || isPlaceholderValue(publicPixelId) || !looksLikeTikTokPixelId(publicPixelId)) {
    checks.push(blocker({
      code: 'TIKTOK_PIXEL_ENABLED_WITH_INVALID_PIXEL_ID',
      label: 'TikTok Pixel env',
      message: 'TikTok Pixel is enabled but NEXT_PUBLIC_TIKTOK_PIXEL_ID is missing or placeholder-like.',
      hint: 'Set a real TikTok Pixel ID or disable NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED.',
    }));
  } else {
    checks.push(pass({
      code: 'TIKTOK_PIXEL_ENV_READY',
      label: 'TikTok Pixel env',
      message: 'TikTok Pixel env is enabled with a non-placeholder Pixel ID.',
    }));
  }

  if (!eventsApiEnabled) {
    checks.push(warn({
      code: 'TIKTOK_EVENTS_API_DISABLED',
      label: 'TikTok Events API env',
      message: 'TIKTOK_EVENTS_API_ENABLED is not true. Server-side TikTok Purchase will stay disabled.',
      hint: 'This is safe before production activation; enable only after Events Manager token/test verification.',
    }));
    return;
  }

  if (!serverPixelId && !publicPixelId) {
    checks.push(blocker({
      code: 'TIKTOK_EVENTS_API_PIXEL_ID_MISSING',
      label: 'TikTok Events API env',
      message: 'TikTok Events API is enabled but no TIKTOK_PIXEL_ID or NEXT_PUBLIC_TIKTOK_PIXEL_ID is configured.',
    }));
  } else if ((serverPixelId && isPlaceholderValue(serverPixelId)) || (publicPixelId && isPlaceholderValue(publicPixelId))) {
    checks.push(blocker({
      code: 'TIKTOK_EVENTS_API_PIXEL_ID_PLACEHOLDER',
      label: 'TikTok Events API env',
      message: 'TikTok Events API Pixel ID appears to be a placeholder.',
    }));
  } else {
    checks.push(pass({
      code: 'TIKTOK_EVENTS_API_PIXEL_ID_READY',
      label: 'TikTok Events API env',
      message: 'TikTok Events API has a non-placeholder Pixel ID source.',
    }));
  }

  if (!accessToken || isPlaceholderValue(accessToken) || accessToken.length < 24) {
    checks.push(blocker({
      code: 'TIKTOK_ACCESS_TOKEN_MISSING_OR_PLACEHOLDER',
      label: 'TikTok Events API token',
      message: 'TIKTOK_EVENTS_API_ENABLED is true but TIKTOK_ACCESS_TOKEN is missing, too short, or placeholder-like.',
      hint: 'Use a real server-only Events API access token from TikTok Events Manager / API for Business.',
    }));
  } else {
    checks.push(pass({
      code: 'TIKTOK_ACCESS_TOKEN_SERVER_ENV_READY',
      label: 'TikTok Events API token',
      message: 'TIKTOK_ACCESS_TOKEN is present as a server-side env variable.',
    }));
  }

  if (publicToken) {
    checks.push(blocker({
      code: 'TIKTOK_ACCESS_TOKEN_EXPOSED_PUBLICLY',
      label: 'TikTok Events API token',
      message: 'NEXT_PUBLIC_TIKTOK_ACCESS_TOKEN is set. Server access tokens must never be public.',
    }));
  } else {
    checks.push(pass({
      code: 'TIKTOK_ACCESS_TOKEN_NOT_PUBLIC',
      label: 'TikTok Events API token',
      message: 'No public TikTok access token env key is set.',
    }));
  }

  if (!looksLikeHttpsUrl(eventsApiUrl) || !eventsApiUrl.includes('/open_api/') || !eventsApiUrl.endsWith('/event/track/')) {
    checks.push(blocker({
      code: 'TIKTOK_EVENTS_API_URL_INVALID',
      label: 'TikTok Events API URL',
      message: 'TIKTOK_EVENTS_API_URL must be an HTTPS TikTok /event/track/ endpoint.',
      value: eventsApiUrl,
    }));
  } else {
    checks.push(pass({
      code: 'TIKTOK_EVENTS_API_URL_VALID',
      label: 'TikTok Events API URL',
      message: 'TikTok Events API URL has the expected HTTPS /event/track/ shape.',
      value: eventsApiUrl,
    }));
  }

  if (productionMode && liveVerified && testEventCode) {
    checks.push(blocker({
      code: 'TIKTOK_TEST_EVENT_CODE_SET_FOR_LIVE_PURCHASE',
      label: 'TikTok test event code',
      message: 'TIKTOK_TEST_EVENT_CODE must be empty when live Purchase verification is enabled in production.',
      hint: 'Clear TIKTOK_TEST_EVENT_CODE before live production Purchase sending.',
    }));
  } else if (testEventCode) {
    checks.push(warn({
      code: 'TIKTOK_TEST_EVENT_CODE_PRESENT',
      label: 'TikTok test event code',
      message: 'TIKTOK_TEST_EVENT_CODE is set. Events will be routed as test events.',
    }));
  } else {
    checks.push(pass({
      code: 'TIKTOK_TEST_EVENT_CODE_EMPTY_FOR_LIVE',
      label: 'TikTok test event code',
      message: 'No TikTok test event code is configured.',
    }));
  }

  if (!liveVerified) {
    checks.push(blocker({
      code: 'TIKTOK_PURCHASE_LIVE_NOT_VERIFIED_FOR_ENABLED_EVENTS_API',
      label: 'TikTok live verification',
      message: 'TIKTOK_EVENTS_API_ENABLED is true but TIKTOK_PURCHASE_LIVE_VERIFIED is not true.',
      hint: 'Keep Events API disabled or complete TikTok Events Manager testing and set TIKTOK_PURCHASE_LIVE_VERIFIED=true.',
    }));
  } else {
    checks.push(pass({
      code: 'TIKTOK_PURCHASE_LIVE_VERIFIED',
      label: 'TikTok live verification',
      message: 'TikTok server-side Purchase live verification gate is enabled.',
    }));
  }

  if (clickIdMaxAge) {
    const days = parsePositiveInt(clickIdMaxAge);
    if (!days || days > 365) {
      checks.push(blocker({
        code: 'TIKTOK_CLICK_ID_RETENTION_INVALID',
        label: 'TikTok click ID retention',
        message: 'TikTok click ID retention must be a positive integer no greater than 365 days.',
        value: clickIdMaxAge,
      }));
    } else {
      checks.push(pass({
        code: 'TIKTOK_CLICK_ID_RETENTION_VALID',
        label: 'TikTok click ID retention',
        message: 'TikTok click ID retention is configured within the allowed clamp range.',
        value: `${days} days`,
      }));
    }
  } else {
    checks.push(warn({
      code: 'TIKTOK_CLICK_ID_RETENTION_DEFAULTED',
      label: 'TikTok click ID retention',
      message: 'TikTok click ID retention is not set; code default of 90 days will be used.',
    }));
  }
}

export function runTikTokTrackingDeployGate(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const env = options.env ?? loadTrackingDeployEnv({ root });
  const productionMode = options.productionMode ?? options.production ?? true;
  const checks = [];

  addStaticProjectChecks({ checks, root });
  addEnvChecks({ checks, env, productionMode });

  return summarize(checks, { env, productionMode });
}

function printGate(result) {
  const title = result.ok ? 'TikTok tracking deploy gate passed' : 'TikTok tracking deploy gate blocked';
  console.log(title);
  console.log(`Status: ${result.status}`);
  console.log(`Pass: ${result.passCount}, Warn: ${result.warningCount}, Blocker: ${result.blockerCount}`);
  for (const item of result.checks) {
    const prefix = item.status === 'PASS' ? '✓' : item.status === 'WARN' ? '!' : '✗';
    if (item.status === 'PASS' && ![
      'TIKTOK_CSP_ALLOWED_WITH_META_GA4_PRESERVED',
      'TIKTOK_BROWSER_PURCHASE_BLOCKED_AND_PAYLOAD_MAPPER_PRESENT',
      'TIKTOK_EVENTS_API_SENDER_SCHEMA_AND_MATCH_KEYS_PRESENT',
      'TIKTOK_VERIFIED_PURCHASE_GATES_PRESENT',
      'TIKTOK_ACCESS_TOKEN_NOT_PUBLIC',
    ].includes(item.code)) continue;
    console.log(`${prefix} [${item.status}] ${item.code}: ${item.message}`);
    if (item.hint && item.status !== 'PASS') console.log(`  Hint: ${item.hint}`);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  const args = process.argv.slice(2);
  const result = runTikTokTrackingDeployGate({
    productionMode: args.includes('--production') || args.includes('--prod') || true,
  });

  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printGate(result);
  }

  if (!result.ok || (args.includes('--fail-on-warn') && result.warningCount > 0)) {
    process.exitCode = 1;
  }
}
