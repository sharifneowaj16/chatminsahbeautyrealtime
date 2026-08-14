import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];

function check(name, passed, file) {
  checks.push({ name, passed: Boolean(passed), file });
}

const shopUtils = read('lib/shopUtils.ts');
const shopPage = read('app/(storefront)/shop/page.tsx');
const shopGrid = read('app/components/shop/ShopGrid.tsx');
const activeFilters = read('app/components/shop/ActiveFilters.tsx');
const sortDropdown = read('app/components/shop/SortDropdown.tsx');
const productsRoute = read('app/api/products/route.ts');
const searchRoute = read('app/api/search/route.ts');
const shopSeo = fs.existsSync(path.join(root, 'lib/shopSeo.ts')) ? read('lib/shopSeo.ts') : '';

const legacyMapTokens = ['mfCategory', 'mfBrand', 'mfMinPrice', 'mfMaxPrice', 'mfSort'];

check(
  'Shared shop query normalizer maps all deprecated mf* params to standard keys',
  /SHOP_LEGACY_QUERY_PARAM_MAP/.test(shopUtils) && legacyMapTokens.every((token) => shopUtils.includes(token)) &&
    /mfCategory:\s*['"]category['"]/.test(shopUtils) &&
    /mfBrand:\s*['"]brand['"]/.test(shopUtils) &&
    /mfMinPrice:\s*['"]minPrice['"]/.test(shopUtils) &&
    /mfMaxPrice:\s*['"]maxPrice['"]/.test(shopUtils) &&
    /mfSort:\s*['"]sort['"]/.test(shopUtils),
  'lib/shopUtils.ts'
);

check(
  'Legacy search/inStockOnly aliases normalize to q/inStock',
  /search:\s*['"]q['"]/.test(shopUtils) && /inStockOnly:\s*['"]inStock['"]/.test(shopUtils),
  'lib/shopUtils.ts'
);

check(
  'buildSearchParams writes canonical q and inStock, not legacy search or inStockOnly',
  /params\.set\(['"]q['"],\s*filters\.search\)/.test(shopUtils) &&
    /params\.set\(['"]inStock['"],\s*['"]true['"]\)/.test(shopUtils) &&
    !/params\.set\(['"]search['"]/.test(shopUtils) &&
    !/params\.set\(['"]inStockOnly['"]/.test(shopUtils),
  'lib/shopUtils.ts'
);

check(
  'Standard keys win when old and new query params are both present',
  /Standard keys win/.test(shopUtils) && /standardEntries/.test(shopUtils) && /legacyEntries/.test(shopUtils),
  'lib/shopUtils.ts'
);

check(
  '/shop page redirects deprecated params to canonical URL',
  /redirect/.test(shopPage) && /hasLegacyShopQueryParams\(searchParams\)/.test(shopPage) && /buildCanonicalShopPath\(searchParams\)/.test(shopPage),
  'app/(storefront)/shop/page.tsx'
);

check(
  '/shop SEO metadata normalizes params before title, description, canonical, and noindex checks',
  (
    /normalizeShopSearchParams\(searchParams\)/.test(shopPage) &&
    /parseSearchParams\(params\)/.test(shopPage) &&
    /['"]inStock['"]/.test(shopPage) &&
    /params\.get\(key\)/.test(shopPage)
  ) || (
    /getShopSeoState\(searchParams\)/.test(shopPage) &&
    /parseSearchParams\(params\)/.test(shopPage) &&
    /normalizeShopSearchParams\(rawSearchParams\)/.test(shopSeo) &&
    /DEEP_FILTER_KEYS/.test(shopSeo) &&
    /['"]inStock['"]/.test(shopSeo) &&
    /getFirstParam\(params, key\)/.test(shopSeo)
  ),
  'app/(storefront)/shop/page.tsx + lib/shopSeo.ts'
);

check(
  'ShopGrid reads normalized params for q/filter/sort state',
  /normalizeShopSearchParams\(searchParams\)/.test(shopGrid) &&
    /const q = normalizedParams\.get\(['"]q['"]\)/.test(shopGrid) &&
    /parseSearchParams\(normalizedParams\)/.test(shopGrid) &&
    /normalizedParams\.get\(['"]category['"]\)/.test(shopGrid) &&
    /normalizedParams\.get\(['"]brand['"]\)/.test(shopGrid),
  'app/components/shop/ShopGrid.tsx'
);

check(
  'ShopGrid API calls use canonical q/inStock and never write deprecated shop keys',
  /params\.set\(['"]q['"], q\)/.test(shopGrid) &&
    /params\.set\(['"]inStock['"], ['"]true['"]\)/.test(shopGrid) &&
    !/params\.set\(['"]mf(Category|Brand|MinPrice|MaxPrice|Sort)['"]/.test(shopGrid) &&
    !/params\.set\(['"]inStockOnly['"]/.test(shopGrid),
  'app/components/shop/ShopGrid.tsx'
);

check(
  'Active filter chips and sort dropdown use shared parser/builder so writes stay canonical',
  /parseSearchParams\(searchParams\)/.test(activeFilters) && /buildSearchParams\(newFilters\)/.test(activeFilters) &&
    /parseSearchParams\(searchParams\)/.test(sortDropdown) && /buildSearchParams\(newFilters\)/.test(sortDropdown),
  'app/components/shop/ActiveFilters.tsx + SortDropdown.tsx'
);

check(
  '/api/products accepts normalized q/category/brand/price/sort/inStock contract',
  /normalizeShopSearchParams\(rawSearchParams\)/.test(productsRoute) &&
    /searchParams\.get\(['"]q['"]\)/.test(productsRoute) &&
    /searchParams\.get\(['"]inStock['"]\) === ['"]true['"]/.test(productsRoute) &&
    /where\.quantity = \{ gt: 0 \}/.test(productsRoute),
  'app/api/products/route.ts'
);

check(
  '/api/search validates, executes, and falls back using normalized params',
  /normalizeShopSearchParams\(request\.nextUrl\.searchParams\)/.test(searchRoute) &&
    /validateSearchParams\(searchParams\)/.test(searchRoute) &&
    /executeDatabaseSearchFallback\(\s*fallbackSearchParams/.test(searchRoute),
  'app/api/search/route.ts'
);

check(
  'Deprecated mf* strings are limited to the shared mapping, canonical cleanup, or audit scripts',
  (() => {
    const files = [
      ['app/(storefront)/shop/page.tsx', shopPage],
      ['app/components/shop/ActiveFilters.tsx', activeFilters],
      ['app/components/shop/SortDropdown.tsx', sortDropdown],
      ['app/api/products/route.ts', productsRoute],
      ['app/api/search/route.ts', searchRoute],
    ];
    return files.every(([, content]) => !legacyMapTokens.some((token) => content.includes(token))) &&
      legacyMapTokens.every((token) => shopUtils.includes(token)) &&
      legacyMapTokens.every((token) => shopGrid.includes(token));
  })(),
  'shop/query files'
);

const failed = checks.filter((item) => !item.passed);
for (const item of checks) {
  console.log(`${item.passed ? '✅' : '❌'} ${item.name} (${item.file})`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length}/${checks.length} Phase 1 checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} Phase 1 shop query contract checks passed.`);
