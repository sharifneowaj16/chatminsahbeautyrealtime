#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (name, passed) => checks.push({ name, passed });
const hasAll = (text, parts) => parts.every((part) => text.includes(part));

const clicks = read('app/api/search/clicks/route.ts');
const clickHelper = read('lib/search/click-tracking.ts');
const conversionHelper = read('lib/search/conversion-attribution.ts');
const verifiedPayment = read('app/api/payments/verified/route.ts');
const adminOrder = read('app/api/admin/orders/[id]/route.ts');
const telegram = read('app/api/telegram/order-callback/route.ts');
const pkg = JSON.parse(read('package.json'));

check('click helper exists', exists('lib/search/click-tracking.ts'));
check('conversion attribution helper exists', exists('lib/search/conversion-attribution.ts'));
check('public click POST uses sanitized payload', clicks.includes('sanitizeClickPayload') && hasAll(clickHelper, ['Missing required fields', 'Invalid click position']));
check('public click POST builds hashed identity cookies', hasAll(clicks, ['buildTrackingIdentity', 'attachTrackingCookies']));
check('public click POST enforces rate limits', hasAll(clicks, ['enforceClickRateLimits', 'Retry-After']));
check('public click POST validates active product', hasAll(clicks, ['findActiveClickableProduct', 'Invalid or inactive productId']));
check('public click POST dedupes repeated clicks', hasAll(clicks, ['isDuplicateClick', 'deduped: true', 'Duplicate click ignored']));
check('public click POST records only validated clicks', hasAll(clicks, ['recordValidatedSearchClick', 'deduped: false']));
check('public conversion PUT disabled', hasAll(clicks, ['export async function PUT()', 'SEARCH_CONVERSION_CLIENT_UPDATE_DISABLED']) && !clicks.includes('revenue: { increment: revenue'));
check('helper stores hashed device/session identifiers', hasAll(clickHelper, ['deviceIdHash', 'sessionIdHash', 'crypto.createHash', 'httpOnly: true']));
check('helper validates positive position/resultCount', hasAll(clickHelper, ['position < 1', 'resultCount < 1', 'position > resultCount']));
check('helper uses Redis-backed rate limiting', hasAll(clickHelper, ['checkRateLimit', 'search-click:ip:', 'search-click:device:', 'search-click:session:']));
check('helper validates active non-deleted product', hasAll(clickHelper, ['ACTIVE_PRODUCT_PRISMA_WHERE', 'findActiveClickableProduct']));
check('helper dedupes within window', hasAll(clickHelper, ['CLICK_DEDUPE_WINDOW_MS', 'searchClickEvent.findFirst', 'clickedAt: { gte: since }']));
check('metrics avgPosition is weighted on real clicks', hasAll(clickHelper, ['nextAvgPosition', 'existingMetric.avgPosition', 'existingMetric.clicks']));
check('conversion helper updates metrics from order click attribution', hasAll(conversionHelper, ['attributeVerifiedSearchConversionsForOrder', 'searchClickEvent.findFirst', 'searchClickMetrics.updateMany', 'revenue: { increment: toNumber(item.total) }']));
check('verified online payment attributes search conversion', hasAll(verifiedPayment, ['attributeVerifiedSearchConversionsForOrder', "source: 'online_paid_payment_verified'", 'shouldAttributeSearchConversion']));
check('admin COD phone confirmation attributes search conversion', hasAll(adminOrder, ['attributeVerifiedSearchConversionsForOrder', 'cod_phone_confirmed_admin']));
check('Telegram COD phone confirmation attributes search conversion', hasAll(telegram, ['attributeVerifiedSearchConversionsForOrder', 'cod_phone_confirmed_telegram']));
check('package script exposes qa:search-click-integrity', pkg.scripts?.['qa:search-click-integrity'] === 'node scripts/search-click-integrity-audit.mjs');

let failed = 0;
for (const item of checks) {
  if (item.passed) {
    console.log(`PASS: ${item.name}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${item.name}`);
  }
}

if (failed) {
  console.error(`\nSearch click integrity audit failed: ${failed}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nSearch click integrity audit passed: ${checks.length}/${checks.length} checks passed.`);
