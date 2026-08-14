#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}
function has(file, token) {
  return read(file).includes(token);
}
function all(file, tokens) {
  const content = read(file);
  return tokens.every((token) => content.includes(token));
}

const manager = 'lib/tracking/manager.ts';
const route = 'app/api/facebook-capi/route.ts';
const types = 'types/facebook.ts';
const ecommerce = 'lib/tracking/ecommerce.ts';
const docs = 'docs/production/phase-6-meta-capi-mid-funnel.md';
const trackingDocs = 'tracking.md';

for (const eventName of ['ViewCart', 'AddShippingInfo', 'AddPaymentInfo']) {
  check(`manager public CAPI allowlist includes ${eventName}`, has(manager, `'${eventName}'`));
  check(`server public CAPI allowlist includes ${eventName}`, has(route, `'${eventName}'`));
  check(`Facebook payload type includes ${eventName}`, has(types, `| '${eventName}'`));
  check(`phase 6 docs include ${eventName}`, has(docs, `\`${eventName}\``));
  check(`tracking.md documents ${eventName}`, has(trackingDocs, `\`${eventName}\``));
}

check(
  'browser Pixel and CAPI use the same eventID for deduplication',
  all(manager, [
    "window.fbq('track', fbEvent, data as Record<string, any>, { eventID: eventId })",
    'this.sendToFacebookCAPI(fbEvent, eventId, data)',
    'eventId,',
  ])
);

check(
  'public CAPI endpoint still blocks Purchase before allowlist processing',
  all(route, [
    "payload.eventName === 'Purchase'",
    'PURCHASE_NOT_ALLOWED_ON_PUBLIC_CAPI',
    'PUBLIC_CAPI_ALLOWED_EVENTS',
  ]) && !/PUBLIC_CAPI_ALLOWED_EVENTS[\s\S]{0,420}['"]Purchase['"]/.test(read(route))
);

check(
  'mid-funnel CAPI preserves checkout context fields',
  all(manager, [
    'shippingTier: data?.shipping_tier || data?.shippingTier',
    'checkoutStep: data?.checkout_step || data?.checkoutStep',
    'method: data?.method || data?.payment_type || data?.paymentType',
  ]) && all(route, [
    'shipping_tier: payload.shippingTier',
    'checkout_step: payload.checkoutStep',
    'method: payload.method',
  ])
);

check(
  'ecommerce helpers still emit all three mid-funnel events with value/content data',
  all(ecommerce, [
    "trackSafely('ViewCart'",
    "trackSafely('AddShippingInfo'",
    "trackSafely('AddPaymentInfo'",
    'buildCartTrackingData(items, value)',
    "checkout_step: 'cart_review'",
    "checkout_step: 'shipping_info'",
    "checkout_step: 'payment_info'",
  ])
);

check(
  'package.json exposes Phase 6 audit command',
  has('package.json', 'qa:phase6-meta-capi-mid-funnel')
    && has('package.json', 'scripts/phase6-meta-capi-mid-funnel-audit.mjs')
);

const failed = checks.filter((item) => !item.ok);
const result = {
  ok: failed.length === 0,
  passed: checks.length - failed.length,
  failed: failed.length,
  issues: failed.map((item) => item.name),
};

console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
