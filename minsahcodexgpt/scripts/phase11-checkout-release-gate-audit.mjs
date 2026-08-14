#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const checks = [];
function file(rel) {
  return path.join(root, rel);
}
function exists(rel) {
  return fs.existsSync(file(rel));
}
function read(rel) {
  return fs.readFileSync(file(rel), 'utf8');
}
function pass(name) {
  checks.push({ name, ok: true });
  console.log(`✅ ${name}`);
}
function fail(name, details = '') {
  checks.push({ name, ok: false, details });
  console.error(`❌ ${name}${details ? ` — ${details}` : ''}`);
}
function expect(name, condition, details = '') {
  if (condition) pass(name);
  else fail(name, details);
}
function includes(rel, needle) {
  return exists(rel) && read(rel).includes(needle);
}
function runScript(rel) {
  const result = spawnSync(process.execPath, [file(rel)], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8,
  });
  if (result.status === 0) {
    pass(`${rel} passes`);
    return;
  }
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  fail(`${rel} passes`, output.slice(-1600));
}

console.log('\nPhase 11 checkout release gate audit\n');

const requiredPhaseScripts = [
  'scripts/phase1-order-validation-security-audit.mjs',
  'scripts/phase3-cart-checkout-unification-audit.mjs',
  'scripts/phase4-payment-order-first-gateway-audit.mjs',
  'scripts/phase5-delivery-address-pathao-availability-audit.mjs',
  'scripts/phase6-checkout-idempotency-audit.mjs',
  'scripts/phase7-online-payment-lifecycle-audit.mjs',
  'scripts/phase8-payment-summary-hardening-audit.mjs',
  'scripts/phase9-checkout-payment-ux-polish-audit.mjs',
  'scripts/phase10-checkout-tracking-alignment-audit.mjs',
  'scripts/security-audit.mjs',
  'scripts/phase4-delivery-regression-audit.mjs',
  'scripts/shop-production-readiness-audit.mjs',
];

for (const rel of requiredPhaseScripts) {
  expect(`${rel} exists`, exists(rel));
  if (exists(rel)) runScript(rel);
}

const packageJson = JSON.parse(read('package.json'));
expect('package exposes phase11 checkout release gate audit', packageJson.scripts?.['qa:phase11-checkout-release-gate'] === 'node scripts/phase11-checkout-release-gate-audit.mjs');
expect('package exposes checkout release gate alias', packageJson.scripts?.['qa:checkout-release-gate']?.includes('qa:phase11-checkout-release-gate'));
expect('package exposes all checkout phase audits in release gate alias', [
  'qa:phase3-cart-checkout',
  'qa:phase4-payment',
  'qa:phase5-delivery-address',
  'qa:phase6-idempotency',
  'qa:phase7-payment-lifecycle',
  'qa:phase8-payment-summary',
  'qa:phase9-checkout-ux',
  'qa:phase10-checkout-tracking',
].every((scriptName) => packageJson.scripts?.['qa:checkout-release-gate']?.includes(scriptName)));

expect('Phase 11 delivery report exists', exists('PHASE11_CHECKOUT_RELEASE_GATE_QA.md'));
expect('Manual QA checklist exists', exists('docs/qa/CHECKOUT_RELEASE_GATE_MANUAL_CHECKLIST.md'));
expect('Release evidence pack exists', exists('docs/release/CHECKOUT_RELEASE_GATE_EVIDENCE_PACK.md'));
expect('Production checkout deploy runbook exists', exists('docs/production/CHECKOUT_RELEASE_DEPLOY_RUNBOOK.md'));

const checkout = read('app/checkout/page.tsx');
const cart = read('app/(storefront)/cart/page.tsx');
const orderRoute = read('app/api/orders/route.ts');
const bkashCreate = read('app/api/payments/bkash/create/route.ts');
const nagadCreate = read('app/api/payments/nagad/create/route.ts');
const paymentSummary = read('lib/payments/payment-summary.ts');
const paymentCreateSecurity = read('lib/payments/payment-create-security.ts');
const verifiedPayment = read('app/api/payments/verified/route.ts');

