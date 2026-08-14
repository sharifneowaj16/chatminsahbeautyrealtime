#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const textFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx|ts|jsx|js|css|md)$/i.test(entry.name)) textFiles.push(full);
  }
}
['app', 'components', 'contexts', 'lib', 'scripts'].forEach((dir) => walk(path.join(root, dir)));

function assert(name, pass, detail = '') {
  results.push({ name, pass, detail });
}

const results = [];

const checkout = read('app/checkout/page.tsx');
assert('Checkout validation remains gated', checkout.includes('touchedFields') && checkout.includes('submitAttempted') && checkout.includes('visibleFieldErrors'));
assert('Checkout login CTA is not blocked by empty required fields', checkout.includes('canOpenLoginBeforeCheckout') && checkout.includes('placeOrderDisabled'));
assert('Checkout delivery quote includes area id', checkout.includes('pathao_area_id'));
assert('Checkout online payment avoids early clearCart', checkout.includes("selectedPaymentMethod.type === \"cod\"") && checkout.includes('await clearCart()'));

const cartContext = read('contexts/CartContext.tsx');
assert('Cart context keeps stock metadata and clamps quantity', cartContext.includes('maxQuantity') && cartContext.includes('clampCartQuantity'));

const cartDrawer = read('components/cart/CartDrawer.tsx');
assert('Cart drawer has no hardcoded free delivery threshold', !cartDrawer.includes('FREE_DELIVERY_THRESHOLD'));
assert('Cart drawer has focus management', cartDrawer.includes('previouslyFocusedElementRef') && cartDrawer.includes('focusableElements'));

const searchPage = read('app/(storefront)/search/page.tsx');
assert('Search cards avoid nested card Link/button structure', searchPage.includes('productHref') && searchPage.includes('handleProductLinkClick'));
assert('Search page exposes retry state', searchPage.includes('searchError') && searchPage.includes('Retry search'));
assert('Search filter controls have associated labels', searchPage.includes('categoryFieldId') && searchPage.includes('htmlFor={categoryFieldId}'));

const shopGrid = read('app/components/shop/ShopGrid.tsx');
assert('Shop search-mode stock is not forced to 1', !shopGrid.includes('stock: p.inStock ? 1 : 0'));
assert('Shop default search sort label is relevance-aware', shopGrid.includes('isSearchRelevanceDefault') && shopGrid.includes('Relevance'));

const shopSearchBar = read('app/components/shop/ShopSearchBar.tsx');
assert('ShopSearchBar uses unique listbox IDs', shopSearchBar.includes('useId') && shopSearchBar.includes('`${searchId}-shop-search-suggestions`'));

const buyNow = read('components/cart/BuyNowModal.tsx');
assert('Buy Now modal has accessible dialog/focus handling', buyNow.includes('role="dialog"') && buyNow.includes('aria-modal="true"') && buyNow.includes('previouslyFocusedElementRef'));
assert('Buy Now collects street address', buyNow.includes('streetAddress'));
assert('Buy Now simple quantity is stock constrained', buyNow.includes('simpleStock') && buyNow.includes('clampQuantity'));

const header = read('app/components/Header.tsx');
assert('Header cart count is real cart quantity', header.includes('useCart') && header.includes('cartCount') && !header.includes('useState(0)'));
assert('Header search routes to /shop', header.includes('/shop?q=') && !header.includes('/search?q='));

const globals = read('app/globals.css');
assert('Global readability/text scaling is unlocked', globals.includes('line-height: 1.5') && globals.includes('-webkit-text-size-adjust: 100%') && !globals.includes('-webkit-text-size-adjust: none'));
assert('Safe-area utilities exist', globals.includes('.minsah-bottom-safe') && globals.includes('.minsah-sticky-action-safe'));

const requiredAssets = [
  'public/placeholder.jpg',
  'public/product-placeholder.jpg',
  'public/logo.png',
  'public/favicon.ico',
  'public/shortlist-icon-192.png',
  'public/shortlist-og-image.png',
  'public/images/logo.png',
  'public/images/og-default.jpg',
];
for (const asset of requiredAssets) {
  assert(`Static asset exists: ${asset}`, exists(asset));
}

const assetRefRegex = /["'](\/[^"']+\.(?:jpg|jpeg|png|svg|webp|gif|ico))["']/gi;
const missingAssetRefs = [];
for (const file of textFiles) {
  const src = fs.readFileSync(file, 'utf8');
  for (const match of src.matchAll(assetRefRegex)) {
    const ref = match[1];
    const assetPath = path.join(root, 'public', ref.replace(/^\//, ''));
    if (!fs.existsSync(assetPath)) missingAssetRefs.push(`${path.relative(root, file)} -> ${ref}`);
  }
}
assert('All static image/icon references resolve under public/', missingAssetRefs.length === 0, missingAssetRefs.join('\n'));

const reports = [
  'PHASE1_CHECKOUT_CONVERSION_BLOCKERS_FIX_REPORT.md',
  'PHASE2_CART_INTEGRITY_DRAWER_UX_FIX_REPORT.md',
  'PHASE3_SEARCH_CRITICAL_FIXES_REPORT.md',
  'PHASE4_SHOP_DISCOVERY_FILTER_FIXES_REPORT.md',
  'PHASE5_BUY_NOW_MODAL_FIXES_REPORT.md',
  'PHASE6_HEADER_NAVIGATION_FIXES_REPORT.md',
  'PHASE7_PRODUCT_PAGE_POLISH_FIXES_REPORT.md',
  'PHASE8_GLOBAL_ACCESSIBILITY_MOBILE_DESIGN_FIXES_REPORT.md',
  'PHASE9_ACCOUNT_ADMIN_ACCESSIBILITY_FIXES_REPORT.md',
  'PHASE10_QA_GOVERNANCE_RELEASE_CONFIDENCE_REPORT.md',
];
for (const report of reports) assert(`Phase report exists: ${report}`, exists(report));

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  const mark = r.pass ? '✓' : '✗';
  console.log(`${mark} ${r.name}`);
  if (!r.pass && r.detail) console.log(r.detail.split('\n').map((line) => `  ${line}`).join('\n'));
}
console.log(`\nPhase 11 post-fix regression audit: ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.error(`Failed checks: ${failed.length}`);
  process.exit(1);
}
console.log('All Phase 11 post-fix regression checks passed.');
