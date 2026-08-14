#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const checks = [];
const issues = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    issues.push(`Missing file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function expect(name, condition, details = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, details });
  if (!ok) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

function includesAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

const sender = read('lib/tracking/tiktok-events-api-purchase.ts');
const queue = read('lib/queue/metaCapiQueue.ts');
const worker = read('lib/workers/metaCapiWorker.ts');
const adminOrders = read('app/api/admin/orders/[id]/route.ts');
const telegram = read('app/api/telegram/order-callback/route.ts');
const verifiedPayment = read('app/api/payments/verified/route.ts');
const trackingHealth = read('app/api/admin/tracking-health/route.ts');
const failureRetention = read('lib/tracking/failure-retention.ts');
const envExample = read('.env.example');
const envProd = read('ENVIRONMENT_VARIABLES_PRODUCTION.md');
const manager = read('lib/tracking/manager.ts');
const packageJson = JSON.parse(read('package.json') || '{}');

expect('TikTok Events API sender exists with server-only guard', includesAll(sender, [
  "import 'server-only';",
  'sendCodPurchaseToTikTok',
  'sendOnlinePaidPurchaseToTikTok',
]));

expect('TikTok Events API uses configurable v1.3 event track endpoint and Access-Token header', includesAll(sender, [
  'TIKTOK_EVENTS_API_URL',
  'https://business-api.tiktok.com/open_api/v1.3/event/track/',
  "'Access-Token': TIKTOK_ACCESS_TOKEN",
]));

expect('TikTok Events API env gates are fail-closed', includesAll(sender, [
  "TIKTOK_EVENTS_API_ENABLED === 'true'",
  "TIKTOK_PURCHASE_LIVE_VERIFIED === 'true'",
  "TIKTOK_ENV_MISSING",
  "TIKTOK_PURCHASE_LIVE_NOT_VERIFIED",
]));

expect('TikTok payload uses official Events API 2.0 web data shape', includesAll(sender, [
  "event_source: 'web'",
  'event_source_id: TIKTOK_PIXEL_ID',
  'data: [',
  "event: 'Purchase'",
  'event_time: eventTime',
  'event_id: eventId',
  'user: {',
  'page: {',
  'properties: {',
]));

expect('TikTok Purchase match keys are included without raw PII', includesAll(sender, [
  'ttclid: order.tiktokClickId',
  'ttp: order.tiktokTtp',
  'email: emailHash',
  'phone: phoneHash',
  'external_id: externalIdHash',
  'ip: order.customerIp',
  'user_agent: order.customerUa',
  'sha256(normalizedEmail)',
  'sha256(normalizedPhone)',
]));

expect('TikTok Purchase idempotency claim uses existing TikTok Order fields', includesAll(sender, [
  'claimTikTokPurchaseSend',
  'tiktokPurchaseSent: false',
  'tiktokPurchaseProcessingAt',
  'tiktokEventId: eventId',
  'markTikTokPurchaseSent',
  'tiktokPurchaseSentAt: new Date()',
]));

expect('TikTok COD Purchase is phone-confirmation only', includesAll(sender, [
  "source === 'cod_phone_confirmed'",
  'isCodPaymentMethod(order.paymentMethod)',
  '!order.phoneConfirmedAt',
  "PHONE_CONFIRMED_AT_MISSING",
]));

expect('TikTok online Purchase is verified-payment only', includesAll(sender, [
  "source: 'online_paid'",
  '!isCompletedPaymentStatus(order.paymentStatus)',
  '!order.paymentPaidAt',
  'order.payments[0]',
  "VERIFIED_PAYMENT_MISSING",
  "VERIFIED_PAYMENT_AMOUNT_MISMATCH",
]));

expect('TikTok Purchase respects test/internal/consent traffic filter', includesAll(sender, [
  'classifyStoredOrderTraffic(order, { skipBot: true })',
  'if (!traffic.allowed)',
]));

expect('TikTok failures use shared retention log with provider TIKTOK', includesAll(sender, [
  "provider: 'TIKTOK'",
  'getTrackingFailureLogRetentionMetadata',
  'hasTtclid',
  'hasTtp',
]));

expect('Queue has additive TikTok job types and enqueue function', includesAll(queue, [
  'TikTokPurchaseJobData',
  "'tiktok_cod_purchase' | 'tiktok_online_paid_purchase'",
  'enqueueTikTokPurchase',
]) && includesAll(queue, [
  'MetaCapiPurchaseJobData',
  'Ga4PurchaseJobData',
  'Ga4RefundJobData',
]));

expect('Worker routes TikTok jobs without renaming Meta CAPI worker', includesAll(worker, [
  'sendCodPurchaseToTikTok',
  'sendOnlinePaidPurchaseToTikTok',
  "job.data.type === 'tiktok_cod_purchase'",
  "job.data.type === 'tiktok_online_paid_purchase'",
  'META_CAPI_PURCHASE_QUEUE_NAME',
]));

expect('COD admin phone confirm queues TikTok after existing Meta/GA4 queues', includesAll(adminOrders, [
  'enqueueMetaCapiPurchase',
  'enqueueGa4Purchase',
  'enqueueTikTokPurchase',
  'type: "tiktok_cod_purchase"',
  'Admin COD TikTok Purchase queue enqueue failed',
]));

expect('Telegram phone confirm queues TikTok after existing Meta/GA4 queues', includesAll(telegram, [
  'enqueueMetaCapiPurchase',
  'enqueueGa4Purchase',
  'enqueueTikTokPurchase',
  "type: 'tiktok_cod_purchase'",
  'COD TikTok Purchase queue enqueue failed',
]));

expect('Verified online payment queues TikTok online paid Purchase and returns queue diagnostics', includesAll(verifiedPayment, [
  "type: 'tiktok_online_paid_purchase'",
  'tiktokPurchaseQueued',
  'tiktokPurchaseJobId',
  'tiktokPurchaseQueueError',
  'PAYMENT_RECORDED_TIKTOK_PURCHASE_QUEUE_FAILED',
]));

expect('Manual tracking retry can queue TikTok purchase safely', includesAll(trackingHealth, [
  'tiktokPurchaseSent: true',
  "type: 'tiktok_cod_purchase'",
  "type: 'tiktok_online_paid_purchase'",
  'manual_retry:tiktok_cod_purchase',
]));

expect('Critical failure retention recognizes TikTok auth/env failures', includesAll(failureRetention, [
  "TIKTOK_ENV_MISSING",
  "provider === 'TIKTOK'",
]));

expect('Env examples document server-only TikTok Events API variables', includesAll(envExample, [
  'TIKTOK_EVENTS_API_ENABLED=false',
  'TIKTOK_PIXEL_ID=',
  'TIKTOK_ACCESS_TOKEN=',
  'TIKTOK_EVENTS_API_URL=https://business-api.tiktok.com/open_api/v1.3/event/track/',
  'TIKTOK_PURCHASE_LIVE_VERIFIED=false',
]));

expect('Production env docs document TikTok Events API safety gates', includesAll(envProd, [
  'TIKTOK_EVENTS_API_ENABLED',
  'TIKTOK_ACCESS_TOKEN',
  'TIKTOK_PURCHASE_LIVE_VERIFIED',
  'TIKTOK_TEST_EVENT_CODE',
]));

expect('Client-side TikTok Purchase remains blocked', includesAll(manager, [
  "if (event === 'Purchase')",
  'mb_tiktok_purchase_blocked',
  'return;',
]));

expect('Package exposes Phase 31D audit script', packageJson.scripts?.['qa:phase31d-tiktok-events-api'] === 'node scripts/phase31d-tiktok-events-api-purchase-audit.mjs');

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = { ok: failed === 0, passed, failed, issueCount: issues.length, issues };

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