expect('/cart route remains redirect-only', /redirect\(["']\/checkout["']\)/.test(cart) && !cart.includes('/api/orders'));
expect('/checkout remains the only storefront page creating orders', /fetch\([\"']\/api\/orders[\"']/.test(checkout));
expect('checkout page has approved address fields only', ['Full name', 'Phone', 'City', 'Zone', 'Area', 'Street address'].every((label) => checkout.includes(label)) && !checkout.includes('House / Road / Flat / Building / Landmark'));
expect('checkout sends idempotency key on order submit', checkout.includes('Idempotency-Key') && checkout.includes('checkoutIdempotencyKeyRef'));
expect('checkout sends separate city/zone/area/street address data', ['city:', 'zone:', 'area:', 'streetAddress:'].every((token) => checkout.includes(token)));
expect('checkout blocks unavailable Pathao areas before submit', checkout.includes('selectedAreaHomeDeliveryAvailable') && checkout.includes('PATHAO_HOME_DELIVERY_UNAVAILABLE'));
expect('checkout creates order before online payment navigation', checkout.search(/fetch\([\"']\/api\/orders[\"']/) >= 0 && checkout.search(/fetch\([\"']\/api\/orders[\"']/) < checkout.indexOf('router.push(nextURL)'));
expect('checkout tracking is single-page action based', ['trackViewCart', 'trackInitiateCheckout', 'trackAddShippingInfo', 'trackAddPaymentInfo'].every((token) => checkout.includes(token)));
expect('checkout does not client-fire purchase', !checkout.includes('trackPurchase') && !checkout.includes('TrackingEventType.Purchase'));

expect('order route requires auth before create', orderRoute.includes('getAuthenticatedUserId') && orderRoute.includes('AUTH_REQUIRED'));
expect('order route requires checkout idempotency before create', orderRoute.includes('readCheckoutIdempotencyKey') && orderRoute.includes('hashCheckoutIdempotencyPayload'));
expect('order route validates normalized request server-side', orderRoute.includes('validateAndNormalizeOrderRequest'));
expect('order route ignores client couponDiscount', !/couponDiscount\s*[-+*/]/.test(orderRoute) && orderRoute.includes('validateCouponForOrder'));
expect('order route verifies Pathao home delivery area server-side', orderRoute.includes('verifyPathaoHomeDeliveryArea'));
expect('order route reserves online stock instead of finalizing immediately', orderRoute.includes('reserveOnlineOrderStockInTransaction') && orderRoute.includes('PENDING_PAYMENT'));
expect('order route finalizes COD stock immediately', orderRoute.includes('decrementCodOrderStockInTransaction') && orderRoute.includes('isCodPaymentMethod'));
expect('order route returns paymentStep for online gateways', orderRoute.includes('paymentStep') && orderRoute.includes('/checkout/payment/${normalizedPaymentMethod}') && orderRoute.includes('encodeURIComponent(order.id)'));
expect('order route handles idempotency replay without duplicate side effects', orderRoute.includes('IDEMPOTENCY_PAYLOAD_MISMATCH') && orderRoute.includes('idempotentReplay: true') && orderRoute.includes('checkoutPayloadHash'));

expect('bKash create route uses shared owner/security guard', bkashCreate.includes('authorizePaymentCreate'));
expect('Nagad create route uses shared owner/security guard', nagadCreate.includes('authorizePaymentCreate'));
expect('payment create security is owner-bound', paymentCreateSecurity.includes('where: { id: params.orderId, userId }') && paymentCreateSecurity.includes('ORDER_NOT_FOUND_OR_NOT_OWNER'));
expect('payment create security blocks expired windows and processing duplicates', paymentCreateSecurity.includes('PAYMENT_WINDOW_EXPIRED') && paymentCreateSecurity.includes('PAYMENT_ALREADY_PROCESSING'));
expect('payment create security rate limits attempts', paymentCreateSecurity.includes('PAYMENT_CREATE_RATE_LIMITED') && paymentCreateSecurity.includes('checkRateLimit'));

expect('payment summary helper enforces owner-bound lookup', paymentSummary.includes('where: { id: params.orderId, userId: params.userId }'));
expect('payment summary helper disables invalid terminal states', ['PAYMENT_WINDOW_EXPIRED', 'ORDER_ALREADY_PAID', 'ORDER_NOT_PENDING_PAYMENT', 'PAYMENT_ALREADY_PROCESSING'].every((token) => paymentSummary.includes(token)));
expect('payment summary API route exists', exists('app/api/orders/[id]/payment-summary/route.ts'));
expect('bKash payment page reads server summary', includes('app/checkout/payment/bkash/page.tsx', 'payment-summary?gateway=bkash'));
expect('Nagad payment page reads server summary', includes('app/checkout/payment/nagad/page.tsx', 'payment-summary?gateway=nagad'));
expect('payment pages do not use cart totals', !includes('app/checkout/payment/bkash/page.tsx', 'useCart') && !includes('app/checkout/payment/nagad/page.tsx', 'useCart'));

expect('verified payment finalizes online stock', verifiedPayment.includes('finalizeOnlineOrderStockInTransaction'));
expect('verified payment releases reservation on failed terminal states', verifiedPayment.includes('releaseOnlineOrderReservationInTransaction'));
expect('expired unpaid cron route exists', exists('app/api/cron/release-unpaid-orders/route.ts'));
expect('stock lifecycle migration exists', exists('prisma/migrations/20260708010000_phase7_online_payment_lifecycle_stock_reservation/migration.sql'));
expect('idempotency migration exists', exists('prisma/migrations/20260708000000_add_checkout_order_idempotency/migration.sql'));

const manualChecklist = read('docs/qa/CHECKOUT_RELEASE_GATE_MANUAL_CHECKLIST.md');
const checklistTerms = [
  'COD order',
  'bKash order',
  'Nagad order',
  'double-click',
  'fake coupon',
  'variant mismatch',
  'unauthorized payment',
  'Pathao unavailable area',
  'expired payment',
  'view_cart',
  'begin_checkout',
  'add_shipping_info',
  'add_payment_info',
  'purchase',
  'Rollback',
];
expect('manual checklist covers release-critical scenarios', checklistTerms.every((term) => manualChecklist.toLowerCase().includes(term.toLowerCase())));

const evidencePack = read('docs/release/CHECKOUT_RELEASE_GATE_EVIDENCE_PACK.md');
expect('evidence pack records automated gate command', evidencePack.includes('npm run qa:checkout-release-gate'));
expect('evidence pack documents conditional go/no-go rule', evidencePack.includes('NO-GO') && evidencePack.includes('GO'));
expect('evidence pack documents build/typecheck dependency requirement', evidencePack.includes('npm run typecheck') && evidencePack.includes('npm run build'));

const deployRunbook = read('docs/production/CHECKOUT_RELEASE_DEPLOY_RUNBOOK.md');
expect('deploy runbook includes migrate/typecheck/build sequence', ['npm ci', 'npx prisma migrate deploy', 'npm run typecheck', 'npm run build'].every((term) => deployRunbook.includes(term)));
expect('deploy runbook includes post-deploy checkout smoke tests', ['COD', 'bKash', 'Nagad', 'release-unpaid-orders'].every((term) => deployRunbook.includes(term)));
expect('deploy runbook includes rollback plan', deployRunbook.includes('Rollback'));

const ignoredDirs = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage']);
const conflictMarkers = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs);
      continue;
    }
    const rel = path.relative(root, abs);
    if (/\.(png|jpg|jpeg|webp|gif|ico|zip|pdf|woff2?|ttf|eot|lock)$/i.test(rel)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    if (/^(<<<<<<<|=======|>>>>>>>)\s?.*$/m.test(content)) conflictMarkers.push(rel);
  }
}
walk(root);
expect('No git conflict markers in text/code files', conflictMarkers.length === 0, conflictMarkers.join(', '));

const passed = checks.filter((item) => item.ok).length;
const failed = checks.length - passed;
console.log(`\nPhase 11 checkout release gate audit: ${passed}/${checks.length} checks passed.`);
if (failed) process.exit(1);
