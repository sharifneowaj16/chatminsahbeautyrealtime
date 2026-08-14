#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const issues = [];
let passed = 0;

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function check(file, description, predicate) {
  const content = exists(file) ? read(file) : '';
  let ok = false;
  try {
    ok = Boolean(predicate(content));
  } catch {
    ok = false;
  }
  if (ok) passed += 1;
  else issues.push({ file, description });
}

function includesAll(content, values) {
  return values.every((value) => content.includes(value));
}

check('prisma/schema.prisma', 'ProductDailyMetric has persistent Phase 15 lifecycle revenue/refund fields', (content) =>
  includesAll(content, [
    'confirmedRevenue',
    'cancelledRevenue',
    'returnedRevenue',
    'refundedOrders',
    'refundedRevenue',
    'estimatedProfit',
    'confirmationRate',
    'deliveryRate',
    'returnRate',
  ])
);

check('prisma/schema.prisma', 'Product lifetime lifecycle counters include refundedOrderCount', (content) =>
  includesAll(content, ['confirmedOrderCount', 'deliveredOrderCount', 'cancelledOrderCount', 'returnedOrderCount', 'refundedOrderCount'])
);

check('prisma/migrations/20260705030000_phase15_product_lifecycle_metrics/migration.sql', 'Phase 15 Prisma migration adds lifecycle columns idempotently', (content) =>
  includesAll(content, [
    'ADD COLUMN IF NOT EXISTS "refundedOrderCount"',
    'ADD COLUMN IF NOT EXISTS "confirmedRevenue"',
    'ADD COLUMN IF NOT EXISTS "refundedOrders"',
    'CREATE INDEX IF NOT EXISTS "Product_refundedOrderCount_idx"',
  ])
);

check('lib/analytics/product-metrics.ts', 'Lifecycle transition helper exists and compares previous/next order signals', (content) =>
  includesAll(content, [
    'recordProductLifecycleTransitionInTransaction',
    'getLifecycleTransitions',
    '!isConfirmedOrder(previous) && isConfirmedOrder(next)',
    '!isDeliveredOrder(previous) && isDeliveredOrder(next)',
    '!isCancelledOrder(previous) && isCancelledOrder(next)',
    '!isReturnedLifecycleOrder(previousOrder) && isReturnedLifecycleOrder(nextOrder)',
    '!isRefundedLifecycleOrder(previousOrder) && isRefundedLifecycleOrder(nextOrder)',
  ])
);

check('lib/analytics/product-metrics.ts', 'Lifecycle helper skips test orders and updates product/productDailyMetric atomically', (content) =>
  includesAll(content, [
    'nextOrder.isTest',
    "reason: 'TEST_ORDER'",
    'tx.product.update',
    'tx.productDailyMetric.upsert',
    'recalculateProductDailyMetricRatios',
  ])
);

check('lib/analytics/product-metrics.ts', 'Lifecycle helper persists all Phase 15 statuses and revenue/profit fields', (content) =>
  includesAll(content, [
    'confirmedOrders',
    'confirmedRevenue',
    'deliveredOrders',
    'deliveredRevenue',
    'cancelledOrders',
    'cancelledRevenue',
    'returnedOrders',
    'returnedRevenue',
    'refundedOrders',
    'refundedRevenue',
    'estimatedProfit',
  ])
);

check('lib/analytics/product-metrics.ts', 'Order-created metrics can skip test/internal orders', (content) =>
  includesAll(content, [
    'options: { skip?: boolean; reason?: string } = {}',
    'if (options.skip) return;',
  ])
);

for (const file of [
  'app/api/admin/orders/[id]/route.ts',
  'app/api/telegram/order-callback/route.ts',
  'app/api/payments/verified/route.ts',
  'app/api/webhooks/pathao/route.ts',
  'app/api/webhook/steadfast/route.ts',
  'app/api/admin/orders/returns/route.ts',
  'lib/workers/steadfastWorker.ts',
  'app/api/admin/shipping/steadfast/sync/route.ts',
]) {
  check(file, `${file} records lifecycle transitions after status/payment/courier changes`, (content) =>
    content.includes('recordProductLifecycleTransitionInTransaction') && content.includes('$transaction')
  );
}

for (const file of [
  'app/api/orders/route.ts',
  'app/api/buy-now/orders/route.ts',
  'app/api/admin/orders/route.ts',
]) {
  check(file, `${file} records order-created metrics and skips test/internal orders`, (content) =>
    content.includes('recordProductOrderCreatedInTransaction') &&
    content.includes('orderTrackingExclusion.isTest') &&
    content.includes('trackingFilteredReason')
  );
}

check('app/api/admin/orders/returns/route.ts', 'Completed return requests mark returnedAt/refundedAt for lifecycle metrics', (content) =>
  includesAll(content, [
    "normalizedStatus === 'COMPLETED'",
    'returnedAt: returnRequest.order.returnedAt ?? new Date()',
    'refundedAt: returnRequest.order.refundedAt ?? new Date()',
  ])
);

check('lib/analytics/business.ts', 'Business analytics exposes refund signal helper', (content) =>
  includesAll(content, ['export function isRefundedOrder', "order.status === 'REFUNDED'", "order.paymentStatus === 'REFUNDED'"])
);

check('app/api/admin/analytics/products/route.ts', 'Product analytics API exposes refund metrics and rates', (content) =>
  includesAll(content, ['isRefundedOrder', 'refundedOrders', 'refundedRevenue', 'refundRate', 'estimatedGrossProfit'])
);

check('package.json', 'package scripts include Phase 15 QA and predeploy gate', (content) =>
  includesAll(content, ['qa:tracking-lifecycle', 'qa:phase15', 'npm run qa:phase15'])
);

check('PHASE15_PRODUCT_LIFECYCLE_ANALYTICS.md', 'Phase 15 implementation report exists', (content) =>
  includesAll(content, ['Phase 15', 'Product Lifecycle Analytics', 'Duplicate status', 'QA'])
);

const result = {
  ok: issues.length === 0,
  passed,
  failed: issues.length,
  issueCount: issues.length,
  issues,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
