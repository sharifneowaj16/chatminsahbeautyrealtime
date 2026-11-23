import prisma from '@/lib/prisma';
import { getCustomerSession } from '@/lib/auth/session';

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  role: 'customer' | 'vip' | 'premium';
  status: string;
  emailVerified: boolean;
  loyaltyPoints: number;
  referralCode: string | null;
  preferences: {
    newsletter: boolean;
    smsNotifications: boolean;
    promotions: boolean;
    newProducts: boolean;
    orderUpdates: boolean;
  };
}

/**
 * Server-side Single Source of Truth user lookup (unified NextAuth session).
 */
export async function getCurrentUser(): Promise<User | null> {
  const sessionUser = await getCustomerSession();
  if (!sessionUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      role: true,
      status: true,
      emailVerified: true,
      loyaltyPoints: true,
      referralCode: true,
      newsletter: true,
      smsNotifications: true,
      promotions: true,
      newProducts: true,
      orderUpdates: true,
    },
  });

  if (!dbUser || dbUser.status !== 'ACTIVE') return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    phone: dbUser.phone,
    avatar: dbUser.avatar,
    role: dbUser.role.toLowerCase() as 'customer' | 'vip' | 'premium',
    status: dbUser.status.toLowerCase(),
    emailVerified: !!dbUser.emailVerified,
    loyaltyPoints: dbUser.loyaltyPoints,
    referralCode: dbUser.referralCode,
    preferences: {
      newsletter: dbUser.newsletter,
      smsNotifications: dbUser.smsNotifications,
      promotions: dbUser.promotions,
      newProducts: dbUser.newProducts,
      orderUpdates: dbUser.orderUpdates,
    },
  };
}

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;

  const rolePermissions: Record<string, string[]> = {
    customer: [
      'browse_products',
      'view_products',
      'add_to_cart',
      'purchase_products',
      'write_reviews',
      'manage_profile',
      'manage_addresses',
      'manage_wishlist',
      'view_orders',
      'track_orders',
    ],
    vip: [
      'browse_products',
      'view_products',
      'add_to_cart',
      'purchase_products',
      'write_reviews',
      'manage_profile',
      'manage_addresses',
      'manage_wishlist',
      'view_orders',
      'track_orders',
      'exclusive_deals',
      'early_access',
      'free_shipping',
      'priority_support',
    ],
    premium: [
      'browse_products',
      'view_products',
      'add_to_cart',
      'purchase_products',
      'write_reviews',
      'manage_profile',
      'manage_addresses',
      'manage_wishlist',
      'view_orders',
      'track_orders',
      'exclusive_deals',
      'early_access',
      'free_shipping',
      'priority_support',
      'personal_stylist',
      'birthday_rewards',
      'anniversary_rewards',
    ],
  };

  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(permission);
}

export function getUserPermissions(user: User | null) {
  return {
    canBrowseProducts: hasPermission(user, 'browse_products'),
    canViewProducts: hasPermission(user, 'view_products'),
    canAddToCart: hasPermission(user, 'add_to_cart'),
    canPurchase: hasPermission(user, 'purchase_products'),
    canWriteReviews: hasPermission(user, 'write_reviews'),
    canManageProfile: hasPermission(user, 'manage_profile'),
    canManageAddresses: hasPermission(user, 'manage_addresses'),
    canManageWishlist: hasPermission(user, 'manage_wishlist'),
    canViewOrders: hasPermission(user, 'view_orders'),
    canTrackOrders: hasPermission(user, 'track_orders'),
    hasExclusiveDeals: hasPermission(user, 'exclusive_deals'),
    hasEarlyAccess: hasPermission(user, 'early_access'),
    hasFreeShipping: hasPermission(user, 'free_shipping'),
    hasPrioritySupport: hasPermission(user, 'priority_support'),
    hasPersonalStylist: hasPermission(user, 'personal_stylist'),
    hasBirthdayRewards: hasPermission(user, 'birthday_rewards'),
    hasAnniversaryRewards: hasPermission(user, 'anniversary_rewards'),
    isVip: user?.role === 'vip' || user?.role === 'premium',
    isPremium: user?.role === 'premium',
  };
}
