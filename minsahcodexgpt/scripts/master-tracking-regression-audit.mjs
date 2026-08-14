#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const checks = [];
const issues = [];
const childAudits = [];

function file(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(file(relativePath));
}

function read(relativePath) {
  const absolutePath = file(relativePath);
  if (!fs.existsSync(absolutePath)) {
    issues.push(`Missing required file: ${relativePath}`);
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

function runAudit(relativePath) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [file(relativePath)], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 12,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  const audit = {
    script: relativePath,
    ok: result.status === 0,
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
    outputTail: output.slice(-1600),
  };
  childAudits.push(audit);
  expect(`${relativePath} passes`, audit.ok, audit.ok ? '' : audit.outputTail);
}

function noRawBrowserPurchaseTrackingIn(filePath) {
  const content = read(filePath);
  const strippedComments = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  return !/gtag\s*\(\s*['"]event['"]\s*,\s*['"]purchase['"]/i.test(strippedComments);
}

const packageJson = JSON.parse(read('package.json') || '{}');

// ─── Master command surface ────────────────────────────────────────────────
expect('package.json exposes qa:master-tracking', packageJson.scripts?.['qa:master-tracking'] === 'node scripts/master-tracking-regression-audit.mjs');
expect('package.json exposes qa:phase17', packageJson.scripts?.['qa:phase17'] === 'node scripts/master-tracking-regression-audit.mjs');
expect('qa:predeploy includes qa:phase17 master tracking regression', packageJson.scripts?.['qa:predeploy']?.includes('qa:phase17'));

// ─── Phase 11 deploy gate automation remains wired ─────────────────────────
expect('Phase 11 deploy gate script exists', exists('scripts/tracking-deploy-gate.mjs'));
expect('tracking env audit script exists', exists('scripts/tracking-env-audit.mjs'));
expect('tracking runtime health check script exists', exists('scripts/tracking-runtime-health-check.mjs'));
expect('tracking deploy gate docs exist', exists('docs/production/tracking-deploy-gate.md'));
expect('package.json exposes qa:tracking-deploy-gate', packageJson.scripts?.['qa:tracking-deploy-gate'] === 'node scripts/tracking-deploy-gate.mjs --production');

// ─── Purchase security contract ────────────────────────────────────────────
const publicCapi = read('app/api/facebook-capi/route.ts');
expect('Public CAPI endpoint blocks Purchase', includesAll(publicCapi, [
  "payload.eventName === 'Purchase'",
  'PURCHASE_NOT_ALLOWED_ON_PUBLIC_CAPI',
  'PUBLIC_CAPI_ALLOWED_EVENTS',
]) && !/PUBLIC_CAPI_ALLOWED_EVENTS[\s\S]{0,260}['"]Purchase['"]/.test(publicCapi));
expect('Public CAPI endpoint still applies server traffic filter', includesAll(publicCapi, [
  'shouldSkipServerTrackingRequest(request)',
  'skipped: true',
]));
expect('Public CAPI payload is schema-versioned', includesAll(publicCapi, [
  'withMetaSchemaVersion',
  'withMetaSafePayloadSchema',
]));

const metaPurchase = read('lib/tracking/meta-capi-cod-purchase.ts');
expect('COD Purchase requires phoneConfirmedAt before Meta CAPI send', includesAll(metaPurchase, [
  'phoneConfirmedAt missing for COD Purchase',
  'getEventTimeFromPhoneConfirmedAt(order.phoneConfirmedAt)',
  "source: 'cod_phone_confirmed'",
]));
const metaEventIdentity = read('lib/meta/capi/event-id.ts');
expect('Meta Purchase uses Purchase-{orderId} event id and duplicate claim fields', includesAll(metaPurchase, [
  'buildMetaPurchaseEventId(orderId)',
  'metaPurchaseSent: false',
  'metaPurchaseProcessingAt',
  'metaPurchaseSent: true',
]) && includesAll(metaEventIdentity, [
  'return `Purchase-${normalized}`',
  'META_EVENT_ID_MAX_LENGTH',
]));
expect('Meta online Purchase requires verified payment row and amount/currency match', includesAll(metaPurchase, [
  "source: 'online_paid'",
  'signatureVerified: true',
  'amountMatched: true',
  'currencyMatched: true',
  'Verified completed payment row missing for online Purchase',
  'Verified payment amount does not match order total for online Purchase',
]));
expect('Meta Purchase skips test/internal stored orders', includesAll(metaPurchase, [
  'classifyStoredOrderTraffic(order)',
  '!traffic.allowed',
]));
expect('Meta Purchase custom_data contains schema version and enriched attribution', includesAll(metaPurchase, [
  'withMetaSchemaVersion',
  'TRACKING_SCHEMA_VERSION',
  'buildPurchaseAttributionCustomData',
  'utm_term: order.utmTerm',
  'offer_version: order.offerVersion',
  'ab_variant: order.abVariant',
  'attribution_coupon_code: order.attributionCouponCode',
]));
expect('Meta Purchase failure logging is retention classified and safe-payload based', includesAll(metaPurchase, [
  'getTrackingFailureLogRetentionMetadata',
  'failureCategory: retention.failureCategory',
  'cleanupAfter: retention.cleanupAfter',
  'safePayload',
]));

const onlineBrowserPurchase = read('app/api/tracking/meta/online-purchase/route.ts');
expect('Browser online Purchase route requires signed token and verified paid order', includesAll(onlineBrowserPurchase, [
  'verifyOnlineBrowserPurchaseToken',
  'ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE',
  'signatureVerified: true',
  'amountMatched: true',
  'currencyMatched: true',
  'PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH',
]));
expect('Browser online Purchase route is atomically claimed and test/internal filtered', includesAll(onlineBrowserPurchase, [
  'classifyStoredOrderTraffic(order)',
  'metaBrowserPurchaseClaimedAt: null',
  'BROWSER_PURCHASE_ALREADY_CLAIMED',
]));
expect('Browser online Purchase uses catalog product IDs and Purchase-{order.id}', includesAll(onlineBrowserPurchase, [
  'buildMetaCatalogData',
  '`Purchase-${order.id}`',
]));

// ─── GA4 server-side purchase only ─────────────────────────────────────────
const ga4 = read('lib/tracking/ga4-measurement-protocol.ts');
expect('GA4 Purchase is Measurement Protocol server-side only with duplicate claim', includesAll(ga4, [
  "name: 'purchase'",
  'transaction_id: order.id',
  'gaPurchaseSent: false',
  'gaPurchaseProcessingAt',
  'gaPurchaseSent: true',
]));
expect('GA4 Purchase enforces COD phone-confirmed and online verified payment contracts', includesAll(ga4, [
  'phoneConfirmedAt missing for COD GA4 Purchase',
  'Verified Payment row missing for online GA4 Purchase',
  'Verified Payment amount does not match order total for GA4 Purchase',
]));
expect('GA4 Purchase skips test/internal stored orders', includesAll(ga4, [
  'classifyStoredOrderTraffic(order)',
  '!traffic.allowed',
]));
expect('GA4 Purchase carries enriched attribution params', includesAll(ga4, [
  'buildGa4AttributionParams',
  'utm_term: order.utmTerm',
  'offer_version: order.offerVersion',
  'ab_variant: order.abVariant',
  'attribution_coupon_code: order.attributionCouponCode',
]));
expect('Browser GA4 guard blocks direct purchase events', includesAll(read('lib/tracking/pixels/ga4PurchaseGuardScript.ts'), [
  "eventName === 'purchase'",
  'mb_ga4_purchase_blocked',
]) && includesAll(read('lib/tracking/pixels/GoogleAnalytics.tsx'), [
  "String(arguments[1] || '').toLowerCase() === 'purchase'",
  'mb_ga4_purchase_blocked',
]));
for (const browserFile of [
  'app/checkout/payment-complete/page.tsx',
  'lib/tracking/manager.ts',
  'lib/tracking/pixels/GoogleAnalytics.tsx',
]) {
  expect(`${browserFile} has no raw browser GA4 purchase fire`, noRawBrowserPurchaseTrackingIn(browserFile));
}

// ─── Product catalog ID contract ───────────────────────────────────────────
const metaContentId = read('lib/tracking/meta-content-id.ts');
expect('Meta content_ids and contents use catalog product id, not slug', includesAll(metaContentId, [
  'buildMetaCatalogData',
  'resolveMetaCatalogIdentity',
  'productId',
  'productSku',
  'variantId',
  'variantSku',
]) && !metaContentId.includes('slug'));
const productUrlAudit = read('scripts/product-url-tracking-regression-audit.mjs');
expect('Product URL tracking audit protects slug navigation without replacing tracking IDs', includesAll(productUrlAudit, [
  'Product URL helper uses slug-first fallback',
  'product.id',
  'content_ids',
]));

// ─── Phase 13 attribution enrichment ───────────────────────────────────────
const attributionCapture = read('lib/tracking/pixels/AttributionCookieCapture.tsx');
expect('Browser attribution captures rich UTM/ad/offer params and avoids payment-return overwrite', includesAll(attributionCapture, [
  "'utm_term'",
  "'offer_version'",
  "'ab_variant'",
  "'coupon_code'",
  "'free_delivery_threshold'",
  "'landing_offer'",
  "'campaign_source_url'",
  'isPaymentReturnPath(window.location.pathname)',
]));
const orderAttribution = read('lib/tracking/order-attribution.ts');
expect('Server attribution saves enriched fields and keeps URL coupon separate from applied coupon', includesAll(orderAttribution, [
  'utmTerm: nonEssentialTrackingAllowed',
  'cleanAttributionValue(attribution.utm_term)',
  'offerVersion: nonEssentialTrackingAllowed',
  'cleanAttributionValue(attribution.offer_version)',
  'abVariant: nonEssentialTrackingAllowed',
  'cleanAttributionValue(attribution.ab_variant)',
  'attributionCouponCode: nonEssentialTrackingAllowed',
  'cleanAttributionValue(attribution.coupon_code, 100)',
  'parsePositiveAmount(attribution.free_delivery_threshold)',
  'cleanAttributionValue(attribution.landing_offer)',
  'campaignSourceUrl',
]) && !orderAttribution.includes('couponCode: cleanAttributionValue(attribution.coupon_code'));

// ─── Phase 14 test/internal exclusion ──────────────────────────────────────
const trafficFilter = read('lib/tracking/traffic-filter.ts');
expect('Central traffic filter supports test emails/phones/internal domains/IPs', includesAll(trafficFilter, [
  'TRACKING_TEST_EMAILS',
  'TRACKING_TEST_PHONES',
  'TRACKING_INTERNAL_IPS',
  'TRACKING_INTERNAL_DOMAINS',
  'normalizeTrackingPhone',
  'classifyStoredOrderTraffic',
  'classifyOrderTrackingExclusion',
  'shouldSkipServerTrackingRequest',
]));
for (const orderRoute of ['app/api/orders/route.ts', 'app/api/buy-now/orders/route.ts', 'app/api/admin/orders/route.ts']) {
  const content = read(orderRoute);
  expect(`${orderRoute} marks test/internal orders without breaking normal customers`, includesAll(content, [
    'buildOrderTrackingExclusionData',
    'orderTrackingExclusion.isTest',
    'trackingFilteredReason',
  ]));
}

// ─── Phase 15 lifecycle analytics ──────────────────────────────────────────
const productMetrics = read('lib/analytics/product-metrics.ts');
expect('Lifecycle metrics helper is idempotent and status-transition based', includesAll(productMetrics, [
  'recordProductLifecycleTransitionInTransaction',
  'previousOrder',
  'nextOrder',
  'confirmedOrders',
  'deliveredOrders',
  'cancelledOrders',
  'returnedOrders',
  'refundedOrders',
  'recalculateProductDailyMetricRatios',
]));
for (const lifecycleFile of [
  'app/api/admin/orders/[id]/route.ts',
  'app/api/telegram/order-callback/route.ts',
  'app/api/payments/verified/route.ts',
  'app/api/webhooks/pathao/route.ts',
  'app/api/webhook/steadfast/route.ts',
  'app/api/admin/orders/returns/route.ts',
  'lib/workers/steadfastWorker.ts',
  'app/api/admin/shipping/steadfast/sync/route.ts',
]) {
  expect(`${lifecycleFile} records product lifecycle transitions in transaction`, includesAll(read(lifecycleFile), [
    'recordProductLifecycleTransitionInTransaction',
    '$transaction',
  ]));
}
expect('Product analytics API exposes lifecycle/profit/refund metrics', includesAll(read('app/api/admin/analytics/products/route.ts'), [
  'confirmedOrders',
  'deliveredOrders',
  'returnedOrders',
  'refundedOrders',
  'estimatedGrossProfit',
  'refundRate',
]));

// ─── Phase 16 retention/dead-letter ops ────────────────────────────────────
expect('Tracking failure retention helper and cleanup cron exist', exists('lib/tracking/failure-retention.ts') && exists('app/api/cron/tracking-cleanup/route.ts') && exists('scripts/tracking-cleanup-cron.ts'));
expect('Retention helper classifies critical/final/debug failures and supports dry-run cleanup', includesAll(read('lib/tracking/failure-retention.ts'), [
  "'DEBUG_NON_CRITICAL'",
  "'FINAL_RETRYABLE'",
  "'CRITICAL'",
  'runTrackingFailureCleanup',
  'dryRun',
  'deleteMany',
]));
expect('Admin tracking-health exposes safe retry and retention cleanup controls', includesAll(read('app/api/admin/tracking-health/route.ts'), [
  "action === 'cleanup_failures'",
  'order.isTest',
  'Test/internal orders are not retried',
  '!order.metaPurchaseSent',
  '!order.gaPurchaseSent',
]) && includesAll(read('app/admin/tracking-health/page.tsx'), [
  'Failure retention policy',
  'Dry-run Cleanup',
  'Safe payload summary',
]));

// ─── Schema/migration coverage ─────────────────────────────────────────────
const schema = read('prisma/schema.prisma');
expect('Prisma schema contains Phase 13-16 tracking fields and indexes', includesAll(schema, [
  'utmTerm',
  'offerVersion',
  'abVariant',
  'attributionCouponCode',
  'freeDeliveryThreshold',
  'campaignSourceUrl',
  'confirmedOrders',
  'deliveredOrders',
  'returnedOrders',
  'refundedOrders',
  'failureCategory',
  'cleanupAfter',
]));
for (const migration of [
  'prisma/migrations/20260705010000_phase13_attribution_enrichment/migration.sql',
  'prisma/migrations/20260705030000_phase15_product_lifecycle_metrics/migration.sql',
  'prisma/migrations/20260705040000_phase16_tracking_failure_retention/migration.sql',
]) {
  expect(`${migration} exists`, exists(migration));
}

// ─── Docs and evidence for the QA automation layer ─────────────────────────
expect('Master tracking QA docs exist', exists('docs/production/master-tracking-qa.md'));
expect('Phase 17 implementation report exists', exists('PHASE17_TRACKING_QA_AUTOMATION.md'));
const masterDocs = read('docs/production/master-tracking-qa.md');
expect('Master tracking QA docs list commands and protected contracts', includesAll(masterDocs, [
  'npm run qa:master-tracking',
  'npm run qa:product-url-tracking',
  'npm run qa:phase8-static',
  'npm run qa:phase11',
  'Public CAPI endpoint blocks Purchase',
  'COD Purchase',
  'Online Purchase',
  'schema_version',
  'test/internal',
  'retention cron',
  'lifecycle metric hooks',
]));

// ─── Execute dedicated static/regression audits ────────────────────────────
const auditsToRun = [
  'scripts/tracking-phase12-capi-schema-audit.mjs',
  'scripts/tracking-attribution-audit.mjs',
  'scripts/tracking-test-exclusion-audit.mjs',
  'scripts/tracking-lifecycle-audit.mjs',
  'scripts/tracking-retention-audit.mjs',
  'scripts/product-url-tracking-regression-audit.mjs',
  'scripts/phase8-static-contract-check.mjs',
  'scripts/tracking-phase11-deploy-gate-audit.mjs',
  'scripts/phase7-tiktok-tracking-safety-audit.mjs',
];
for (const auditPath of auditsToRun) {
  expect(`${auditPath} exists`, exists(auditPath));
  if (exists(auditPath)) runAudit(auditPath);
}

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = {
  ok: failed === 0,
  passed,
  failed,
  issueCount: issues.length,
  childAudits: childAudits.map(({ script, ok, exitCode, durationMs }) => ({ script, ok, exitCode, durationMs })),
  issues,
};

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
