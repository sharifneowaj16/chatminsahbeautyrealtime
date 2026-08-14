#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
function read(path) { return fs.readFileSync(path, 'utf8'); }
function exists(path) { return fs.existsSync(path); }
function check(name, condition, evidence = '') {
  checks.push({ name, passed: Boolean(condition), evidence });
}

const filterDrawerPath = 'app/components/shop/ShopFilterDrawer.tsx';
const sortSheetPath = 'app/components/shop/ShopSortSheet.tsx';
const shopGridPath = 'app/components/shop/ShopGrid.tsx';
const shopPagePath = 'app/(storefront)/shop/page.tsx';
const trackingPath = 'lib/tracking/shop-events.ts';
const scrollLockPath = 'hooks/useBodyScrollLock.ts';
const backClosePath = 'hooks/useBackClose.ts';
const sortDropdownPath = 'app/components/shop/SortDropdown.tsx';
const cartDrawerPath = 'components/cart/CartDrawer.tsx';
const pkgPath = 'package.json';

const filterDrawer = exists(filterDrawerPath) ? read(filterDrawerPath) : '';
const sortSheet = exists(sortSheetPath) ? read(sortSheetPath) : '';
const shopGrid = read(shopGridPath);
const shopPage = read(shopPagePath);
const tracking = read(trackingPath);
const scrollLock = exists(scrollLockPath) ? read(scrollLockPath) : '';
const backClose = exists(backClosePath) ? read(backClosePath) : '';
const sortDropdown = read(sortDropdownPath);
const cartDrawer = read(cartDrawerPath);
const pkg = JSON.parse(read(pkgPath));

const publicSorts = ['featured', 'best-selling', 'newest', 'price-low-high', 'price-high-low', 'highest-rated', 'biggest-discount'];

check('ShopFilterDrawer.tsx exists', exists(filterDrawerPath), filterDrawerPath);
check('ShopSortSheet.tsx exists', exists(sortSheetPath), sortSheetPath);
check('Filter drawer imports Headless UI Dialog and Transition', /@headlessui\/react/.test(filterDrawer) && /Dialog/.test(filterDrawer) && /Transition/.test(filterDrawer), filterDrawerPath);
check('Sort sheet imports Headless UI Dialog and Transition', /@headlessui\/react/.test(sortSheet) && /Dialog/.test(sortSheet) && /Transition/.test(sortSheet), sortSheetPath);
check('openPanel state exists with filter/sort/null union', /type OpenShopPanel = ['"]filter['"] \| ['"]sort['"] \| null/.test(shopGrid) && /useState<OpenShopPanel>\(null\)/.test(shopGrid), shopGridPath);
check('Filter and sort sheets are conditionally mounted from openPanel', /openPanel === ['"]filter['"][\s\S]*<ShopFilterDrawer/.test(shopGrid) && /openPanel === ['"]sort['"][\s\S]*<ShopSortSheet/.test(shopGrid), shopGridPath);
check('Sort button does not open filter drawer', !/mobile_sticky_sort[\s\S]{0,160}setOpenPanel\(['"]filter['"]\)/.test(shopGrid) && !/mobile_sticky_sort[\s\S]{0,160}setIsFilterDrawerOpen/.test(shopGrid), shopGridPath);
check('Sort button opens sort panel through separate handler', /mobile_sticky_sort/.test(shopGrid) && /openSortPanel\(['"]mobile_sticky_sort['"]\)/.test(shopGrid), shopGridPath);
check('sort_open and filter_open are separate tracking events', /'sort_open'/.test(tracking) && /trackShopSortOpen/.test(tracking) && /pushShopEvent\(['"]sort_open['"]/.test(tracking) && /pushShopEvent\(['"]filter_open['"]/.test(tracking), trackingPath);
check('ShopGrid uses sort_open for mobile sort open', /trackShopSortOpen/.test(shopGrid) && /openSortPanel\(['"]mobile_sticky_sort['"]\)/.test(shopGrid), shopGridPath);
check('useBodyScrollLock hook exists and locks body/html overflow', exists(scrollLockPath) && /document\.body\.style\.overflow\s*=\s*['"]hidden['"]/.test(scrollLock) && /document\.documentElement\.style\.overflow\s*=\s*['"]hidden['"]/.test(scrollLock), scrollLockPath);
check('CartDrawer uses shared useBodyScrollLock', /useBodyScrollLock\(isOpen\)/.test(cartDrawer), cartDrawerPath);
check('useBackClose hook exists with simplified no-history-back close', exists(backClosePath) && /history\.pushState/.test(backClose) && /popstate/.test(backClose) && !/history\.back\(/.test(backClose), backClosePath);
check('Filter drawer uses scroll lock and back close hooks', /useBodyScrollLock\(open\)/.test(filterDrawer) && /useBackClose\(open, onClose, ['"]filter['"]\)/.test(filterDrawer), filterDrawerPath);
check('Sort sheet uses scroll lock and back close hooks', /useBodyScrollLock\(open\)/.test(sortSheet) && /useBackClose\(open, onClose, ['"]sort['"]\)/.test(sortSheet), sortSheetPath);
check('Safe-area padding exists in filter drawer footer', /pb-\[calc\(env\(safe-area-inset-bottom\)\+1rem\)\]/.test(shopGrid), shopGridPath);
check('Safe-area padding exists in sort sheet footer', /pb-\[calc\(env\(safe-area-inset-bottom\)\+1rem\)\]/.test(sortSheet), sortSheetPath);
check('ShopSortSheet exposes only public sort values through passed options', publicSorts.every((sort) => shopGrid.includes(`id: '${sort}'`)) && !/a-z|z-a/.test(sortSheet), 'ShopGrid + ShopSortSheet');
check('SortDropdown cleaned of a-z/z-a options', !/value:\s*['"]a-z['"]/.test(sortDropdown) && !/value:\s*['"]z-a['"]/.test(sortDropdown), sortDropdownPath);
check('sort_apply stores public sort key only from updateUrlFilters', /trackShopSortApply\(value(?:,|\))/.test(shopGrid) && /ensurePublicSort\(sortValue\)/.test(tracking) && /sort_value:\s*ensurePublicSort\(sortValue\)/.test(tracking), 'ShopGrid + shop-events');
check('Mobile sticky header is consolidated: shop page sticky is desktop-only', /md:sticky md:top-0/.test(shopPage) && !/className="sticky top-0 z-40/.test(shopPage), shopPagePath);
check('Mobile consolidated sticky controls include search, filter, and sort in one container', /sticky top-0[\s\S]*<ShopSearchBar \/>[\s\S]*mobile_sticky_filter[\s\S]*mobile_sticky_sort/.test(shopGrid), shopGridPath);
check('Old mobile top-36 stacked sticky bar removed', !/sticky top-36/.test(shopGrid), shopGridPath);
check('audit:shop-release includes qa:shop-mobile-ux', String(pkg.scripts?.['audit:shop-release'] || '').includes('npm run qa:shop-mobile-ux'), pkgPath);
check('package.json exposes qa:shop-mobile-ux command', pkg.scripts?.['qa:shop-mobile-ux'] === 'node scripts/shop-mobile-ux-audit.mjs', pkgPath);

const passed = checks.filter((item) => item.passed).length;
const failed = checks.length - passed;
for (const item of checks) {
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}${item.evidence ? ` — ${item.evidence}` : ''}`);
}
console.log(`\nShop mobile UX audit: ${passed}/${checks.length} checks passed`);
if (failed > 0) process.exit(1);
