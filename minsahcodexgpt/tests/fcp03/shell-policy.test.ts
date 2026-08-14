import assert from 'node:assert/strict';
import test from 'node:test';
import { documentedShellPolicies, getShellPolicy } from '../../components/layout/shell-policy';
import {
  isMobileNavigationItemActive,
  isPrimaryNavigationItemActive,
  mobileNavigationItems,
  primaryNavigationItems,
} from '../../components/navigation/navigation-config';

test('storefront routes use the unified public shell', () => {
  for (const pathname of ['/', '/shop', '/categories/skincare', '/cart', '/wishlist', '/about']) {
    const policy = getShellPolicy(pathname);
    assert.equal(policy.family, 'storefront');
    assert.equal(policy.owner, 'storefront-layout');
    assert.equal(policy.showSiteHeader, true);
    assert.equal(policy.showSiteFooter, true);
    assert.equal(policy.showBottomNavigation, true);
  }
});

test('product detail owns its product header and sticky CTA without a second mobile nav', () => {
  const policy = getShellPolicy('/products/brightening-serum');
  assert.equal(policy.family, 'product');
  assert.equal(policy.showSiteHeader, false);
  assert.equal(policy.showSiteFooter, true);
  assert.equal(policy.showBottomNavigation, false);
  assert.equal(policy.showFloatingActions, false);
});

test('special route families remain outside the storefront shell', () => {
  const cases = [
    ['/account', 'account'],
    ['/checkout', 'checkout'],
    ['/checkout/payment/bkash', 'checkout'],
    ['/login', 'auth'],
    ['/reset-password/token', 'auth'],
    ['/gift/token', 'gift'],
    ['/admin/orders', 'admin'],
    ['/marketing/google', 'marketing'],
    ['/api/products', 'system'],
    ['/test', 'system'],
  ] as const;

  for (const [pathname, family] of cases) {
    const policy = getShellPolicy(pathname);
    assert.equal(policy.family, family);
    assert.equal(policy.showBottomNavigation, false);
  }
});

test('all documented route families have an explicit owner and shell decision', () => {
  for (const policy of Object.values(documentedShellPolicies)) {
    assert.ok(policy.owner);
    assert.equal(typeof policy.showSiteHeader, 'boolean');
    assert.equal(typeof policy.showSiteFooter, 'boolean');
    assert.equal(typeof policy.showBottomNavigation, 'boolean');
  }
});

test('mobile navigation contains at most five unique items', () => {
  assert.ok(mobileNavigationItems.length <= 5);
  assert.equal(new Set(mobileNavigationItems.map((item) => item.key)).size, mobileNavigationItems.length);
  assert.equal(new Set(mobileNavigationItems.map((item) => item.href)).size, mobileNavigationItems.length);
});

test('navigation active-state rules cover canonical catalog and wishlist aliases', () => {
  assert.equal(isPrimaryNavigationItemActive('/shop', '/shop'), true);
  assert.equal(isPrimaryNavigationItemActive('/recommendations', '/shop'), true);
  assert.equal(isMobileNavigationItemActive('/favourites', 'wishlist', '/wishlist'), true);
  assert.equal(isMobileNavigationItemActive('/account/orders', 'account', '/account'), true);
  assert.equal(primaryNavigationItems.length, 5);
});
