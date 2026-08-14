import fs from 'node:fs';

const checks = [];
function check(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
}
function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function exists(path) {
  return fs.existsSync(path);
}

const schema = read('prisma/schema.prisma');
const migrationPath = 'prisma/migrations/20260708010000_phase7_online_payment_lifecycle_stock_reservation/migration.sql';
const migration = exists(migrationPath) ? read(migrationPath) : '';
const orderRoute = read('app/api/orders/route.ts');
const verifiedRoute = read('app/api/payments/verified/route.ts');
const paymentGuard = read('lib/payments/payment-create-security.ts');
const paymentSummary = read('app/api/orders/[id]/payment-summary/route.ts');
const paymentSummaryHelper = exists('lib/payments/payment-summary.ts') ? read('lib/payments/payment-summary.ts') : '';
const buyNowRoute = read('app/api/buy-now/orders/route.ts');
const stockHelper = exists('lib/online-payment-stock.ts') ? read('lib/online-payment-stock.ts') : '';
const cronRoute = exists('app/api/cron/release-unpaid-orders/route.ts')
  ? read('app/api/cron/release-unpaid-orders/route.ts')
  : '';
const pkg = JSON.parse(read('package.json'));

check('OrderStatus supports PENDING_PAYMENT', schema.includes('PENDING_PAYMENT'));
check('OrderStatus supports PAYMENT_EXPIRED', schema.includes('PAYMENT_EXPIRED'));
check('Product stores reservedQuantity', schema.includes('reservedQuantity  Int     @default(0)'));
check('ProductVariant stores reservedQuantity', schema.includes('reservedQuantity Int @default(0)'));
check('Order stores paymentExpiresAt', schema.includes('paymentExpiresAt DateTime?'));
check('Order stores stock lifecycle timestamps', schema.includes('stockReservedAt') && schema.includes('stockFinalizedAt') && schema.includes('stockReleasedAt'));
check('Order stores adminNotifiedAt for paid online notification dedup', schema.includes('adminNotifiedAt  DateTime?'));
check('migration adds order status enum values', migration.includes("ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT'") && migration.includes("ADD VALUE IF NOT EXISTS 'PAYMENT_EXPIRED'"));
check('migration adds reservedQuantity columns', migration.includes('"reservedQuantity" INTEGER NOT NULL DEFAULT 0'));
check('migration adds payment lifecycle columns', migration.includes('"paymentExpiresAt"') && migration.includes('"stockFinalizedAt"'));

check('stock helper defines 15-minute reservation window', stockHelper.includes('ONLINE_PAYMENT_RESERVATION_MINUTES = 15'));
check('stock helper computes available stock from reservedQuantity', stockHelper.includes('availableProductStock') && stockHelper.includes('reservedQuantity'));
check('stock helper reserves online stock transactionally', stockHelper.includes('reserveOnlineOrderStockInTransaction') && stockHelper.includes('reservedQuantity: { increment: item.quantity }'));
check('stock helper finalizes online stock after payment', stockHelper.includes('finalizeOnlineOrderStockInTransaction') && stockHelper.includes('quantity: { decrement: item.quantity }'));
check('stock helper releases unpaid reservations', stockHelper.includes('releaseOnlineOrderReservationInTransaction') && stockHelper.includes('reservedQuantity: { decrement: item.quantity }'));

check('order API creates online orders as PENDING_PAYMENT', orderRoute.includes('status: isOnlinePaymentOrder ? "PENDING_PAYMENT" : "CONFIRMED"'));
check('order API sets payment expiry for online orders', orderRoute.includes('getOnlinePaymentExpiresAt') && orderRoute.includes('paymentExpiresAt: onlinePaymentExpiresAt'));
check('order API reserves online stock instead of decrementing', orderRoute.includes('reserveOnlineOrderStockInTransaction') && orderRoute.includes('bKash/Nagad orders reserve stock briefly'));
check('order API still finalizes COD stock immediately', orderRoute.includes('decrementCodOrderStockInTransaction'));
check('order API skips immediate Telegram notification for online orders', orderRoute.includes('if (!isOnlinePaymentOrder)') && orderRoute.includes('notify admin only after verified payment'));
check('order API stock check subtracts reserved quantity', orderRoute.includes('availableVariantStock(variant)') && orderRoute.includes('availableProductStock(product)'));
check('buy-now API also creates online orders as PENDING_PAYMENT', buyNowRoute.includes("status: isOnlinePaymentOrder ? 'PENDING_PAYMENT' : 'CONFIRMED'"));
check('buy-now API also reserves online stock', buyNowRoute.includes('reserveOnlineOrderStockInTransaction') && buyNowRoute.includes('ONLINE_PAYMENT_PENDING'));
check('buy-now API stock check subtracts reserved quantity', buyNowRoute.includes('availableVariantStock(variant)') && buyNowRoute.includes('availableProductStock(product)'));

check('payment create guard blocks expired payment windows', paymentGuard.includes('PAYMENT_WINDOW_EXPIRED') && paymentGuard.includes('paymentExpiresAt'));
check('payment summary reports expired window and disables payment', (paymentSummary + paymentSummaryHelper).includes('paymentWindowExpired') && (paymentSummary + paymentSummaryHelper).includes('canInitiatePayment'));
check('verified payment finalizes reserved stock', verifiedRoute.includes('finalizeOnlineOrderStockInTransaction') && verifiedRoute.includes("status: 'CONFIRMED'"));
check('verified payment releases reservation on failure/late payment', verifiedRoute.includes('releaseOnlineOrderReservationInTransaction') && verifiedRoute.includes("status: 'PAYMENT_EXPIRED'"));
check('verified payment sends admin Telegram only after paid transition', verifiedRoute.includes('shouldNotifyAdminAfterPayment') && verifiedRoute.includes('notifyNewOrder') && verifiedRoute.includes('adminNotifiedAt'));

check('cron route exists for unpaid order release', cronRoute.includes('releaseExpiredOnlinePayments') && cronRoute.includes('PENDING_PAYMENT'));
check('cron route protects endpoint with optional secret', cronRoute.includes('CRON_SECRET') && cronRoute.includes('CRON_UNAUTHORIZED'));
check('cron route marks expired online orders PAYMENT_EXPIRED', cronRoute.includes("status: 'PAYMENT_EXPIRED'") && cronRoute.includes("paymentStatus: 'CANCELLED'"));
check('package exposes phase7 payment lifecycle audit script', pkg.scripts?.['qa:phase7-payment-lifecycle'] === 'node scripts/phase7-online-payment-lifecycle-audit.mjs');

for (const item of checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nPhase 7 online payment lifecycle audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nPhase 7 online payment lifecycle audit: ${checks.length}/${checks.length} checks passed.`);
