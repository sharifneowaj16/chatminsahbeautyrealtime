#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => exists(file) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const add = (name, pass, evidence = '') => checks.push({ name, pass: Boolean(pass), evidence });

const gridPath = 'app/components/shop/ShopGrid.tsx';
const emptyPath = 'app/components/shop/ShopEmptyState.tsx';
const filterDrawerPath = 'app/components/shop/ShopFilterDrawer.tsx';
const sortSheetPath = 'app/components/shop/ShopSortSheet.tsx';
const swipeHookPath = 'hooks/useSwipeDownToClose.ts';
const playwrightConfigPath = 'playwright.config.ts';
const a11ySpecPath = 'tests/accessibility/shop-mobile.spec.ts';
const checklistPath = 'docs/qa/PHASE7B_MOBILE_RUNTIME_A11Y_CHECKLIST.md';
const reportPath = 'PHASE7B_MOBILE_DISCOVERY_RUNTIME_A11Y_REPORT.md';
const pkgPath = 'package.json';
const changesPath = 'CHANGES.md';

const grid = read(gridPath);
const empty = read(emptyPath);
const filterDrawer = read(filterDrawerPath);
const sortSheet = read(sortSheetPath);
const swipeHook = read(swipeHookPath);
const a11ySpec = read(a11ySpecPath);
const checklist = read(checklistPath);
const pkg = JSON.parse(read(pkgPath));
const release = String(pkg.scripts?.['audit:shop-release'] || '');

add('Brand search query state exists in ShopGrid', /brandSearchQuery/.test(grid), gridPath);
add('Filter drawer contains searchable brand input', /data-brand-search/.test(grid) && /Search brands/.test(grid) && /aria-label="Search brands inside filter drawer"/.test(grid), gridPath);
add('Brand search preserves selected brands above matches', /selectedSet/.test(grid) && /selected\s*=\s*brandOptions\.filter/.test(grid) && /return \[\.\.\.selected, \.\.\.matched\]/.test(grid), gridPath);
add('Brand no-match microcopy exists', /No brands matched/.test(grid), gridPath);
add('No-result recovery actions are built from active filter groups', /noResultRecoveryActions/.test(grid) && /Remove brand/.test(grid) && /Widen price/.test(grid) && /Reset sort/.test(grid), gridPath);
add('ShopEmptyState renders no-result recovery chips', /data-no-result-recovery-chips/.test(empty) && /Try removing one blocker/.test(empty), emptyPath);
add('ShopGrid passes recoveryActions into ShopEmptyState', /recoveryActions=\{noResultRecoveryActions\}/.test(grid), gridPath);
add('Popular quick discovery chips are derived from live category/brand facets', /popularDiscoveryChips/.test(grid) && /topCategory/.test(grid) && /topBrand/.test(grid), gridPath);
add('Quick discovery chips render with accessible labels', /data-shop-quick-discovery-chips/.test(grid) && /ariaLabel/.test(grid), gridPath);
add('Filter preview pending state exists', /filterPreviewPending/.test(grid) && /Updating results/.test(grid), gridPath);
add('Filter preview pending resets after fetch finally', /finally[\s\S]*setFilterPreviewPending\(false\)/.test(grid), gridPath);
add('Swipe-down close hook exists', exists(swipeHookPath) && /useSwipeDownToClose/.test(swipeHook) && /SWIPE_CLOSE_THRESHOLD_PX/.test(swipeHook), swipeHookPath);
add('Filter drawer uses swipe-down close hook', /useSwipeDownToClose\(open, onClose\)/.test(filterDrawer) && /data-swipe-close="filter"/.test(filterDrawer), filterDrawerPath);
add('Sort sheet uses swipe-down close hook', /useSwipeDownToClose\(open, onClose\)/.test(sortSheet) && /data-swipe-close="sort"/.test(sortSheet), sortSheetPath);
add('Filter drawer has touch swipe helper copy', /Swipe down to close/.test(filterDrawer), filterDrawerPath);
add('Playwright config exists for runtime accessibility', exists(playwrightConfigPath) && /tests\/accessibility/.test(read(playwrightConfigPath)) && /Pixel 5/.test(read(playwrightConfigPath)), playwrightConfigPath);
add('Playwright axe mobile spec exists', exists(a11ySpecPath) && /@axe-core\/playwright/.test(a11ySpec) && /filter drawer/.test(a11ySpec) && /sort sheet/.test(a11ySpec), a11ySpecPath);
add('Runtime a11y npm script exists', pkg.scripts?.['qa:shop-a11y-runtime'] === 'playwright test tests/accessibility/shop-mobile.spec.ts', pkgPath);
add('Playwright and axe dev dependencies are declared', Boolean(pkg.devDependencies?.['@playwright/test']) && Boolean(pkg.devDependencies?.['@axe-core/playwright']), pkgPath);
add('Manual small-phone QA checklist exists', exists(checklistPath) && /390/.test(checklist) && /Filter drawer/.test(checklist) && /Sort sheet/.test(checklist), checklistPath);
add('Phase 7B report exists', exists(reportPath), reportPath);
add('Phase 7B QA script is registered', pkg.scripts?.['qa:shop-phase7b'] === 'node scripts/shop-phase7b-audit.mjs', pkgPath);
add('Release gate includes Phase 7B audit', release.includes('npm run qa:shop-phase7b'), pkgPath);
add('CHANGES documents Phase 7B', /Phase 7B/.test(read(changesPath)), changesPath);

const passed = checks.filter((check) => check.pass).length;
for (const check of checks) {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}${check.evidence ? ` — ${check.evidence}` : ''}`);
}
console.log(`\nShop Phase 7B audit: ${passed}/${checks.length} checks passed`);

if (passed !== checks.length) process.exit(1);
