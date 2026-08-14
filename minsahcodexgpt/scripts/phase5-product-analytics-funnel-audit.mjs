#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}
function includes(file, fragment) {
  return read(file).includes(fragment);
}

const route = 'app/api/product-analytics/route.ts';
const metrics = 'lib/analytics/product-metrics.ts';
const ecommerce = 'lib/tracking/ecommerce.ts';
const schema = 'prisma/schema.prisma';
const migration = 'prisma/migrations/20260709000000_phase5_product_analytics_funnel_actions/migration.sql';
const adminRoute = 'app/api/admin/analytics/products/route.ts';
const adminPage = 'app/admin/analytics/page.tsx';
const docs = 'docs/production/phase-5-product-analytics-counters.md';

for (const action of ['view_cart', 'checkout_shipping_info', 'checkout_payment_info']) {
  check(`${route} accepts ${action}`, includes(route, `'${action}'`));
  check(`${ecommerce} emits ${action}`, includes(ecommerce, `action: '${action}'`));
  check(`${docs} documents ${action}`, includes(docs, action));
}

check(
  'product-analytics route uses a shared action allowlist instead of hard-coded three-action guard',
  includes(route, 'PRODUCT_ANALYTICS_ACTIONS')
    && includes(route, 'PRODUCT_ANALYTICS_ACTIONS.includes')
    && includes(route, 'recordProductMetricAction(action, items)')
);

check(
  'product metric action type covers full funnel',
  includes(metrics, "'view_cart'")
    && includes(metrics, "'checkout_shipping_info'")
    && includes(metrics, "'checkout_payment_info'")
);

check(
  'view_cart increments dedicated product and daily counters',
  includes(metrics, "action === 'view_cart'")
    && includes(metrics, 'viewCartCount: quantity')
    && includes(metrics, 'viewCarts')
);

check(
  'checkout_shipping_info increments dedicated product and daily counters',
  includes(metrics, "action === 'checkout_shipping_info'")
    && includes(metrics, 'checkoutShippingInfoCount: quantity')
    && includes(metrics, 'checkoutShippingInfos')
);

check(
  'checkout_payment_info increments dedicated product and daily counters',
  includes(metrics, "action === 'checkout_payment_info'")
    && includes(metrics, 'checkoutPaymentInfoCount: quantity')
    && includes(metrics, 'checkoutPaymentInfos')
);

for (const field of [
  'viewCartCount',
  'checkoutShippingInfoCount',
  'checkoutPaymentInfoCount',
  'viewCarts',
  'checkoutShippingInfos',
  'checkoutPaymentInfos',
]) {
  check(`Prisma schema includes ${field}`, includes(schema, field));
  check(`Migration includes ${field}`, includes(migration, field));
}

check(
  'admin product analytics API exposes full funnel fields and rates',
  includes(adminRoute, 'viewCarts: bucket.viewCarts')
    && includes(adminRoute, 'checkoutShippingInfos: bucket.checkoutShippingInfos')
    && includes(adminRoute, 'checkoutPaymentInfos: bucket.checkoutPaymentInfos')
    && includes(adminRoute, 'viewCartRate: safePercent(bucket.viewCarts, bucket.addToCarts)')
    && includes(adminRoute, 'paymentInfoRate: safePercent(bucket.checkoutPaymentInfos, bucket.checkoutShippingInfos)')
);

check(
  'admin analytics page renders the newly captured funnel values',
  includes(adminPage, 'product.viewCarts')
    && includes(adminPage, 'product.checkoutShippingInfos')
    && includes(adminPage, 'product.checkoutPaymentInfos')
    && includes(adminPage, 'product.paymentInfoRate')
);

check(
  'package.json exposes Phase 5 product analytics funnel audit',
  includes('package.json', 'qa:phase5-product-analytics-funnel')
    && includes('package.json', 'scripts/phase5-product-analytics-funnel-audit.mjs')
);

const failed = checks.filter((item) => !item.ok);
const result = {
  ok: failed.length === 0,
  passed: checks.length - failed.length,
  failed: failed.length,
  issues: failed.map((item) => item.name),
};

console.log(JSON.stringify(result, null, 2));

if (failed.length) {
  process.exit(1);
}
