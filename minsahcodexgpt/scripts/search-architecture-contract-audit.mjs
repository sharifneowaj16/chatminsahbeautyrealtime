import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const checks = [];
function check(name, passed, evidence = '') {
  checks.push({ name, passed: Boolean(passed), evidence });
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

// ─────────────────────────────────────────────────────────────────────────────
// Load source files
// ─────────────────────────────────────────────────────────────────────────────
const sortPath = 'lib/search/sort.ts';
const typesPath = 'lib/search/types.ts';
const perfPath = 'lib/shopPerformance.ts';
const searchRoutePath = 'app/api/search/route.ts';
const suggestionsRoutePath = 'app/api/search/suggestions/route.ts';
const productsRoutePath = 'app/api/products/route.ts';
const dbFallbackPath = 'lib/search/db-fallback.ts';
const shopGridPath = 'app/components/shop/ShopGrid.tsx';
const homeSearchPath = 'app/components/HomeSearch.tsx';
const catalogNavPath = 'lib/catalog-navigation.ts';
const pkgPath = 'package.json';

const sortCode = read(sortPath);
const typesCode = read(typesPath);
const perfCode = read(perfPath);
const searchRouteCode = read(searchRoutePath);
const suggestionsRouteCode = read(suggestionsRoutePath);
const productsRouteCode = read(productsRoutePath);
const dbFallbackCode = read(dbFallbackPath);
const shopGridCode = read(shopGridPath);
const homeSearchCode = read(homeSearchPath);
const catalogNavCode = read(catalogNavPath);
const pkg = JSON.parse(read(pkgPath));

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Guard 1: Canonical Sort Contract & Repository-Wide Anti-Duplication
// ─────────────────────────────────────────────────────────────────────────────
check('Guard 1: lib/search/sort.ts exists as canonical source of truth', exists(sortPath));
check('Guard 1: sort library exports SORT_MAP', /export\s+const\s+SORT_MAP/.test(sortCode));
check('Guard 1: sort library exports mapShopSortToSearchApiSort', /export\s+function\s+mapShopSortToSearchApiSort/.test(sortCode));
check('Guard 1: sort library exports normalizeShopSort', /export\s+function\s+normalizeShopSort/.test(sortCode));
check('Guard 1: sort library exports SEARCH_SORT_TO_SHOP_SORT', /export\s+const\s+SEARCH_SORT_TO_SHOP_SORT/.test(sortCode));

// Runtime import & verification of canonical Minsah Beauty sort mappings
const sortModule = await import(pathToFileURL(path.resolve(sortPath)).href);
const { mapShopSortToSearchApiSort, normalizeShopSort, SEARCH_SORT_TO_SHOP_SORT } = sortModule;

check('Guard 1: runtime mapShopSortToSearchApiSort maps featured to relevance', mapShopSortToSearchApiSort('featured') === 'relevance');
check('Guard 1: runtime mapShopSortToSearchApiSort maps price-low-high to price_asc', mapShopSortToSearchApiSort('price-low-high') === 'price_asc');
check('Guard 1: runtime mapShopSortToSearchApiSort maps price-high-low to price_desc', mapShopSortToSearchApiSort('price-high-low') === 'price_desc');
check('Guard 1: runtime mapShopSortToSearchApiSort maps highest-rated to rating', mapShopSortToSearchApiSort('highest-rated') === 'rating');
check('Guard 1: runtime mapShopSortToSearchApiSort maps newest to newest', mapShopSortToSearchApiSort('newest') === 'newest');
check('Guard 1: runtime mapShopSortToSearchApiSort maps best-selling to popularity', mapShopSortToSearchApiSort('best-selling') === 'popularity');
check('Guard 1: runtime mapShopSortToSearchApiSort maps biggest-discount to discount_desc', mapShopSortToSearchApiSort('biggest-discount') === 'discount_desc');
check('Guard 1: runtime mapShopSortToSearchApiSort maps a-z to name_asc', mapShopSortToSearchApiSort('a-z') === 'name_asc');
check('Guard 1: runtime normalizeShopSort safely defaults invalid sort to relevance', normalizeShopSort('invalid_key') === 'relevance');

// Anti-duplication checks across all repository consumers:
check('Guard 1: ShopGrid imports mapShopSortToSearchApiSort from lib/search/sort', /import\s*\{[^}]*mapShopSortToSearchApiSort[^}]*\}\s*from\s*['"]@\/lib\/search\/sort['"]/.test(shopGridCode));
check('Guard 1: ShopGrid contains NO duplicate local function mapShopSortToSearchApiSort', !/function\s+mapShopSortToSearchApiSort\s*\(/.test(shopGridCode));
check('Guard 1: ShopGrid contains NO duplicate biggest-discount switch case', !/case\s*['"]biggest-discount['"]\s*:\s*return\s*['"]discount_desc['"]/.test(shopGridCode));

check('Guard 1: search route imports normalizeShopSort from lib/search/sort', /import\s*\{[^}]*normalizeShopSort[^}]*\}\s*from\s*['"]@\/lib\/search\/sort['"]/.test(searchRouteCode));
check('Guard 1: search route contains NO duplicate local function normalizeShopSort', !/function\s+normalizeShopSort\s*\(/.test(searchRouteCode));

check('Guard 1: catalog-navigation imports SEARCH_SORT_TO_SHOP_SORT from lib/search/sort', /import\s*\{[^}]*SEARCH_SORT_TO_SHOP_SORT[^}]*\}\s*from\s*['"]@\/lib\/search\/sort['"]/.test(catalogNavCode));
check('Guard 1: catalog-navigation contains NO duplicate const SEARCH_SORT_TO_SHOP_SORT', !/const\s+SEARCH_SORT_TO_SHOP_SORT\s*:\s*Record/.test(catalogNavCode));

check('Guard 1: products route imports normalizeShopSort from lib/search/sort', /import\s*\{[^}]*normalizeShopSort[^}]*\}\s*from\s*['"]@\/lib\/search\/sort['"]/.test(productsRouteCode));

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Guard 2: Field Allowlist & Badge/Card Integrity Guard
// ─────────────────────────────────────────────────────────────────────────────
check('Guard 2: SHOP_SEARCH_SOURCE_FIELDS includes discount', /['"]discount['"]/.test(perfCode));
check('Guard 2: SHOP_SEARCH_SOURCE_FIELDS includes isNewArrival', /['"]isNewArrival['"]/.test(perfCode));
check('Guard 2: SHOP_SEARCH_SOURCE_FIELDS excludes heavy SEO/body/variant fields',
  !perfCode.includes("'description'") &&
  !perfCode.includes("'variants'") &&
  !perfCode.includes("'ingredients'") &&
  !perfCode.includes("'metaKeywords'")
);
check('Guard 2: search route ProductSource interface includes discount', /discount\?:?\s*number/.test(searchRouteCode));
check('Guard 2: search route ProductSource interface includes isNewArrival', /isNewArrival\?:?\s*boolean/.test(searchRouteCode));
check('Guard 2: ShopGrid maps isNewArrival dynamically to isNew', /isNewArrival\s*\?\?\s*(?:p\.)?isNew/.test(shopGridCode));
check('Guard 2: ShopGrid has no hardcoded isNew: false in product adapter', !/isNew:\s*false,/.test(shopGridCode));
check('Guard 2: ShopGrid product adapter preserves skinType and skinConcerns',
  /skinType:\s*p\.skinType/.test(shopGridCode) &&
  /skinConcerns:\s*p\.skinConcerns/.test(shopGridCode)
);

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Guard 3: Multi-Faceted Filter Pipeline Guard (skinType, skinConcern, saleOnly)
// ─────────────────────────────────────────────────────────────────────────────
check('Guard 3: search API route parses skinType, skinConcern, and saleOnly',
  /searchParams\.get\(['"]skinType['"]\)/.test(searchRouteCode) &&
  /searchParams\.get\(['"]skinConcern['"]\)/.test(searchRouteCode) &&
  /searchParams\.get\(['"]saleOnly['"]\)/.test(searchRouteCode)
);
check('Guard 3: search API route constructs Elasticsearch bool.should for skinType', /terms:\s*\{\s*skinType:\s*skinTypeValues\s*\}/.test(searchRouteCode));
check('Guard 3: search API route constructs Elasticsearch bool.should for skinConcern', /terms:\s*\{\s*skinConcern:\s*concernValues\s*\}/.test(searchRouteCode));
check('Guard 3: search API route applies saleOnly filter for discount or flash sale', /range:\s*\{\s*discount:\s*\{\s*gt:\s*0\s*\}\s*\}/.test(searchRouteCode) && /isFlashSale:\s*true/.test(searchRouteCode));

check('Guard 3: db-fallback implements skinType and skinConcern in buildWhere',
  dbFallbackCode.includes('skinType') &&
  dbFallbackCode.includes('skinConcern') &&
  dbFallbackCode.includes('saleOnly')
);
check('Guard 3: products API implements skinType, skinConcern, and saleOnly',
  productsRouteCode.includes('skinType') &&
  productsRouteCode.includes('skinConcern') &&
  productsRouteCode.includes('saleOnly')
);
check('Guard 3: ShopGrid manages state for selectedSkinTypes, selectedSkinConcerns, and isSaleOnly',
  shopGridCode.includes('selectedSkinTypes') &&
  shopGridCode.includes('selectedSkinConcerns') &&
  shopGridCode.includes('isSaleOnly')
);
check('Guard 3: ShopGrid renders interactive Skin Type filter chips', /skinTypeOptions\.map/.test(shopGridCode));
check('Guard 3: ShopGrid renders interactive Skin Concern filter chips', /skinConcernOptions\.map/.test(shopGridCode));
check('Guard 3: ShopGrid renders On Sale / Flash Sale Only toggle', /saleOnly:\s*isSaleOnly\s*\?\s*null\s*:\s*['"]true['"]/.test(shopGridCode));
check('Guard 3: ShopGrid forwards subcategory and tags in unified browse mode',
  /if\s*\(\s*subcategory\s*\)\s*params\.set\(\s*['"]subcategory['"]\s*,\s*subcategory\s*\)/.test(shopGridCode) &&
  /if\s*\(\s*tags\s*\)\s*params\.set\(\s*['"]tags['"]\s*,\s*tags\s*\)/.test(shopGridCode)
);

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Guard 4: Personalization vs Anonymous Cache Poisoning Guard
// ─────────────────────────────────────────────────────────────────────────────
check('Guard 4: search API evaluates isPersonalized based on userCategories',
  /const\s+isPersonalized\s*=\s*userCategories\.length\s*>\s*0/.test(searchRouteCode)
);
check('Guard 4: search API assigns private no-store cache control for personalized search',
  /private,\s*no-cache,\s*no-store,\s*must-revalidate/.test(searchRouteCode)
);
check('Guard 4: search API uses SHOP_LISTING_CACHE_CONTROL for anonymous requests',
  /searchCacheControl\s*=\s*isPersonalized[\s\S]*:\s*SHOP_LISTING_CACHE_CONTROL/.test(searchRouteCode) &&
  /'Cache-Control':\s*searchCacheControl/.test(searchRouteCode)
);

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Guard 5: Unified Browse Feature Flag & Add-to-Cart Safety Guard
// ─────────────────────────────────────────────────────────────────────────────
check('Guard 5: lib/shopPerformance.ts exports isUnifiedBrowseEnabled', /export\s+function\s+isUnifiedBrowseEnabled/.test(perfCode));
check('Guard 5: isUnifiedBrowseEnabled reads NEXT_PUBLIC_ENABLE_UNIFIED_ES_BROWSE', perfCode.includes('NEXT_PUBLIC_ENABLE_UNIFIED_ES_BROWSE'));
check('Guard 5: ShopGrid routes browse requests through Elasticsearch when enabled',
  shopGridCode.includes('isUnifiedBrowseEnabled()') &&
  /fetch\(`\/api\/search\?\$\{params\.toString\(\)\}`\)/.test(shopGridCode)
);
check('Guard 5: ShopGrid preserves legacy /api/products fallback branch for zero-downtime rollback',
  /fetch\(`\/api\/products\?\$\{params\.toString\(\)\}`\)/.test(shopGridCode)
);
check('Guard 5: db-fallback provides context-aware fallback message for browse vs search',
  dbFallbackCode.includes('query.trim()') &&
  dbFallbackCode.includes('Catalog browsing is')
);
check('Guard 5: HomeSearch guards handleQuickAddToCart with stock check',
  /isOutOfStock\s*=\s*suggestion\.inStock\s*===\s*false\s*\|\|\s*\(suggestion\.stock\s*!==\s*undefined\s*&&\s*suggestion\.stock\s*<=\s*0\)/.test(homeSearchCode)
);
check('Guard 5: HomeSearch guards handleQuickAddToCart against variant products',
  /hasVariants\s*=\s*Boolean\(\s*suggestion\.hasVariants/.test(homeSearchCode) &&
  /router\.push\(`\/products\/\$\{suggestion\.slug\}`\)/.test(homeSearchCode)
);
check('Guard 5: suggestions API route projects hasVariants, inStock, and stock',
  suggestionsRouteCode.includes("'hasVariants'") &&
  suggestionsRouteCode.includes("'inStock'") &&
  suggestionsRouteCode.includes("'stock'")
);

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ Registration & Package Scripts
// ─────────────────────────────────────────────────────────────────────────────
check('Package: qa:search-contract script is registered in package.json', pkg.scripts?.['qa:search-contract'] === 'node scripts/search-architecture-contract-audit.mjs');
check('Package: audit:shop-release includes qa:search-contract', pkg.scripts?.['audit:shop-release']?.includes('qa:search-contract'));

// ─────────────────────────────────────────────────────────────────────────────
// Output Results
// ─────────────────────────────────────────────────────────────────────────────
const passed = checks.filter((c) => c.passed).length;
const failed = checks.length - passed;

console.log('\n================================================================');
console.log('🔍 SEARCH ARCHITECTURE & CATALOG OVERHAUL CONTRACT AUDIT');
console.log('================================================================\n');

for (const item of checks) {
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}${item.evidence ? ` — ${item.evidence}` : ''}`);
}

console.log(`\nAudit Summary: ${passed}/${checks.length} checks passed.`);

if (failed > 0) {
  console.error(`\n❌ FAILED: ${failed} architectural contract check(s) violated!`);
  process.exit(1);
} else {
  console.log('\n🎉 SUCCESS: All 5 architectural guards passed with 100% compliance across the repository!\n');
  process.exit(0);
}
