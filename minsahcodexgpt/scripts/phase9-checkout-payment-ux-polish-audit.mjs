import fs from 'node:fs';

const checks = [];
function check(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
}
function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const checkout = read('app/checkout/page.tsx');
const bkash = read('app/checkout/payment/bkash/page.tsx');
const nagad = read('app/checkout/payment/nagad/page.tsx');
const pkg = JSON.parse(read('package.json'));

check('checkout removes blocking alert UX', !checkout.includes('alert('));
check('checkout has inline checkout error state', checkout.includes('checkoutError') && checkout.includes('setCheckoutError'));
check('checkout has structured field errors', checkout.includes('type CheckoutFieldErrors') && checkout.includes('fieldErrors'));
check('checkout validates BD phone client-side', checkout.includes('isValidBdMobileNumber') && checkout.includes('^01[3-9]'));
check('checkout normalizes phone input', checkout.includes('normalizeBdMobileNumber(event.target.value)'));
check('checkout shows Banglish phone validation copy', checkout.includes('Phone number ta 11 digit-er valid BD number din.'));
check('checkout shows Street address validation copy', checkout.includes('Street address ta din.'));
check('checkout shows City/Zone/Area field-level validation', checkout.includes('City select korun.') && checkout.includes('Zone select korun.') && checkout.includes('Area select korun.'));
check('checkout keeps approved address fields', checkout.includes('placeholder="Full name"') && checkout.includes('placeholder="Phone number"') && checkout.includes('placeholder="Street address"'));
check('checkout uses aria-invalid for accessible inline errors', checkout.includes('aria-invalid={Boolean(fieldErrors.fullName)}') && checkout.includes('aria-invalid={Boolean(fieldErrors.phoneNumber)}'));
check('checkout exposes disabled CTA reason', checkout.includes('checkoutBlockReason') && checkout.includes('Complete checkout details'));
check('checkout has delivery calculating loading copy', checkout.includes('Delivery charge calculate hocche.'));
check('checkout has online payment preparation loading copy', checkout.includes('Preparing ${selectedPaymentMethod?.name'));
check('checkout maps server errors to friendly copy', checkout.includes('getFriendlyCheckoutError') && checkout.includes('IDEMPOTENCY_PAYLOAD_MISMATCH') && checkout.includes('PATHAO_HOME_DELIVERY_UNAVAILABLE'));
check('checkout keeps idempotency retry guard', checkout.includes('Idempotency-Key') && checkout.includes('checkoutIdempotencyKeyRef'));

for (const [label, page, gateway] of [
  ['bKash', bkash, 'bkash'],
  ['Nagad', nagad, 'nagad'],
]) {
  check(`${label} payment page has friendly error mapper`, page.includes('getFriendlyPaymentError'));
  check(`${label} payment page has inline phone validation`, page.includes('phoneValidationMessage') && page.includes(`valid BD ${label} number din`));
  check(`${label} payment page exposes disabled reason`, page.includes('paymentBlockReason') && page.includes('Order details load hocche'));
  check(`${label} payment page uses aria-invalid for phone`, page.includes(`aria-describedby={phoneValidationMessage ? '${gateway}-phone-error' : undefined}`));
  check(`${label} payment page has redirecting loading state`, page.includes(`Redirecting to ${label}...`));
  check(`${label} payment page uses server summary`, page.includes('/payment-summary?gateway=') && page.includes('Amount is loaded from the server order'));
}

check('package exposes phase9 UX audit script', pkg.scripts?.['qa:phase9-checkout-ux'] === 'node scripts/phase9-checkout-payment-ux-polish-audit.mjs');

for (const item of checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nPhase 9 checkout/payment UX polish audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nPhase 9 checkout/payment UX polish audit: ${checks.length}/${checks.length} checks passed.`);
