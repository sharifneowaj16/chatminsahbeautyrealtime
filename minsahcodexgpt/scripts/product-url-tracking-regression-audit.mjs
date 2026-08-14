#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const checks = [];
const issues = [];

function relPath(...segments) {
  return path.join(root, ...segments);
}

function read(relativePath) {
  const absolutePath = relPath(relativePath);
  if (!fs.existsSync(absolutePath)) {
    issues.push(`Missing file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function expect(name, condition, details = '') {
  checks.push({ name, ok: Boolean(condition), details });
  if (!condition) {
    issues.push(`${name}${details ? ` — ${details}` : ''}`);
  }
}

function includes(relativePath, token) {
  return read(relativePath).includes(token);
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function requireTokens(relativePath, tokens, label = 'required token') {
  const text = read(relativePath);
  for (const token of tokens) {
    expect(`${relativePath} has ${label}: ${token}`, text.includes(token));
  }
}

const productUrlHelper = read('lib/product-url.ts');
expect('Product URL helper exists', productUrlHelper.length > 0);
expect('Product URL helper exports productPath()', /export\s+function\s+productPath\s*\(/.test(productUrlHelper));
expect('Product URL helper exports productUrlKey()', /export\s+function\s+productUrlKey\s*\(/.test(productUrlHelper));
expect('Product URL helper uses slug-first fallback', productUrlHelper.includes('cleanProductUrlKey(product.slug)') && productUrlHelper.includes('cleanProductUrlKey(product.urlSlug)') && productUrlHelper.includes('cleanProductUrlKey(product.id)'));
expect('Product URL helper encodes public path key', productUrlHelper.includes('encodeURIComponent(key)'));

const slugFirstFiles = [
  'app/components/HomeProductSections.tsx',
  'app/components/HomeProductsClientFallback.tsx',
  'app/(storefront)/flash-sale/page.tsx',
  'app/(storefront)/for-you/page.tsx',
  'app/(storefront)/new-arrivals/page.tsx',
  'app/(storefront)/favourites/page.tsx',
  'app/(storefront)/recommendations/page.tsx',
  'app/components/ProductCard.tsx',
  'app/components/shop/ProductCard.tsx',
  'components/account/wishlist-client.tsx',
  'components/account/reviews-client.tsx',
  'components/account/order-detail-client.tsx',
  'components/account/return-request-client.tsx',
  'app/(storefront)/products/[id]/components/ProductClient.tsx',
];

for (const relativePath of slugFirstFiles) {
  const source = read(relativePath);
  expect(`${relativePath} imports productPath`, source.includes("@/lib/product-url") && source.includes('productPath'));
  expect(`${relativePath} uses productPath(`, source.includes('productPath('));
}

const forbiddenNavigationPatterns = [
  /href=\{`\/products\/\$\{\s*product\.id\s*\}`\}/,
  /router\.push\(`\/products\/\$\{\s*product\.id\s*\}`\)/,
  /href=\{`\/products\/\$\{\s*item\.productId\s*\}`\}/,
  /href=\{`\/products\/\$\{\s*review\.productId\s*\}`\}/,
];

for (const relativePath of slugFirstFiles) {
  const source = read(relativePath);
  for (const pattern of forbiddenNavigationPatterns) {
    expect(`${relativePath} avoids direct product id public navigation pattern ${pattern}`, !pattern.test(source));
  }
}

const accountServerFiles = [
  'app/account/wishlist/page.tsx',
  'app/account/reviews/page.tsx',
];
for (const relativePath of accountServerFiles) {
  const source = read(relativePath);
  expect(`${relativePath} selects product slug`, /slug\s*:\s*true/.test(source));
  expect(`${relativePath} exposes productSlug to client`, source.includes('productSlug'));
}

requireTokens('app/(storefront)/products/[id]/page.tsx', [
  'permanentRedirect',
  'productPath(product)',
  'safeCanonicalUrl',
  'withPreservedAttributionParams',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
], 'canonical redirect token');
expect('Product page does not use old hardcoded production BASE_URL', !includes('app/(storefront)/products/[id]/page.tsx', "const BASE_URL = 'https://minsahbeauty.cloud'"));

requireTokens('app/api/products/[id]/route.ts', [
  'PUBLIC_PRODUCT_FILTER',
  'deletedAt: null',
  'isActive: true',
], 'public active-only API token');

requireTokens('lib/tracking/manager.ts', [
  'buildGoogleEventPayload',
  'buildGa4Items',
  'GA4_ECOMMERCE_EVENTS',
  "'view_item'",
  "'add_to_cart'",
  "'add_to_wishlist'",
  "'begin_checkout'",
  "'add_payment_info'",
  'payload.items = items',
  "window.gtag('event', gaEvent, buildGoogleEventPayload(gaEvent, data))",
], 'GA4 browser ecommerce token');

requireTokens('lib/tracking/ecommerce.ts', [
  'buildMetaCommerceBrowserEvent',
  'buildMetaCommercePayload',
  'productSku',
  'variantSku',
  'productId: product.id',
  'export function trackAddToCartBundle',
], 'Meta catalog identity token');
expect('Tracking ecommerce helper does not map content_ids from slug', !/content_ids[^\n]{0,120}slug|slug[^\n]{0,120}content_ids/.test(read('lib/tracking/ecommerce.ts')));

requireTokens('contexts/CartContext.tsx', [
  'export interface AddItemOptions',
  'track?: boolean',
  'addItem: (item: CartItem, options?: AddItemOptions) => Promise<boolean>',
  'options.track !== false',
], 'cart tracking suppression token');

requireTokens('app/(storefront)/products/[id]/components/ProductClient.tsx', [
  'trackAddToCartBundle',
  'addItem(cartItem, { track: false })',
  'trackProductView({',
  'productPath(relatedProduct)',
  'productPath(bundleProduct)',
  'productPath(recentProduct)',
], 'product page tracking cleanup token');
expect('ProductClient no longer has direct /products template hrefs', countMatches(read('app/(storefront)/products/[id]/components/ProductClient.tsx'), /href=\{`\/products\/\$\{/g) === 0);
expect('ProductClient ViewContent key distinguishes product group and selected variant', includes('app/(storefront)/products/[id]/components/ProductClient.tsx', 'selectedVariantObj?.id') && includes('app/(storefront)/products/[id]/components/ProductClient.tsx', ':group'));

const packageJson = JSON.parse(read('package.json') || '{}');
expect('package.json exposes qa:product-url-tracking script', packageJson.scripts?.['qa:product-url-tracking'] === 'node scripts/product-url-tracking-regression-audit.mjs');
expect('Phase 10 report exists', fs.existsSync(relPath('PHASE10_PRODUCT_URL_TRACKING_QA_GUARDRAILS.md')));
expect('Production QA checklist exists', fs.existsSync(relPath('docs/production/product-url-tracking-qa-checklist.md')));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = {
  ok: failed === 0,
  passed,
  failed,
  issueCount: issues.length,
  issues,
};

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
