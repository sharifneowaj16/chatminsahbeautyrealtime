#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const checks = [];
function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}

const ecommerce = read('lib/tracking/ecommerce.ts');
const manager = read('lib/tracking/manager.ts');
const types = read('types/tracking.ts');
const checkout = read('app/checkout/page.tsx');
const verified = read('app/api/payments/verified/route.ts');
const orderRoute = read('app/api/orders/route.ts');
const packageJson = read('package.json');
const phaseReport = read('PHASE10_CHECKOUT_TRACKING_ALIGNMENT.md');

check('Tracking type includes ViewCart', types.includes("VIEW_CART: 'ViewCart'") && types.includes("| 'ViewCart'"));
check('Tracking type includes AddShippingInfo', types.includes("ADD_SHIPPING_INFO: 'AddShippingInfo'") && types.includes("| 'AddShippingInfo'"));
check('GA4 ecommerce set includes view_cart', manager.includes("'view_cart'"));
check('GA4 ecommerce set includes add_shipping_info', manager.includes("'add_shipping_info'"));
check('Manager maps ViewCart to GA4 view_cart', manager.includes("ViewCart: 'view_cart'"));
check('Manager maps AddShippingInfo to GA4 add_shipping_info', manager.includes("AddShippingInfo: 'add_shipping_info'"));
check('Ecommerce helper exports trackViewCart', ecommerce.includes('export function trackViewCart'));
check('Ecommerce helper exports trackAddShippingInfo', ecommerce.includes('export function trackAddShippingInfo'));
check('Ecommerce helper exports trackAddPaymentInfo', ecommerce.includes('export function trackAddPaymentInfo'));
check('trackViewCart posts product analytics view_cart', ecommerce.includes("action: 'view_cart'"));
check('trackInitiateCheckout posts checkout_start', ecommerce.includes("action: 'checkout_start'"));
check('trackAddShippingInfo posts checkout_shipping_info', ecommerce.includes("action: 'checkout_shipping_info'"));
check('trackAddPaymentInfo posts checkout_payment_info', ecommerce.includes("action: 'checkout_payment_info'"));
check('Checkout imports phase10 helpers', checkout.includes('trackViewCart') && checkout.includes('trackAddShippingInfo') && checkout.includes('trackAddPaymentInfo'));
check('Checkout has view cart once guard', checkout.includes('viewCartTrackedRef') && checkout.includes('trackViewCart(items, subtotal)'));
check('Checkout has begin checkout once guard', checkout.includes('initiateCheckoutTrackedRef') && checkout.includes('markBeginCheckout'));
check('Begin checkout no longer fires automatically on page load', !checkout.includes('initiateCheckoutTrackedRef.current = true;\n    trackInitiateCheckout(items, subtotal);\n  }, [items, subtotal]);'));
check('Begin checkout fires on address interaction', checkout.includes('onFocus={markBeginCheckout}') && checkout.includes('handleCityChange') && checkout.includes('markBeginCheckout();'));
check('Checkout has shipping info once guard', checkout.includes('shippingInfoTrackedRef') && checkout.includes('trackAddShippingInfo(items, finalTotal, "Pathao Home Delivery")'));
check('Shipping info waits for valid shipping and quote success', checkout.includes('!hasRequiredShippingFields') && checkout.includes('deliveryState !== "success"'));
check('Checkout has payment info once guard', checkout.includes('paymentInfoTrackedRef') && checkout.includes('trackPaymentInfoOnce'));
check('Payment info fires from explicit payment selection', checkout.includes('trackPaymentInfoOnce(method)'));
check('Payment info fallback fires on submit for default payment method', checkout.includes('trackPaymentInfoOnce();'));
check('Checkout client does not fire Purchase', !checkout.includes("track('Purchase'") && !checkout.includes('trackPurchase') && !checkout.includes("trackSafely('Purchase'"));
check('COD order route does not client-fire purchase', !orderRoute.includes("track('Purchase'") && !orderRoute.includes('trackPurchase'));
check('Online purchase remains payment verified/server controlled', verified.includes('online_paid_purchase') && verified.includes('online_paid_payment_verified'));
check('GA4 client purchase still blocked in manager', manager.includes('Client-side purchase is blocked') && manager.includes('ga4_purchase_is_server_side_measurement_protocol_only'));
check('Package exposes phase10 audit script', packageJson.includes('qa:phase10-checkout-tracking'));
check('Phase 10 delivery report exists', phaseReport.includes('Phase 10') && phaseReport.includes('view_cart') && phaseReport.includes('add_shipping_info'));

const failed = checks.filter((c) => !c.pass);
for (const c of checks) {
  const mark = c.pass ? '✓' : '✗';
  console.log(`${mark} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}

if (failed.length) {
  console.error(`\nPhase 10 checkout tracking alignment audit failed: ${checks.length - failed.length}/${checks.length} checks passed`);
  process.exit(1);
}

console.log(`\nPhase 10 checkout tracking alignment audit: ${checks.length}/${checks.length} checks passed`);
