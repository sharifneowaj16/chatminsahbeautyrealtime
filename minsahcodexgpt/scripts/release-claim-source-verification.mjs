#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [];
const add = (name, file, test, evidence) => checks.push({ name, file, test, evidence });

add(
  'Checkout validation errors are gated by touchedFields/submitAttempted',
  'app/checkout/page.tsx',
  (src) => src.includes('touchedFields') && src.includes('submitAttempted') && src.includes('visibleFieldErrors'),
  'Requires touchedFields, submitAttempted, and visibleFieldErrors markers.'
);

add(
  'Checkout has visible labels for approved address fields',
  'app/checkout/page.tsx',
  (src) => ['checkout-full-name', 'checkout-phone', 'checkout-city', 'checkout-zone', 'checkout-area', 'checkout-street-address'].every((id) => src.includes(`htmlFor="${id}"`)),
  'Requires visible labels bound to checkout-full-name, checkout-phone, checkout-city, checkout-zone, checkout-area, checkout-street-address.'
);

add(
  'Checkout login CTA remains clickable for unauthenticated users',
  'app/checkout/page.tsx',
  (src) => src.includes('const placeOrderDisabled') && src.includes('const canOpenLoginBeforeCheckout') && src.includes('Login to place order'),
  'Requires disabled-state split and login CTA copy for unauthenticated checkout.'
);

add(
  'Checkout delivery quote includes selected area',
  'app/checkout/page.tsx',
  (src) => /pathao_area_id:\s*shippingForm\.pathao_area_id/.test(src),
  'Requires pathao_area_id in delivery quote/order payload.'
);

