'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { NavButtonItem, NavButtonKey } from '@/types/navigation-config';

export interface ResolvedSmartButton {
  key: NavButtonKey;
  label: string;
  iconKey: NavButtonKey;
  iconType: 'system' | 'custom_svg';
  customSvg?: string;
  href?: string;
  onClick?: () => void;
  isActive: boolean;
  badgeCount?: number;
  isMiddleCart?: boolean;
}

const SHOP_PREFIXES = ['/shop', '/search', '/new-arrivals', '/for-you', '/recommendations', '/combos'];

export function useSmartNavButtons(
  configuredButtons: NavButtonItem[],
  wishlistCount = 0
): ResolvedSmartButton[] {
  const pathname = usePathname();
  const { user } = useAuth();
  const { items: cartItems } = useCart();
  const { openDrawer } = useCartDrawer();

  const totalCartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return useMemo(() => {
    // 1. Filter visible buttons and sort by order
    const visible = [...configuredButtons]
      .filter((b) => b.isVisible)
      .sort((a, b) => a.order - b.order);

    // 2. Identify and separate the key anchor buttons
    const homeShopConfig = visible.find((b) => b.key === 'home_shop');
    const cartDrawerConfig = visible.find((b) => b.key === 'cart_drawer');
    const accountConfig = visible.find((b) => b.key === 'account');

    // Remaining pool for slot 2 and slot 4
    const otherButtons = visible.filter(
      (b) => b.key !== 'home_shop' && b.key !== 'cart_drawer' && b.key !== 'account'
    );

    // 3. Resolve Slot 1: Dynamic Home ⟷ Shop Switcher
    const isOnHome = pathname === '/';
    const isOnShop = SHOP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    const slot1: ResolvedSmartButton = {
      key: 'home_shop',
      // If currently on Home -> prompt user to browse 'Shop'
      // If currently on Shop -> prompt user to return 'Home'
      label: isOnHome ? 'Shop' : isOnShop ? 'Home' : (homeShopConfig?.label || 'Shop'),
      iconKey: isOnHome ? 'search' : 'home_shop',
      iconType: homeShopConfig?.iconType || 'system',
      customSvg: homeShopConfig?.customSvg,
      href: isOnHome ? '/shop' : '/',
      isActive: isOnHome ? true : isOnShop ? true : false,
    };

    // 4. Resolve Slot 3: Fixed Middle Cart Drawer Anchor
    const slot3: ResolvedSmartButton = {
      key: 'cart_drawer',
      label: cartDrawerConfig?.label || 'Cart',
      iconKey: 'cart_drawer',
      iconType: cartDrawerConfig?.iconType || 'system',
      customSvg: cartDrawerConfig?.customSvg,
      onClick: () => {
        openDrawer();
      },
      isActive: false,
      badgeCount: totalCartQuantity,
      isMiddleCart: true,
    };

    // 5. Resolve Slot 5: Smart Account
    const isOnAccount = pathname.startsWith('/account');
    const slot5: ResolvedSmartButton = {
      key: 'account',
      label: user ? (accountConfig?.label || 'Account') : 'Sign In',
      iconKey: 'account',
      iconType: accountConfig?.iconType || 'system',
      customSvg: accountConfig?.customSvg,
      href: user ? '/account' : undefined,
      onClick: user
        ? undefined
        : () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('minsah:open-auth-modal', {
                  detail: { mode: 'signin' },
                })
              );
            }
          },
      isActive: isOnAccount,
    };

    // 6. Helper to resolve generic slot items
    const resolveGeneric = (item?: NavButtonItem): ResolvedSmartButton => {
      if (!item) {
        return {
          key: 'categories',
          label: 'Categories',
          iconKey: 'categories',
          iconType: 'system',
          href: '/categories',
          isActive: pathname.startsWith('/categories'),
        };
      }

      let href = '/';
      let isActive = false;
      let badgeCount: number | undefined = undefined;

      switch (item.key) {
        case 'categories':
          href = '/categories';
          isActive = pathname.startsWith('/categories');
          break;
        case 'search':
          href = '/search';
          isActive = pathname.startsWith('/search');
          break;
        case 'offers':
          href = '/flash-sale';
          isActive = pathname.startsWith('/flash-sale') || pathname.startsWith('/offers');
          break;
        case 'wishlist':
          href = '/wishlist';
          isActive = pathname.startsWith('/wishlist');
          badgeCount = wishlistCount;
          break;
        case 'notifications':
          href = user ? '/account/orders' : '/track';
          isActive = pathname.startsWith('/track');
          break;
        case 'recent':
          href = '/recently-viewed';
          isActive = pathname.startsWith('/recently-viewed');
          break;
        default:
          href = '/';
          isActive = pathname === '/';
      }

      return {
        key: item.key,
        label: item.label,
        iconKey: item.key,
        iconType: item.iconType,
        customSvg: item.customSvg,
        href,
        isActive,
        badgeCount,
      };
    };

    // 7. Resolve Slot 2 and Slot 4 from the remaining pool
    const slot2 = resolveGeneric(otherButtons[0] || { key: 'categories', label: 'Categories', iconType: 'system', isVisible: true, order: 2 });
    const slot4 = resolveGeneric(otherButtons[1] || { key: 'notifications', label: 'Updates', iconType: 'system', isVisible: true, order: 4 });

    // Return the guaranteed exactly 5-button layout: [Slot 1, Slot 2, Slot 3 (Center Cart), Slot 4, Slot 5 (Account)]
    return [slot1, slot2, slot3, slot4, slot5];
  }, [configuredButtons, pathname, totalCartQuantity, user, wishlistCount, openDrawer]);
}

