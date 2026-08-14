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

const checkout = read('app/checkout/page.tsx');
const orderRoute = read('app/api/orders/route.ts');
const bkashPage = read('app/checkout/payment/bkash/page.tsx');
const nagadPage = read('app/checkout/payment/nagad/page.tsx');
const bkashCreate = read('app/api/payments/bkash/create/route.ts');
const nagadCreate = read('app/api/payments/nagad/create/route.ts');
const paymentSummaryPath = 'app/api/orders/[id]/payment-summary/route.ts';
const paymentSummary = exists(paymentSummaryPath) ? read(paymentSummaryPath) : '';
const paymentSummaryHelper = exists('lib/payments/payment-summary.ts') ? read('lib/payments/payment-summary.ts') : '';
const paymentSummaryContract = paymentSummary + paymentSummaryHelper;

check('checkout still creates order before online payment navigation', /fetch\([\"']\/api\/orders/.test(checkout) && checkout.includes('data.paymentStep?.redirectURL'));
check('checkout online payment copy states order-first flow', checkout.includes('Order will be created first') && checkout.includes('valid order is created'));
check('order API returns paymentStep after order creation', orderRoute.includes('const paymentStep') && orderRoute.includes('paymentStep,') && orderRoute.includes('redirectURL: `/checkout/payment/${normalizedPaymentMethod}'));
check('order API response exposes server numeric total', (orderRoute.includes('decimalToNumber(order.total)') || orderRoute.includes('parseFloat(order.total.toString())')) && orderRoute.includes('total: orderTotal'));
check('payment summary endpoint exists', exists(paymentSummaryPath));
check('payment summary endpoint is owner-bound', paymentSummary.includes('getAuthenticatedUserId(request)') && paymentSummaryContract.includes('where: { id: params.orderId, userId: params.userId }'));
check('payment summary endpoint enforces gateway/paymentMethod match', paymentSummaryContract.includes('paymentMethod !== params.gateway') && paymentSummaryContract.includes('isCanonicalOnlinePaymentMethod'));
check('payment summary endpoint returns server order amount', paymentSummaryContract.includes('amount,') && paymentSummaryContract.includes('decimalToNumber(order.total)'));
check('bKash page loads server order summary before payment', bkashPage.includes('/payment-summary?gateway=bkash') && bkashPage.includes('setSummary(data as PaymentSummary)'));
check('Nagad page loads server order summary before payment', nagadPage.includes('/payment-summary?gateway=nagad') && nagadPage.includes('setSummary(data as PaymentSummary)'));
check('bKash page no longer uses cart total as payment amount', !bkashPage.includes('useCart') && !bkashPage.includes('convertUSDtoBDT(total)'));
check('Nagad page no longer uses cart total as payment amount', !nagadPage.includes('useCart') && !nagadPage.includes('convertUSDtoBDT(total)'));
check('bKash page blocks missing orderId before create call', bkashPage.includes('Missing order reference') && bkashPage.includes('!orderId || !summary'));
check('Nagad page blocks missing orderId before create call', nagadPage.includes('Missing order reference') && nagadPage.includes('!orderId || !summary'));
check('payment create routes still use owner/security guard', bkashCreate.includes('authorizePaymentCreate') && nagadCreate.includes('authorizePaymentCreate'));
check('payment create routes calculate amount from order.total', bkashCreate.includes('decimalToNumber(order.total)') && nagadCreate.includes('decimalToNumber(order.total)'));

for (const item of checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nPhase 4 payment order-first gateway audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nPhase 4 payment order-first gateway audit: ${checks.length}/${checks.length} checks passed.`);
