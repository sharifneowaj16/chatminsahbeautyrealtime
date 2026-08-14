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

function includesAll(text, tokens) {
  return tokens.every((token) => text.includes(token));
}

const attributionCapture = read('lib/tracking/pixels/AttributionCookieCapture.tsx');
expect('AttributionCookieCapture exists', attributionCapture.length > 0);
for (const token of [
  "'utm_term'",
  "'offer_version'",
  "'ab_variant'",
  "'coupon_code'",
  "'free_delivery_threshold'",
  "'landing_offer'",
  "'campaign_source_url'",
]) {
  expect(`browser attribution capture includes ${token}`, attributionCapture.includes(token));
}
expect('browser attribution stores safe campaign source URL fallback', attributionCapture.includes('attribution.campaign_source_url ?? sanitizeUrl(window.location.href)'));
expect('browser attribution does not overwrite on payment return path', attributionCapture.includes('isPaymentReturnPath(window.location.pathname)') && attributionCapture.includes('if (!paymentReturn)') && attributionCapture.includes('captureAttribution(searchParams)'));
expect('browser attribution removes sensitive URL params', includesAll(attributionCapture, ["'email'", "'phone'", "'access_token'", "'signature'", "'secret'"]));
expect('browser attribution still blocks payment gateway referrer overwrite', attributionCapture.includes('isPaymentGatewayReferralUrl(safeReferrer)'));

