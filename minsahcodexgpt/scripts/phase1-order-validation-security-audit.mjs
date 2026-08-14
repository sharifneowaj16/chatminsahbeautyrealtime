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

const orderRoute = read('app/api/orders/route.ts');
const orderValidation = exists('lib/order-validation.ts') ? read('lib/order-validation.ts') : '';
const phone = exists('lib/phone.ts') ? read('lib/phone.ts') : '';
const couponValidation = exists('lib/coupon-validation.ts') ? read('lib/coupon-validation.ts') : '';
const checkout = read('app/checkout/page.tsx');
const cart = read('app/(storefront)/cart/page.tsx');

check('phone helper exists', exists('lib/phone.ts'));
check('BD phone regex requires 01[3-9] + 8 digits', phone.includes('^01[3-9]\\d{8}$'));
check('order validation helper exists', exists('lib/order-validation.ts'));
check('quantity requires positive integer', orderValidation.includes('Number.isInteger(quantity)') && orderValidation.includes('quantity <= 0'));
check('line-item max quantity enforced', orderValidation.includes('MAX_LINE_ITEM_QUANTITY'));
check('duplicate product+variant line items are merged', orderValidation.includes('new Map<string, NormalizedOrderItemInput>') && orderValidation.includes('nextQuantity'));
check('street address is required', orderValidation.includes('STREET_ADDRESS_REQUIRED'));
check('address area and streetAddress are separate fields', orderValidation.includes('area: string') && orderValidation.includes('streetAddress: string'));
check('order route uses normalized request validation', orderRoute.includes('validateAndNormalizeOrderRequest(body)'));
check('payment allowlist remains enforced in route', orderRoute.includes('UNSUPPORTED_PAYMENT_METHOD') && orderRoute.includes('isCanonicalOnlinePaymentMethod') && orderRoute.includes('isCodPaymentMethod'));
check('variant/product ownership enforced', orderRoute.includes('variant.productId !== item.productId') && orderRoute.includes('VARIANT_PRODUCT_MISMATCH'));
check('client couponDiscount is not subtracted', !orderRoute.includes('parseFloat(String(couponDiscount') && !orderRoute.includes('couponDiscount ?? 0'));
check('server coupon validator exists', exists('lib/coupon-validation.ts'));
check('server coupon validation checks active/expiry/min/limits', ['isActive', 'startDate', 'endDate', 'minPurchase', 'usageLimit', 'perUserLimit'].every((token) => couponValidation.includes(token)));
check('server coupon discount drives saved order discount', orderRoute.includes('couponValidation.discountAmount') && orderRoute.includes('couponCode: couponValidation.code'));
check('coupon usage is incremented transactionally', orderRoute.includes('tx.coupon.updateMany') && orderRoute.includes('usageCount: { increment: 1 }'));
check('saved address phone is validated server-side', orderRoute.includes('INVALID_SAVED_ADDRESS_PHONE') && orderRoute.includes('normalizeBangladeshPhoneNumber(savedAccountingAddress.phone)'));
check('checkout page sends streetAddress separately', checkout.includes('streetAddress: shippingForm.streetAddress.trim()'));
check('cart page either redirects to checkout or sends streetAddress separately', cart.includes("redirect('/checkout')") || cart.includes('streetAddress: shippingForm.streetAddress.trim()'));

for (const item of checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nPhase 1 order validation security audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nPhase 1 order validation security audit: ${checks.length}/${checks.length} checks passed.`);
