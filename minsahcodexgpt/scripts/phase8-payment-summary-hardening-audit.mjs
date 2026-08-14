import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    failures.push(`Missing required file: ${relative}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function check(name, condition) {
  if (!condition) failures.push(name);
}

const helper = read('lib/payments/payment-summary.ts');
const route = read('app/api/orders/[id]/payment-summary/route.ts');
const guard = read('lib/payments/payment-create-security.ts');
const bkashPage = read('app/checkout/payment/bkash/page.tsx');
const nagadPage = read('app/checkout/payment/nagad/page.tsx');
const pkg = JSON.parse(read('package.json') || '{}');

check('payment summary helper exists', helper.includes('getOwnerBoundPaymentSummary'));
check('payment summary is owner-bound by userId', helper.includes('where: { id: params.orderId, userId: params.userId }'));
check('summary requires canonical online gateway match', helper.includes('isCanonicalOnlinePaymentMethod') && helper.includes('paymentMethod !== params.gateway'));
check('summary includes customer phone from shipping address', helper.includes('customerPhone') && helper.includes('shippingAddress'));
check('summary requires PENDING_PAYMENT order state', helper.includes("orderStatus !== 'PENDING_PAYMENT'"));
check('summary blocks terminal payment states including failed', helper.includes("'FAILED'") && helper.includes('TERMINAL_PAYMENT_STATUSES'));
check('summary blocks active processing attempts', helper.includes('PAYMENT_ALREADY_PROCESSING') && helper.includes('latestPaymentStatus'));
check('summary checks payment expiry', helper.includes('paymentWindowExpired') && helper.includes('paymentExpiresAt'));
check('summary returns disabledReason and canInitiatePayment', helper.includes('disabledReason') && helper.includes('canInitiatePayment'));

check('payment summary route uses authenticated user', route.includes('getAuthenticatedUserId') && route.includes('AUTH_REQUIRED'));
check('payment summary route uses helper', route.includes('getOwnerBoundPaymentSummary'));
check('payment summary route normalizes gateway', route.includes('normalizePaymentSummaryGateway'));
check('payment summary route sends no-store cache header', route.includes('Cache-Control') && route.includes('no-store'));

check('payment create guard also requires pending payment order', guard.includes('ORDER_NOT_PENDING_PAYMENT'));
check('payment create guard also requires pending payment status', guard.includes('PAYMENT_NOT_PENDING'));
check('payment create guard treats FAILED as terminal', guard.includes("'FAILED'"));

for (const [label, page, gateway] of [
  ['bKash', bkashPage, 'bkash'],
  ['Nagad', nagadPage, 'nagad'],
]) {
  check(`${label} page fetches server summary`, page.includes(`/payment-summary?gateway=${gateway}`));
  check(`${label} page displays order and payment status`, page.includes('summary.orderStatus') && page.includes('summary.paymentStatus'));
  check(`${label} page displays payment expiry`, page.includes('paymentExpiresAtLabel'));
  check(`${label} page uses customer phone from summary`, page.includes('data.customerPhone') && page.includes('normalizeBdMobileNumber'));
  check(`${label} page validates BD mobile regex`, page.includes('isValidBdMobileNumber') && page.includes('^01[3-9]'));
  check(`${label} pay button disabled by server canInitiatePayment`, page.includes('summary?.canInitiatePayment') && page.includes('!canSubmit'));
  check(`${label} page does not use cart context amount`, !page.includes('useCart') && page.includes('Amount is loaded from the server order'));
}

check('package has phase8 payment summary audit script', pkg.scripts?.['qa:phase8-payment-summary'] === 'node scripts/phase8-payment-summary-hardening-audit.mjs');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failed: failures.length, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: 29, message: 'Phase 8 payment summary hardening audit passed' }, null, 2));
