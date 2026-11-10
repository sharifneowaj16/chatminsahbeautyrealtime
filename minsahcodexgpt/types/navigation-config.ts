export type NavBarStyleId = 'style-05' | 'style-09' | 'style-10';

export type SearchBarStyleId = 'style-01' | 'style-03' | 'style-07';

export type NavButtonKey =
  | 'home_shop'
  | 'categories'
  | 'cart_drawer'
  | 'search'
  | 'offers'
  | 'recent'
  | 'account'
  | 'notifications'
  | 'wishlist';

export interface NavButtonItem {
  key: NavButtonKey;
  label: string;
  iconType: 'system' | 'custom_svg';
  customSvg?: string;
  isVisible: boolean;
  order: number;
}

export interface MobileHeaderConfig {
  showLogo: boolean;
  showDeliverTo: boolean;
  showWishlist: boolean;
  showCart: boolean;
  showAccount: boolean;
  showMenu: boolean;
}

export const DEFAULT_MOBILE_HEADER_CONFIG: MobileHeaderConfig = {
  showLogo: true,
  showDeliverTo: true,
  showWishlist: false,
  showCart: true,
  showAccount: false,
  showMenu: true,
};

export interface MobileNavigationConfig {
  navBarStyle: NavBarStyleId;
  searchBarStyle: SearchBarStyleId;
  buttons: NavButtonItem[];
  mobileHeader?: MobileHeaderConfig;
  updatedAt: string;
}

export const DEFAULT_NAV_BUTTONS: NavButtonItem[] = [
  {
    key: 'home_shop',
    label: 'Home',
    iconType: 'system',
    isVisible: true,
    order: 1,
  },
  {
    key: 'categories',
    label: 'Categories',
    iconType: 'system',
    isVisible: true,
    order: 2,
  },
  {
    key: 'cart_drawer',
    label: 'Cart',
    iconType: 'system',
    isVisible: true,
    order: 3,
  },
  {
    key: 'notifications',
    label: 'Updates',
    iconType: 'system',
    isVisible: true,
    order: 4,
  },
  {
    key: 'account',
    label: 'Account',
    iconType: 'system',
    isVisible: true,
    order: 5,
  },
];

export const ALL_AVAILABLE_BUTTONS: { key: NavButtonKey; defaultLabel: string; description: string }[] = [
  { key: 'home_shop', defaultLabel: 'Home / Shop', description: 'Smart toggle: on Home shows Shop, on Shop shows Home' },
  { key: 'categories', defaultLabel: 'Categories', description: 'Opens categories catalog or category rail' },
  { key: 'cart_drawer', defaultLabel: 'Cart', description: 'Fixed middle anchor: opens Cart Drawer with live item count' },
  { key: 'search', defaultLabel: 'Search', description: 'Opens instant search overlay' },
  { key: 'offers', defaultLabel: 'Offers', description: 'Links to flash sales and seasonal offers' },
  { key: 'recent', defaultLabel: 'Recent', description: 'Quick view of recently browsed beauty items' },
  { key: 'wishlist', defaultLabel: 'Wishlist', description: 'Saved favorite items' },
  { key: 'notifications', defaultLabel: 'Updates', description: 'Order delivery updates and customer notifications' },
  { key: 'account', defaultLabel: 'Account', description: 'Smart Account: Guest triggers sign-in modal, Member opens dashboard' },
];

export const DEFAULT_MOBILE_NAV_CONFIG: MobileNavigationConfig = {
  navBarStyle: 'style-05',
  searchBarStyle: 'style-01',
  buttons: DEFAULT_NAV_BUTTONS,
  mobileHeader: DEFAULT_MOBILE_HEADER_CONFIG,
  updatedAt: new Date().toISOString(),
};

