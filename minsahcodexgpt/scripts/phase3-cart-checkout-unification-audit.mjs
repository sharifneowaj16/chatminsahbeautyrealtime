import fs from 'node:fs';

const checks = [];
function check(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
}
function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const cart = read('app/(storefront)/cart/page.tsx');
const checkout = read('app/checkout/page.tsx');
const paymentMethod = read('app/checkout/payment-method/page.tsx');

const checkoutOrderPostCount = (checkout.match(/fetch\(['\"]\/api\/orders/g) || []).length;
const cartOrderPostCount = (cart.match(/fetch\(['\"]\/api\/orders/g) || []).length;

check('/cart redirects to canonical /checkout route', cart.includes("redirect('/checkout')") && !cart.includes("'use client'"));
check('/cart no longer posts to /api/orders', cartOrderPostCount === 0);
check('/checkout remains the only page route that posts to /api/orders', checkoutOrderPostCount === 1);
check('/checkout renders cart items and quantity controls inline', checkout.includes('Cart Items') && checkout.includes('handleQuantityChange') && checkout.includes('removeItem(item.id)'));
check('/checkout payment methods are inline, not route navigation', checkout.includes('paymentMethods.map') && checkout.includes('setSelectedPaymentMethod(method)') && !checkout.includes('href="/checkout/payment-method"'));
check('/checkout payment copy enforces order-first gateway flow', checkout.includes('Order will be created first') && checkout.includes('payment pages open only after a valid order is created'));
check('/checkout/payment-method redirects back to canonical checkout', paymentMethod.includes("redirect('/checkout')"));
check('/checkout/payment-method no longer links directly to gateway pages', !paymentMethod.includes('/checkout/payment/bkash') && !paymentMethod.includes('/checkout/payment/nagad'));
check('single-page bottom action requires selected payment method', checkout.includes('!selectedPaymentMethod'));
check('checkout header no longer links back to duplicate /cart route', !checkout.includes('href="/cart"'));

for (const item of checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nPhase 3 cart/checkout unification audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nPhase 3 cart/checkout unification audit: ${checks.length}/${checks.length} checks passed.`);
