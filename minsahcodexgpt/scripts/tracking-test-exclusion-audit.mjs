#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const issues = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    issues.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function expect(name, condition, details = '') {
  checks.push({ name, ok: Boolean(condition), details });
  if (!condition) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

const trafficFilter = read('lib/tracking/traffic-filter.ts');
for (const token of [
  "'TRACKING_TEST_EMAILS'",
  "'TRACKING_TEST_PHONES'",
  "'TRACKING_INTERNAL_IPS'",
  "'TRACKING_INTERNAL_DOMAINS'",
  'normalizeTrackingEmail',
  'normalizeTrackingPhone',
  'isConfiguredTrackingTestEmail',
  'isConfiguredTrackingTestPhone',
  'isConfiguredInternalDomain',
  'isInternalTrackingRequest',
  'classifyOrderTrackingExclusion',
  'buildOrderTrackingExclusionData',
]) {
  expect(`traffic-filter contains ${token}`, trafficFilter.includes(token));
}
expect('traffic-filter preserves existing consent/internal/bot request filtering', trafficFilter.includes("'CONSENT_DENIED'") && trafficFilter.includes("'INTERNAL_TRAFFIC'") && trafficFilter.includes("'BOT_TRAFFIC'") && trafficFilter.includes('resolveTrackingDecision'));
expect('traffic-filter marks configured email/phone orders as TEST_ORDER', trafficFilter.includes("return { isTest: true, reason: 'TEST_ORDER' as const }") && trafficFilter.includes("return { allowed: false, reason: 'TEST_ORDER' as const"));
expect('traffic-filter keeps normal customer orders allowed by default', trafficFilter.includes("return { allowed: true, reason: 'ALLOWED' as const"));
expect('traffic-filter normalizes Bangladesh phone formats', trafficFilter.includes("digits.startsWith('8801')") && trafficFilter.includes("digits.startsWith('01')") && trafficFilter.includes("digits.startsWith('1')"));

const ordersRoute = read('app/api/orders/route.ts');
expect('cart checkout imports test/internal exclusion helper', ordersRoute.includes('buildOrderTrackingExclusionData'));
expect('cart checkout loads customer email/phone for exclusion', ordersRoute.includes('customerForTracking') && ordersRoute.includes('select: { email: true, phone: true }'));
expect('cart checkout checks saved/body phone values', ordersRoute.includes('addressData?.phoneNumber') && ordersRoute.includes('addressData?.phone') && ordersRoute.includes('savedAccountingAddress?.phone'));
expect('cart checkout saves exclusion data after attribution spread', ordersRoute.includes('...orderAttribution') && ordersRoute.includes('...orderTrackingExclusion'));

const buyNowRoute = read('app/api/buy-now/orders/route.ts');
expect('buy-now checkout imports exclusion helper', buyNowRoute.includes('buildOrderTrackingExclusionData'));
expect('buy-now checkout loads customer email/phone for exclusion', buyNowRoute.includes('customerForTracking') && buyNowRoute.includes('select: { email: true, phone: true }'));
expect('buy-now checkout checks shipping phone', buyNowRoute.includes('shippingAddress.phone'));
expect('buy-now checkout saves exclusion data after attribution spread', buyNowRoute.includes('...orderAttribution') && buyNowRoute.includes('...orderTrackingExclusion'));

const adminOrdersRoute = read('app/api/admin/orders/route.ts');
expect('admin-created orders can classify configured test contacts', adminOrdersRoute.includes('buildOrderTrackingExclusionData'));
expect('admin-created real customer orders are not auto-test just because admin request is internal', adminOrdersRoute.includes('markInternalRequestAsTest: false'));
expect('admin-created orders save test exclusion data', adminOrdersRoute.includes('...orderTrackingExclusion'));

