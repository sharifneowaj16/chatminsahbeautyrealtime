export type ShellFamily =
  | 'storefront'
  | 'product'
  | 'account'
  | 'checkout'
  | 'auth'
  | 'gift'
  | 'admin'
  | 'marketing'
  | 'system';

export type ShellPolicy = Readonly<{
  family: ShellFamily;
  owner: 'storefront-layout' | 'special-route-layout' | 'root-layout';
  showSiteHeader: boolean;
  showSiteFooter: boolean;
  showBottomNavigation: boolean;
  showCartDrawer: boolean;
  showFloatingActions: boolean;
}>;

const POLICY: Record<ShellFamily, ShellPolicy> = {
  storefront: {
    family: 'storefront',
    owner: 'storefront-layout',
    showSiteHeader: true,
    showSiteFooter: true,
    showBottomNavigation: true,
    showCartDrawer: true,
    showFloatingActions: true,
  },
  product: {
    family: 'product',
    owner: 'storefront-layout',
    showSiteHeader: false,
    showSiteFooter: true,
    showBottomNavigation: false,
    showCartDrawer: true,
    showFloatingActions: false,
  },
  account: {
    family: 'account',
    owner: 'special-route-layout',
    showSiteHeader: false,
    showSiteFooter: false,
    showBottomNavigation: false,
    showCartDrawer: false,
    showFloatingActions: false,
  },
  checkout: {
    family: 'checkout',
    owner: 'special-route-layout',
    showSiteHeader: false,
    showSiteFooter: false,
    showBottomNavigation: false,
    showCartDrawer: false,
    showFloatingActions: false,
  },
  auth: {
    family: 'auth',
    owner: 'special-route-layout',
    showSiteHeader: false,
    showSiteFooter: false,
    showBottomNavigation: false,
    showCartDrawer: false,
    showFloatingActions: false,
  },
  gift: {
    family: 'gift',
    owner: 'special-route-layout',
    showSiteHeader: false,
    showSiteFooter: false,
    showBottomNavigation: false,
    showCartDrawer: false,
    showFloatingActions: false,
  },
  admin: {
    family: 'admin',
    owner: 'special-route-layout',
    showSiteHeader: false,
    showSiteFooter: false,
    showBottomNavigation: false,
    showCartDrawer: false,
    showFloatingActions: false,
  },
  marketing: {
    family: 'marketing',
    owner: 'special-route-layout',
    showSiteHeader: false,
    showSiteFooter: false,
    showBottomNavigation: false,
    showCartDrawer: false,
    showFloatingActions: false,
  },
  system: {
    family: 'system',
    owner: 'root-layout',
    showSiteHeader: false,
    showSiteFooter: false,
    showBottomNavigation: false,
    showCartDrawer: false,
    showFloatingActions: false,
  },
};

const AUTH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-otp',
  '/password-reset-success',
] as const;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getShellPolicy(pathname: string): ShellPolicy {
  if (matchesPrefix(pathname, '/products')) return POLICY.product;
  if (matchesPrefix(pathname, '/account')) return POLICY.account;
  if (matchesPrefix(pathname, '/checkout')) return POLICY.checkout;
  if (AUTH_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) return POLICY.auth;
  if (matchesPrefix(pathname, '/gift')) return POLICY.gift;
  if (matchesPrefix(pathname, '/admin')) return POLICY.admin;
  if (matchesPrefix(pathname, '/marketing')) return POLICY.marketing;
  if (matchesPrefix(pathname, '/api') || matchesPrefix(pathname, '/test')) return POLICY.system;
  return POLICY.storefront;
}

export const documentedShellPolicies = POLICY;