const orderAttribution = read('lib/tracking/order-attribution.ts');
for (const token of [
  'utm_term?: string',
  'offer_version?: string',
  'ab_variant?: string',
  'coupon_code?: string',
  'free_delivery_threshold?: string',
  'landing_offer?: string',
  'campaign_source_url?: string',
  'campaignSourceUrl',
]) {
  expect(`server order attribution contains ${token}`, orderAttribution.includes(token));
}
for (const [label, pattern] of [
  ['utmTerm mapping', /utmTerm:\s*[\s\S]{0,120}cleanAttributionValue\(attribution\.utm_term\)/],
  ['offerVersion mapping', /offerVersion:\s*[\s\S]{0,120}cleanAttributionValue\(attribution\.offer_version\)/],
  ['abVariant mapping', /abVariant:\s*[\s\S]{0,120}cleanAttributionValue\(attribution\.ab_variant\)/],
  ['attributionCouponCode mapping', /attributionCouponCode:\s*[\s\S]{0,140}cleanAttributionValue\(attribution\.coupon_code/],
  ['freeDeliveryThreshold mapping', /freeDeliveryThreshold:\s*[\s\S]{0,140}parsePositiveAmount\(attribution\.free_delivery_threshold\)/],
  ['landingOffer mapping', /landingOffer:\s*[\s\S]{0,120}cleanAttributionValue\(attribution\.landing_offer\)/],
]) {
  expect(`server order attribution contains ${label}`, pattern.test(orderAttribution));
}
expect('server order attribution sanitizes campaign source URL', orderAttribution.includes('sanitizeNonGatewayCampaignSourceUrl') && orderAttribution.includes('sanitizeTrackingUrl(value)'));
expect('server order attribution falls back to first landing URL', orderAttribution.includes('?? firstLandingUrl'));
expect('server order attribution keeps payment gateway referrers out', orderAttribution.includes('isPaymentGatewayReferralUrl(sanitized) ? undefined : sanitized'));
expect('server order attribution does not map URL coupon to actual order couponCode', !orderAttribution.includes('couponCode: cleanAttributionValue(attribution.coupon_code'));

const ordersRoute = read('app/api/orders/route.ts');
expect('order creation reads server attribution before transaction', ordersRoute.includes('const orderAttribution = readOrderAttribution(request, { userId });'));
expect('order creation saves attribution through spread on order create', ordersRoute.includes('...orderAttribution'));
expect('actual couponCode is saved from validated checkout coupon, not attribution cookie', includesAll(ordersRoute, [
  'const couponValidation = await validateCouponForOrder({',
  'couponCode,',
  'const discountAmount = couponValidation.discountAmount;',
  'couponCode: couponValidation.code',
  'couponDiscount: discountAmount > 0 ? discountAmount : null',
]) && !/couponCode:\s*(?:orderAttribution\.|.*attributionCouponCode|.*attribution\.coupon_code)/.test(ordersRoute));

const schema = read('prisma/schema.prisma');
for (const token of [
  'utmTerm              String?',
  'offerVersion         String?',
  'abVariant            String?',
  'landingOffer         String?',
  'attributionCouponCode String?',
  'freeDeliveryThreshold Decimal? @db.Decimal(10, 2)',
  'campaignSourceUrl    String?',
  '@@index([utmTerm])',
  '@@index([offerVersion])',
  '@@index([abVariant])',
  '@@index([attributionCouponCode])',
]) {
  expect(`Prisma schema contains ${token}`, schema.includes(token));
}

const migration = read('prisma/migrations/20260705010000_phase13_attribution_enrichment/migration.sql');
for (const token of [
  'ADD COLUMN IF NOT EXISTS "utmTerm" TEXT',
  'ADD COLUMN IF NOT EXISTS "landingOffer" TEXT',
  'ADD COLUMN IF NOT EXISTS "attributionCouponCode" TEXT',
  'ADD COLUMN IF NOT EXISTS "freeDeliveryThreshold" DECIMAL(10, 2)',
  'ADD COLUMN IF NOT EXISTS "campaignSourceUrl" TEXT',
  'CREATE INDEX IF NOT EXISTS "Order_utmTerm_idx"',
  'CREATE INDEX IF NOT EXISTS "Order_offerVersion_idx"',
  'CREATE INDEX IF NOT EXISTS "Order_abVariant_idx"',
  'CREATE INDEX IF NOT EXISTS "Order_attributionCouponCode_idx"',
]) {
  expect(`Phase 13 migration contains ${token}`, migration.includes(token));
}

const metaPurchase = read('lib/tracking/meta-capi-cod-purchase.ts');
for (const token of [
  'buildPurchaseAttributionCustomData',
  'utm_term: order.utmTerm',
  'offer_version: order.offerVersion',
  'ab_variant: order.abVariant',
  'applied_coupon_code: order.couponCode',
  'attribution_coupon_code: order.attributionCouponCode',
  'free_delivery_threshold: freeDeliveryThreshold',
  'landing_offer: order.landingOffer',
  'campaign_source_url: campaignSourceUrl',
  '...buildPurchaseAttributionCustomData(order)',
  'attribution_keys: Object.keys(buildPurchaseAttributionCustomData(order)).sort()',
]) {
  expect(`Meta Purchase CAPI contains ${token}`, metaPurchase.includes(token));
}
expect('Meta Purchase custom data enrichment applied to COD and online payloads', (metaPurchase.match(/\.\.\.buildPurchaseAttributionCustomData\(order\)/g) ?? []).length >= 2);
expect('Meta Purchase still uses schema-versioned custom data', (metaPurchase.match(/custom_data:\s*withMetaSchemaVersion\(/g) ?? []).length >= 2);
const metaEventId = read('lib/meta/capi/event-id.ts');
expect('Meta Purchase still protects Purchase event id contract', metaPurchase.includes('buildMetaPurchaseEventId') && metaEventId.includes('return `Purchase-${normalized}`'));

const ga4 = read('lib/tracking/ga4-measurement-protocol.ts');
for (const token of [
  'buildGa4AttributionParams',
  'utm_term: order.utmTerm',
  'offer_version: order.offerVersion',
  'ab_variant: order.abVariant',
  'attribution_coupon_code: order.attributionCouponCode',
  'free_delivery_threshold: freeDeliveryThreshold',
  'landing_offer: order.landingOffer',
  'campaign_source_url: order.campaignSourceUrl',
  '...buildGa4AttributionParams(order)',
  'attribution_keys: Object.keys(buildGa4AttributionParams(order)).sort()',
]) {
  expect(`GA4 Measurement Protocol contains ${token}`, ga4.includes(token));
}
expect('GA4 purchase still uses server-side Measurement Protocol event', ga4.includes("name: 'purchase'") && ga4.includes('transaction_id: order.id'));

const adminTrackingOrder = read('app/api/admin/tracking/order/[orderId]/route.ts');
for (const token of [
  'utmTerm: true',
  'offerVersion: true',
  'abVariant: true',
  'attributionCouponCode: true',
  'freeDeliveryThreshold: true',
  'landingOffer: true',
  'campaignSourceUrl: true',
  'hasUtmTerm: hasValue(order.utmTerm)',
  'hasOfferVersion: hasValue(order.offerVersion)',
  'hasAbVariant: hasValue(order.abVariant)',
  'hasAttributionCouponCode: hasValue(order.attributionCouponCode)',
  'hasFreeDeliveryThreshold: hasValue(order.freeDeliveryThreshold)',
  'hasLandingOffer: hasValue(order.landingOffer)',
  'hasCampaignSourceUrl: hasValue(order.campaignSourceUrl)',
]) {
  expect(`admin tracking diagnostics exposes safe presence check ${token}`, adminTrackingOrder.includes(token));
}

const packageJson = JSON.parse(read('package.json') || '{}');
expect('package.json exposes qa:tracking-attribution script', packageJson.scripts?.['qa:tracking-attribution'] === 'node scripts/tracking-attribution-audit.mjs');
expect('package.json exposes qa:phase13 script', packageJson.scripts?.['qa:phase13'] === 'node scripts/tracking-attribution-audit.mjs');
expect('qa:predeploy includes qa:phase13', packageJson.scripts?.['qa:predeploy']?.includes('qa:phase13'));

const docs = read('docs/production/attribution-tracking.md');
for (const token of [
  'utm_term',
  'offer_version',
  'ab_variant',
  'coupon_code',
  'free_delivery_threshold',
  'landing_offer',
  'campaign_source_url',
  'attributionCouponCode',
  'payment return',
  'npm run qa:tracking-attribution',
]) {
  expect(`attribution docs contain ${token}`, docs.includes(token));
}

const report = read('PHASE13_ATTRIBUTION_ENRICHMENT.md');
expect('Phase 13 delivery report exists', report.includes('Phase 13') && report.includes('Attribution Enrichment'));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = { ok: failed === 0, passed, failed, issueCount: issues.length, issues };

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
