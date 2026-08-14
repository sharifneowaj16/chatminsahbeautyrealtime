export const primaryNavigationItems = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/categories', label: 'Categories' },
  { href: '/brands', label: 'Brands' },
  { href: '/flash-sale', label: 'Offers' },
] as const;

export const mobileNavigationItems = [
  { key: 'home', href: '/', label: 'Home', icon: 'home' },
  { key: 'shop', href: '/shop', label: 'Shop', icon: 'search' },
  { key: 'wishlist', href: '/wishlist', label: 'Wishlist', icon: 'heart' },
  { key: 'cart', href: '/cart', label: 'Cart', icon: 'cart' },
  { key: 'account', href: '/account', label: 'Account', icon: 'user' },
] as const;

const SHOP_ACTIVE_PREFIXES = [
  '/shop',
  '/search',
  '/new-arrivals',
  '/for-you',
  '/recommendations',
  '/combos',
] as const;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPrimaryNavigationItemActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/shop') return SHOP_ACTIVE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
  return matchesPrefix(pathname, href);
}

export function isMobileNavigationItemActive(pathname: string, key: string, href: string) {
  if (key === 'home') return pathname === '/';
  if (key === 'shop') return SHOP_ACTIVE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
  if (key === 'wishlist') {
    return matchesPrefix(pathname, '/wishlist') || pathname === '/favourites';
  }
  if (key === 'account') return matchesPrefix(pathname, '/account');
  return matchesPrefix(pathname, href);
}
