#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const exists = (file) => fs.existsSync(path.join(root, file));
const add = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });
const includes = (file, token) => read(file).includes(token);
const regex = (file, pattern) => pattern.test(read(file));

const grid = 'app/components/shop/ShopGrid.tsx';
const activeFilters = 'app/components/shop/ActiveFilters.tsx';
const searchBar = 'app/components/shop/ShopSearchBar.tsx';
const skeleton = 'app/components/shop/ProductGridSkeleton.tsx';
const merchandising = 'app/components/shop/ShopMerchandisingSections.tsx';
const pkg = JSON.parse(read('package.json'));
const release = pkg.scripts?.['audit:shop-release'] || '';

add('ShopFeedbackCard component exists', exists('app/components/shop/ShopFeedbackCard.tsx'));
add('ShopEmptyState component exists', exists('app/components/shop/ShopEmptyState.tsx'));
add('ShopErrorState component exists', exists('app/components/shop/ShopErrorState.tsx'));
add('ShopMerchandisingFallback component exists', exists('app/components/shop/ShopMerchandisingFallback.tsx'));
add('ShopGrid imports contextual empty/error state components', includes(grid, './ShopEmptyState') && includes(grid, './ShopErrorState'));
add('legacy inline no-products emoji block removed', !includes(grid, '&#128269;') && !includes(grid, 'No products found for'));
add('empty state supports spell suggestion recovery', includes('app/components/shop/ShopEmptyState.tsx', 'onApplySpellSuggestion') && includes('app/components/shop/ShopEmptyState.tsx', 'Search “{spellSuggestion}”'));
add('empty state supports clear search and clear filters', includes('app/components/shop/ShopEmptyState.tsx', 'Clear search') && includes('app/components/shop/ShopEmptyState.tsx', 'Clear filters'));
add('empty state includes recovery links', includes('app/components/shop/ShopEmptyState.tsx', '/shop?sort=best-selling') && includes('app/components/shop/ShopEmptyState.tsx', '/shop?sort=biggest-discount'));
add('error state retries without full page reload', includes(grid, 'retryNonce') && includes('app/components/shop/ShopErrorState.tsx', 'Retry loading') && !includes(grid, 'window.location.reload'));
add('error state copy is checkout-safe', includes('app/components/shop/ShopErrorState.tsx', 'No checkout action was taken'));
add('feedback cards use aria-live status/alert semantics', includes('app/components/shop/ShopFeedbackCard.tsx', 'aria-live') && includes('app/components/shop/ShopFeedbackCard.tsx', 'role={tone ==='));
add('active filter clear-all is tap-target safe', includes(activeFilters, 'min-h-11') && includes(activeFilters, 'Clear all active shop filters'));
add('active filter chips are tap-target improved', includes(activeFilters, 'inline-flex min-h-10'));
add('search clear and submit controls are 44px-safe', includes(searchBar, 'min-h-11 min-w-11') && includes(searchBar, 'min-h-11 flex-shrink-0'));
add('search suggestions have no-suggestion microcopy', includes(searchBar, 'No quick suggestions yet. Press Search'));
add('search no-suggestion state is announced politely', includes(searchBar, 'role="status"') && includes(searchBar, 'aria-live="polite"'));
add('product skeleton respects reduced motion', includes(skeleton, 'motion-reduce:animate-none'));
add('merchandising loading skeleton respects reduced motion', includes(merchandising, 'motion-reduce:animate-none'));
add('merchandising error/empty fallback is rendered', includes(merchandising, 'ShopMerchandisingFallback') && includes(merchandising, "status === 'error'"));
add('merchandising fallback has recovery links', includes('app/components/shop/ShopMerchandisingFallback.tsx', '/shop?sort=best-selling') && includes('app/components/shop/ShopMerchandisingFallback.tsx', '/shop?sort=newest'));
add('shop polish QA script is registered', pkg.scripts?.['qa:shop-polish'] === 'node scripts/shop-polish-audit.mjs');
add('shop release gate includes shop polish audit', release.includes('qa:shop-polish'));

const passed = checks.filter((check) => check.pass).length;
for (const check of checks) {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}
console.log(`\nShop polish audit: ${passed}/${checks.length} checks passed`);

if (passed !== checks.length) process.exit(1);
