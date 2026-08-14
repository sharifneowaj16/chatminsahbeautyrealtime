import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const storefrontRoot = path.join('app', '(storefront)');
const targetRoutes = [
  'about', 'blog', 'brands', 'cart', 'categories', 'combos', 'contact', 'delete-data',
  'faq', 'favourites', 'flash-sale', 'for-you', 'new-arrivals', 'offers', 'privacy',
  'privacy-policy', 'products', 'recommendations', 'search', 'shop', 'track', 'wishlist',
];
const legacyFiles = [
  'app/components/Header.tsx',
  'app/components/HomeHeader.tsx',
  'app/components/Footer.tsx',
  'app/components/HomeBottomNav.tsx',
  'app/components/TopBar.tsx',
  'components/navigation/MobileBottomNav.tsx',
  'components/navigation/PublicBottomNavigation.tsx',
];

function sourceFiles(root: string): string[] {
  const output: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...sourceFiles(full));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) output.push(full);
  }
  return output;
}

test('storefront route group and AppShell are active', () => {
  assert.equal(fs.existsSync(path.join(storefrontRoot, 'layout.tsx')), true);
  assert.equal(fs.existsSync(path.join(storefrontRoot, 'page.tsx')), true);
  assert.equal(fs.existsSync('components/layout/AppShell.tsx'), true);

  for (const route of targetRoutes) {
    assert.equal(fs.existsSync(path.join(storefrontRoot, route)), true, `${route} must be in storefront group`);
    assert.equal(fs.existsSync(path.join('app', route)), false, `${route} must not remain at root`);
  }
});

test('legacy shell adapters and duplicate navigation owners are deleted', () => {
  for (const file of legacyFiles) {
    assert.equal(fs.existsSync(file), false, `${file} must be deleted`);
  }
});

test('AppShell is the only storefront owner of header, footer, bottom nav, skip target and main landmark', () => {
  const appShell = fs.readFileSync('components/layout/AppShell.tsx', 'utf8');
  assert.equal((appShell.match(/<SiteHeader\b/g) ?? []).length, 1);
  assert.equal((appShell.match(/<SiteFooter\b/g) ?? []).length, 1);
  assert.equal((appShell.match(/<BottomNavigation\b/g) ?? []).length, 1);
  assert.equal((appShell.match(/id="main-content"/g) ?? []).length, 1);
  assert.equal((appShell.match(/href="#main-content"/g) ?? []).length, 1);

  const files = [...sourceFiles(storefrontRoot), ...sourceFiles('components')]
    .filter((file) => file !== 'components/layout/AppShell.tsx');
  const forbidden = /<(?:SiteHeader|SiteFooter|BottomNavigation|HomeHeader|HomeBottomNav|MobileBottomNav|Footer|Navbar|TopBar)\b|id=["']main-content["']|<main\b/;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, forbidden, `manual shell ownership found in ${file}`);
  }
});

test('root layout owns providers only and storefront shell owns customer overlays', () => {
  const rootLayout = fs.readFileSync('app/layout.tsx', 'utf8');
  const appShell = fs.readFileSync('components/layout/AppShell.tsx', 'utf8');
  assert.doesNotMatch(rootLayout, /<CartDrawer\b|<SocialFloatingButtons\b|<BottomNavigation\b/);
  assert.match(appShell, /<CartDrawer\s*\/>/);
  assert.match(appShell, /<SocialFloatingButtons\s*\/>/);
});

test('safe-area and fixed-navigation geometry are centralized', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8');
  assert.match(css, /--minsah-site-header-height:/);
  assert.match(css, /--minsah-bottom-nav-height:/);
  assert.match(css, /--minsah-mobile-navigation-offset:/);
  assert.match(css, /\.minsah-shell-bottom-spacer/);
  assert.match(css, /\.minsah-fixed-action-above-navigation/);
});
