#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const checks = [];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function add(name, ok, detail = '') {
  checks.push({ name, ok: Boolean(ok), detail });
}

const schema = read('prisma/schema.prisma');
[
  'deliveryOfferEnabled',
  'deliveryOfferType',
  'deliveryOfferAmount',
  'courierDeliveryCharge',
  'deliveryDiscountAmount',
  'deliveryPricingSource',
  'deliveryOfferProductId',
].forEach((field) => add(`schema has ${field}`, schema.includes(field)));

[
  'lib/delivery-pricing.ts',
  'lib/order-delivery-accounting.ts',
  'lib/courier-send-accounting.ts',
  'app/api/shipping/pathao/price/route.ts',
  'app/api/orders/route.ts',
  'app/api/buy-now/orders/route.ts',
  'lib/pathao-delivery.ts',
  'app/api/admin/shipping/pathao/send/route.ts',
  'app/api/admin/shipping/steadfast/send/route.ts',
  'app/api/admin/shipping/steadfast/send-bulk/route.ts',
  'app/api/webhook/steadfast/route.ts',
  'app/api/webhooks/pathao/route.ts',
  'lib/courier-tracking.ts',
  'app/api/track/route.ts',
  'app/api/orders/[id]/tracking/route.ts',
  'app/api/admin/orders/route.ts',
  'app/api/admin/orders/[id]/route.ts',
  'lib/telegram-notify.ts',
].forEach((file) => add(`required delivery file exists: ${file}`, exists(file)));

const ordersApi = read('app/api/orders/route.ts');
add(
  'checkout order create saves customer delivery to shippingCost',
  ordersApi.includes('shippingCost: shippingCostNum') && ordersApi.includes('deliveryAccounting.shippingCost'),
);
[
  'courierDeliveryCharge: deliveryAccounting.courierDeliveryCharge',
  'deliveryDiscountAmount: deliveryAccounting.deliveryDiscountAmount',
  'deliveryPricingSource: deliveryAccounting.deliveryPricingSource',
  'deliveryOfferType: deliveryAccounting.deliveryOfferType',
].forEach((token) => add(`checkout order create saves ${token.split(':')[0]}`, ordersApi.includes(token)));

const buyNowApi = read('app/api/buy-now/orders/route.ts');
add(
  'buy-now order create saves customer delivery to shippingCost',
  buyNowApi.includes('const deliveryCharge = deliveryAccounting.shippingCost') &&
    buyNowApi.includes('shippingCost: deliveryCharge'),
);
[
  'courierDeliveryCharge: deliveryAccounting.courierDeliveryCharge',
  'deliveryDiscountAmount: deliveryAccounting.deliveryDiscountAmount',
  'deliveryPricingSource: deliveryAccounting.deliveryPricingSource',
  'deliveryOfferType: deliveryAccounting.deliveryOfferType',
].forEach((token) => add(`buy-now order create saves ${token.split(':')[0]}`, buyNowApi.includes(token)));

[
  'lib/pathao-delivery.ts',
  'app/api/admin/shipping/steadfast/send/route.ts',
  'app/api/admin/shipping/steadfast/send-bulk/route.ts',
  'app/api/webhook/steadfast/route.ts',
  'app/api/webhooks/pathao/route.ts',
].forEach((file) => {
  const text = read(file);
  add(`${file} does not assign updateData.shippingCost`, !text.includes('updateData.shippingCost'));

  const updateCallPattern = /prisma\.order\.update\s*\(\s*\{([\s\S]{0,1600}?)\}\s*\)/g;
  const suspiciousPositions = [];
  let match;
  while ((match = updateCallPattern.exec(text))) {
    if (/data\s*:\s*\{[\s\S]*?shippingCost\s*:/.test(match[1])) {
      suspiciousPositions.push(match.index);
    }
  }
  add(
    `${file} prisma.order.update data does not write shippingCost`,
    suspiciousPositions.length === 0,
    suspiciousPositions.length ? `positions: ${suspiciousPositions.join(', ')}` : '',
  );
});

const steadfastWebhook = read('app/api/webhook/steadfast/route.ts');
add(
  'Steadfast webhook saves delivery_charge to courierDeliveryCharge',
  steadfastWebhook.includes('updateData.courierDeliveryCharge = webhookCourierCharge'),
);
add(
  'Steadfast webhook discount uses customer shippingCost',
  steadfastWebhook.includes('calculateDeliveryDiscountAmount') && steadfastWebhook.includes('order.shippingCost'),
);

const pathaoWebhook = read('app/api/webhooks/pathao/route.ts');
add(
  'Pathao webhook saves courier actual through courier helper',
  pathaoWebhook.includes('updateData.courierDeliveryCharge = courierAccounting.courierDeliveryCharge'),
);
add(
  'Pathao webhook helper uses order.shippingCost as customer charge',
  pathaoWebhook.includes('customerShippingCost: order.shippingCost'),
);

const publicTrack = read('app/api/track/route.ts');
add('public tracking route does not expose courierDeliveryCharge', !publicTrack.includes('courierDeliveryCharge'));
const accountTrack = read('app/api/orders/[id]/tracking/route.ts');
add('account tracking route does not select courierDeliveryCharge', !accountTrack.includes('courierDeliveryCharge'));
const trackingHelper = read('lib/courier-tracking.ts');
add(
  'tracking helper calculates customerDeliveryCharge from shippingCost',
  trackingHelper.includes('const customerDeliveryCharge = toNumber(order.shippingCost)'),
);

const adminOrders = read('app/api/admin/orders/route.ts');
add(
  'admin order list returns deliveryAccounting object',
  adminOrders.includes('deliveryAccounting: {') &&
    adminOrders.includes('customerDeliveryPaid') &&
    adminOrders.includes('courierActualCharge'),
);
const adminOrderDetail = read('app/api/admin/orders/[id]/route.ts');
add(
  'admin order detail returns deliveryAccounting object',
  adminOrderDetail.includes('deliveryAccounting: {') && adminOrderDetail.includes('courierActualCharge'),
);
const telegram = read('lib/telegram-notify.ts');
add(
  'Telegram notification includes delivery accounting',
  telegram.includes('courierDeliveryCharge') && telegram.includes('Delivery subsidy'),
);

for (const phase of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
  const docExists = fs.readdirSync(root).some((name) => name.startsWith(`PHASE4${phase}_`) && name.endsWith('.md'));
  add(`Phase 4${phase} documentation exists`, docExists);
}

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? '✅' : '❌'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}

console.log(`\nPhase 4 delivery regression audit: ${checks.length - failed.length}/${checks.length} checks passed.`);

if (failed.length) {
  console.error('\nFailed checks:');
  failed.forEach((check) => console.error(`- ${check.name}${check.detail ? ` — ${check.detail}` : ''}`));
  process.exit(1);
}