const metaPurchase = read('lib/tracking/meta-capi-cod-purchase.ts');
expect('Meta Purchase sender uses stored traffic classifier for COD and online', count(metaPurchase, /classifyStoredOrderTraffic\(order\)/g) >= 2);
expect('Meta Purchase sender loads user contacts and shipping phone', count(metaPurchase, /user: true/g) >= 2 && count(metaPurchase, /shippingAddress: \{ select: \{ phone: true \} \}/g) >= 2);
expect('Meta Purchase sender skips before claim/send on filtered traffic', metaPurchase.includes('if (!traffic.allowed)') && metaPurchase.includes('skipped: true, reason: traffic.reason'));

const ga4 = read('lib/tracking/ga4-measurement-protocol.ts');
expect('GA4 Purchase/Refund sender uses stored traffic classifier', count(ga4, /classifyStoredOrderTraffic\(order\)/g) >= 2);
expect('GA4 sender loads user contacts and shipping phone', count(ga4, /user: true/g) >= 2 && count(ga4, /shippingAddress: \{ select: \{ phone: true \} \}/g) >= 2);
expect('GA4 sender skips filtered purchase/refund traffic', ga4.includes('if (!traffic.allowed) return { ok: true, skipped: true, reason: traffic.reason }'));

const browserPurchase = read('app/api/tracking/meta/online-purchase/route.ts');
expect('online browser Purchase route imports stored traffic classifier', browserPurchase.includes('classifyStoredOrderTraffic'));
expect('online browser Purchase route loads user/shipping phone', browserPurchase.includes('user: true') && browserPurchase.includes('shippingAddress: { select: { phone: true } }'));
expect('online browser Purchase route skips test/internal/consent before claim', browserPurchase.includes('const traffic = classifyStoredOrderTraffic(order)') && browserPurchase.includes('track: false, reason: traffic.reason'));

for (const rel of ['app/api/campaign-attribution/route.ts', 'app/api/tracking-device/route.ts']) {
  const text = read(rel);
  expect(`${rel} imports server tracking skip helper`, text.includes('shouldSkipServerTrackingRequest'));
  expect(`${rel} skips internal/test-like tracking writes`, text.includes('skipped: true') && text.includes('reason: skippedTraffic.reason'));
}

const envExample = read('.env.example');
for (const token of ['TRACKING_TEST_EMAILS=', 'TRACKING_TEST_PHONES=', 'TRACKING_INTERNAL_IPS=', 'TRACKING_INTERNAL_DOMAINS=']) {
  expect(`.env.example contains ${token}`, envExample.includes(token));
}

const envAudit = read('scripts/tracking-env-audit.mjs');
expect('deploy env audit warns when test contact exclusion env is missing', envAudit.includes('TRACKING_TEST_CONTACTS_MISSING'));
expect('deploy env audit checks internal traffic lists', envAudit.includes('TRACKING_INTERNAL_TRAFFIC_LISTS_MISSING'));

const docs = read('docs/production/test-internal-traffic-exclusion.md');
for (const token of ['TRACKING_TEST_EMAILS', 'TRACKING_TEST_PHONES', 'TRACKING_INTERNAL_IPS', 'TRACKING_INTERNAL_DOMAINS', 'isTest=true', 'Meta CAPI', 'GA4']) {
  expect(`test/internal exclusion docs contain ${token}`, docs.includes(token));
}

const packageJson = JSON.parse(read('package.json') || '{}');
expect('package.json exposes qa:tracking-test-exclusion script', packageJson.scripts?.['qa:tracking-test-exclusion'] === 'node scripts/tracking-test-exclusion-audit.mjs');
expect('package.json exposes qa:phase14 script', packageJson.scripts?.['qa:phase14'] === 'node scripts/tracking-test-exclusion-audit.mjs');
expect('qa:predeploy includes qa:phase14', packageJson.scripts?.['qa:predeploy']?.includes('qa:phase14'));

const report = read('PHASE14_TEST_INTERNAL_TRAFFIC_EXCLUSION.md');
expect('Phase 14 delivery report exists', report.includes('Phase 14') && report.includes('Test/Internal Traffic Exclusion'));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = { ok: failed === 0, passed, failed, issueCount: issues.length, issues };

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