add(
  'Online payment does not clear cart before gateway success',
  'app/checkout/page.tsx',
  (src) => /if\s*\(selectedPaymentMethod\.type\s*===\s*["']cod["']\)\s*{[\s\S]*?clearCart\(\)/.test(src),
  'Requires immediate clearCart to be gated to COD-only checkout.'
);

add(
  'Cart context stores and clamps stock/maxQuantity',
  'contexts/CartContext.tsx',
  (src) => src.includes('maxQuantity') && src.includes('clampCartQuantity') && src.includes('trackInventory'),
  'Requires maxQuantity/stock policy and central clampCartQuantity.'
);

add(
  'Cart drawer no longer promises hardcoded free-delivery threshold',
  'components/cart/CartDrawer.tsx',
  (src) => !src.includes('FREE_DELIVERY_THRESHOLD') && src.includes('Calculated at checkout') && src.includes('Final amount will be shown before order placement'),
  'Requires no FREE_DELIVERY_THRESHOLD and checkout-calculated delivery copy.'
);

add(
  'Cart drawer has keyboard dialog controls',
  'components/cart/CartDrawer.tsx',
  (src) => src.includes('aria-modal="true"') && src.includes('querySelectorAll<HTMLElement>') && src.includes('previouslyFocusedElement'),
  'Requires dialog semantics, focus trap query, and focus return tracking.'
);

add(
  'Legacy header cart count is real cart quantity, not hardcoded 0',
  'app/components/Header.tsx',
  (src) => src.includes('useCart') && src.includes('cartCount') && !src.includes('useState(0);'),
  'Requires useCart and no static useState(0) cart count.'
);

add(
  'Header search routes to /shop?q= instead of /search?q=',
  'app/components/Header.tsx',
  (src) => src.includes('/shop?q=') && !src.includes('/search?q='),
  'Requires search submissions to use /shop?q=.'
);

add(
  'ShopSearchBar uses unique IDs for combobox/listbox',
  'app/components/shop/ShopSearchBar.tsx',
  (src) => src.includes('useId') && src.includes('const listboxId = `${searchId}-shop-search-suggestions`') && !src.includes("const listboxId = 'shop-search-suggestions'"),
  'Requires React useId and no static listbox ID.'
);

add(
  'Shop search-mode stock is not forced to 1',
  'app/components/shop/ShopGrid.tsx',
  (src) => !src.includes('stock: p.inStock ? 1 : 0') && (src.includes('getSearchProductStock') || src.includes('resolveSearchProductStock')),
  'Requires getSearchProductStock/resolveSearchProductStock or equivalent real/unknown stock mapping.'
);

add(
  'Search product cards avoid nested Link/button interaction',
  'app/(storefront)/search/page.tsx',
  (src) => src.includes('<article') && src.includes('CardBuyNowButton') && !/<Link[\s\S]{0,900}<CardBuyNowButton/.test(src),
  'Requires product card article pattern with Buy Now button outside the detail link.'
);

add(
  'Search price ranges use explicit min/max contract',
  'app/(storefront)/search/page.tsx',
  (src) => src.includes('range.min') && src.includes('range.max') && !src.includes("replace('Under '") && !src.includes("replace('Over '"),
  'Requires explicit min/max use instead of label string parsing.'
);

add(
  'Search API exposes exact/display totals for fallback mode',
  'app/api/search/route.ts',
  (src) => src.includes('exactTotal') && src.includes('displayTotal') && src.includes('fallback'),
  'Requires exactTotal/displayTotal/fallback markers.'
);

add(
  'Buy Now modal has complete street address and accessible dialog controls',
  'components/cart/BuyNowModal.tsx',
  (src) => src.includes('streetAddress') && src.includes('role="dialog"') && src.includes('querySelectorAll<HTMLElement>') && src.includes('Login to place order'),
  'Requires streetAddress, dialog semantics/focus trap, and guest login CTA copy.'
);

add(
  'Product gallery fallback image exists and is local',
  'app/products/[id]/components/ProductGallery.tsx',
  (src) => src.includes('/placeholder.jpg') && exists('public/placeholder.jpg'),
  'Requires local /placeholder.jpg and public asset.'
);

add(
  'Global body readability and text scaling are enabled',
  'app/globals.css',
  (src) => src.includes('line-height: 1.5') && src.includes('-webkit-text-size-adjust: 100%') && !src.includes('-webkit-text-size-adjust: none'),
  'Requires body line-height 1.5 and no blocked iOS scaling.'
);

add(
  'Account/admin accessibility report exists for Phase 9',
  'PHASE9_ACCOUNT_ADMIN_ACCESSIBILITY_FIXES_REPORT.md',
  (src) => src.includes('Alt Text') || src.includes('alt'),
  'Requires Phase 9 account/admin report artifact.'
);

add(
  'Phase 9 checkout report includes Phase 10 correction/addendum',
  'PHASE9_CHECKOUT_PAYMENT_UX_POLISH.md',
  (src) => src.includes('Phase 10 source-verification addendum') && src.includes('touchedFields') && src.includes('submitAttempted'),
  'Requires explicit correction so docs match current source behavior.'
);

const results = [];
for (const check of checks) {
  const filePath = path.join(root, check.file);
  if (!fs.existsSync(filePath)) {
    results.push({ ...check, pass: false, message: `Missing file: ${check.file}` });
    continue;
  }
  const src = read(check.file);
  let pass = false;
  try {
    pass = Boolean(check.test(src));
  } catch (error) {
    results.push({ ...check, pass: false, message: error.message });
    continue;
  }
  results.push({ ...check, pass, message: pass ? 'ok' : check.evidence });
}

const failed = results.filter((result) => !result.pass);
console.log(`Release claim source verification: ${results.length - failed.length}/${results.length} checks passed`);
for (const result of results) {
  console.log(`${result.pass ? '✓' : '✗'} ${result.name} (${result.file})`);
  if (!result.pass) console.log(`  ${result.message}`);
}

if (failed.length) {
  console.error(`\nFAILED: ${failed.length} source-verification checks failed.`);
  process.exit(1);
}

console.log('\nAll release claim source-verification checks passed.');
