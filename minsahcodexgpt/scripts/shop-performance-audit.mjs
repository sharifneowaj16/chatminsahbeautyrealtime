import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];

function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}

function hasAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

const searchRoute = read('app/api/search/route.ts');
const productsRoute = read('app/api/products/route.ts');
const productCard = read('app/components/shop/ProductCard.tsx');
const catalogProductImage = read('components/catalog/CatalogProductImage.tsx');
const shopGrid = read('app/components/shop/ShopGrid.tsx');
const shopSearchBar = read('app/components/shop/ShopSearchBar.tsx');
const shopPage = read('app/(storefront)/shop/page.tsx');
const merchandising = read('app/components/shop/ShopMerchandisingSections.tsx');
const nextConfig = read('next.config.ts');
const packageJson = JSON.parse(read('package.json'));
const shopPerformance = exists('lib/shopPerformance.ts') ? read('lib/shopPerformance.ts') : '';
const skeleton = exists('app/components/shop/ProductGridSkeleton.tsx') ? read('app/components/shop/ProductGridSkeleton.tsx') : '';

const sourceFieldMatch = shopPerformance.match(/SHOP_SEARCH_SOURCE_FIELDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
const sourceFieldsBlock = sourceFieldMatch?.[1] || '';
const forbiddenSourceFields = [
  'description',
  'shortDescription',
  'metaDescription',
  'metaKeywords',
  'ingredients',
  'variants',
  'secondaryKeywords',
  'banglaSearchTerms',
  'synonyms',
  'entities',
  'reviewKeywords',
  'buyingIntentKeywords',
  'imageAltTexts',
];

check('lib/shopPerformance.ts exists', exists('lib/shopPerformance.ts'));
check('search source allowlist is declared', shopPerformance.includes('SHOP_SEARCH_SOURCE_FIELDS'));
check(
  'search source allowlist includes product-card fields',
  hasAll(sourceFieldsBlock, ["'id'", "'name'", "'slug'", "'price'", "'images'", "'brandSlug'", "'categorySlug'", "'rating'", "'reviewCount'", "'createdAt'"])
);
check(
  'search source allowlist excludes heavy SEO/admin/body fields',
  forbiddenSourceFields.every((field) => !sourceFieldsBlock.includes(`'${field}'`) && !sourceFieldsBlock.includes(`"${field}"`)),
  `Forbidden fields checked: ${forbiddenSourceFields.join(', ')}`
);
check('search route imports performance helpers', searchRoute.includes("@/lib/shopPerformance"));
check('search route applies _source allowlist to primary ES query', /const searchBody:[\s\S]*?_source:\s*SHOP_SEARCH_SOURCE_FIELDS/.test(searchRoute));
check('search route applies _source allowlist to fallback ES queries', (searchRoute.match(/_source:\s*SHOP_SEARCH_SOURCE_FIELDS/g) || []).length >= 4);
check('search route returns approximate payload byte header', searchRoute.includes('X-Approx-Payload-Bytes') || searchRoute.includes('getShopPayloadHeaders(responsePayload'));
check('search route uses listing cache-control helper', searchRoute.includes('SHOP_LISTING_CACHE_CONTROL'));
check('products route imports performance helpers', productsRoute.includes("@/lib/shopPerformance"));
check('products listing view caps public page size to 60', productsRoute.includes('const maxLimit = listingView ? 60 : 500'));
check('products listing view uses Prisma select instead of full scalar include', productsRoute.includes('listingView') && productsRoute.includes('select: {') && productsRoute.includes('payloadPolicy'));
check('products listing view limits images to 2', productsRoute.includes('take: 2') && productsRoute.includes('select: { url: true, alt: true, isDefault: true }'));
check('products listing view limits variants to 8', productsRoute.includes('take: 8'));
check('products route returns approximate payload byte header', productsRoute.includes('getShopPayloadHeaders(responsePayload'));
check('ProductGridSkeleton.tsx exists', exists('app/components/shop/ProductGridSkeleton.tsx'));
check('ProductGridSkeleton matches card image aspect ratio', skeleton.includes('aspect-square'));
check('ProductGridSkeleton reserves title/price/button height', hasAll(skeleton, ['min-h-[2.45rem]', 'min-h-5', 'h-11']));
check('ShopGrid uses ProductGridSkeleton for loading state', shopGrid.includes("import ProductGridSkeleton") && shopGrid.includes('<ProductGridSkeleton count={8} />'));
check('Shop page Suspense fallback uses ProductGridSkeleton', shopPage.includes("ProductGridSkeleton") && shopPage.includes('<ProductGridSkeleton count={8} />'));
check(
  'ProductCard uses the shared next/image wrapper with responsive sizes',
  productCard.includes("import CatalogProductImage from '@/components/catalog/CatalogProductImage'") &&
    productCard.includes('sizes="(max-width: 480px) 50vw') &&
    catalogProductImage.includes("import Image from 'next/image'") &&
    catalogProductImage.includes('sizes={sizes}')
);
check('ProductCard prioritizes only first product images', productCard.includes('priority={(index ?? 99) < 4}'));
check(
  'ProductCard lazily loads below-fold images through the shared wrapper',
  catalogProductImage.includes("priority = false") &&
    catalogProductImage.includes("loading={priority ? 'eager' : 'lazy'}") &&
    catalogProductImage.includes("fetchPriority={priority ? 'high' : 'auto'}")
);
check('ProductCard image container has stable aspect-square layout', productCard.includes('aspect-square w-full'));
check('ShopMerchandisingSections lazy-loads horizontal product images', merchandising.includes('loading="lazy"'));
check('ShopSearchBar suggestions are debounced', shopSearchBar.includes('debounceRef') && shopSearchBar.includes('setTimeout(() => fetchSuggestions(value), 280)'));
check(
  'ShopSearchBar suggestion images use the lazy shared wrapper',
  shopSearchBar.includes('<CatalogProductImage src={src} alt={alt} sizes="32px" padding="sm" />') &&
    catalogProductImage.includes('priority = false')
);
check('ShopGrid debounces filter URL navigation', shopGrid.includes('filterUrlDebounceRef') && shopGrid.includes('setTimeout(() => {') && shopGrid.includes('}, 160)'));
check('next.config enables compression and modern image formats', nextConfig.includes('compress: true') && nextConfig.includes('"image/avif"') && nextConfig.includes('"image/webp"'));
check(
  'next.config includes mobile-first image sizes and leaves framework cache routes to Next.js',
  nextConfig.includes('deviceSizes: [390') &&
    nextConfig.includes('minimumCacheTTL: 2592000') &&
    !nextConfig.includes('source: "/_next/image"') &&
    !nextConfig.includes('source: "/_next/static/:path*"')
);
check('qa:shop-performance script is registered', packageJson.scripts?.['qa:shop-performance'] === 'node scripts/shop-performance-audit.mjs');
check('audit:shop-release includes qa:shop-performance', packageJson.scripts?.['audit:shop-release']?.includes('qa:shop-performance'));

const passed = checks.filter((item) => item.pass).length;
const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  console.log(`${item.pass ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}

console.log(`\nShop performance audit: ${passed}/${checks.length} checks passed`);

if (failed.length > 0) {
  console.error('\nFailed checks:');
  for (const item of failed) console.error(`- ${item.name}`);
  process.exit(1);
}
