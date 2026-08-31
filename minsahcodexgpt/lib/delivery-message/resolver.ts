import prisma from '@/lib/prisma';
import { isDeliveryOfferActive } from '@/lib/delivery-pricing';
import { normalizeBangladeshPhoneNumber } from '@/lib/phone';
import { getDeliveryMessageConfig } from './config';
import {
  DEFAULT_DELIVERY_MESSAGE_CONFIG,
  type DeliveryMessageConfig,
  type DeliveryMessageResponse,
} from './types';

export function getPhoneVariants(input: string | null | undefined): string[] {
  if (!input) return [];
  const cleaned = input.trim();
  const digits = cleaned.replace(/\D/g, '');
  if (!digits || digits.length < 10) return [cleaned];

  const variants = new Set<string>([cleaned]);
  if (digits.startsWith('880')) {
    variants.add(digits);
    variants.add('+' + digits);
    variants.add('0' + digits.slice(3));
  } else if (digits.startsWith('0')) {
    variants.add(digits);
    variants.add('88' + digits);
    variants.add('+88' + digits);
  } else {
    variants.add(digits);
    variants.add('0' + digits);
    variants.add('880' + digits);
    variants.add('+880' + digits);
  }

  const normalized = normalizeBangladeshPhoneNumber(cleaned);
  if (normalized) {
    variants.add(normalized);
    variants.add('88' + normalized);
    variants.add('+88' + normalized);
  }

  return Array.from(variants);
}

export async function checkProductFreeDelivery(params: {
  productId?: string | null;
  productSlug?: string | null;
  isFreeDelivery?: boolean | null;
}): Promise<boolean> {
  if (params.isFreeDelivery === true) {
    return true;
  }

  if (!params.productId && !params.productSlug) {
    return false;
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          ...(params.productId ? [{ id: params.productId }] : []),
          ...(params.productSlug ? [{ slug: params.productSlug }] : []),
        ],
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        deliveryOfferEnabled: true,
        deliveryOfferType: true,
        deliveryOfferAmount: true,
        deliveryOfferStartDate: true,
        deliveryOfferEndDate: true,
        deliveryOfferBadgeText: true,
      },
    });

    if (!product) return false;

    return isDeliveryOfferActive(product) && product.deliveryOfferType === 'FREE';
  } catch (error) {
    console.error('[delivery-message] Error checking product free delivery offer:', error);
    return false;
  }
}

/**
 * Pure Canonical Decision Tree for selecting delivery messages.
 * Single source of truth across frontend, backend, and API.
 */
export function selectCanonicalDeliveryMessage(params: {
  isFreeDelivery: boolean;
  completedOrdersCount: number;
  config?: DeliveryMessageConfig;
}): DeliveryMessageResponse | null {
  const cfg = params.config || DEFAULT_DELIVERY_MESSAGE_CONFIG;
  if (cfg.enabled === false) return null;

  // 1. Product Free Delivery (Priority 1)
  if (params.isFreeDelivery) {
    if (cfg.message1.active && cfg.message1.text?.trim()) {
      return {
        messageType: 'PRODUCT_FREE',
        messageText: cfg.message1.text,
        backgroundColor: cfg.message1.backgroundColor,
        textColor: cfg.message1.textColor,
        active: true,
      };
    }
    // If Message 1 is inactive, safely fall back to customer delivery rules below
  }

  // 2. Returning Customer (Priority 2)
  if (params.completedOrdersCount >= 1) {
    if (cfg.message3.active && cfg.message3.text?.trim()) {
      return {
        messageType: 'RETURNING_CUSTOMER',
        messageText: cfg.message3.text,
        backgroundColor: cfg.message3.backgroundColor,
        textColor: cfg.message3.textColor,
        active: true,
      };
    }
    // Fall back to Message 2 ONLY if Message 2 is active
    if (cfg.message2.active && cfg.message2.text?.trim()) {
      return {
        messageType: 'NEW_CUSTOMER',
        messageText: cfg.message2.text,
        backgroundColor: cfg.message2.backgroundColor,
        textColor: cfg.message2.textColor,
        active: true,
      };
    }
    return null;
  }

  // 3. New / Unknown Customer (Priority 3)
  if (cfg.message2.active && cfg.message2.text?.trim()) {
    return {
      messageType: 'NEW_CUSTOMER',
      messageText: cfg.message2.text,
      backgroundColor: cfg.message2.backgroundColor,
      textColor: cfg.message2.textColor,
      active: true,
    };
  }

  // All eligible messages are inactive -> return hidden/null
  return null;
}

/**
 * Resolves the delivery message by checking product data and customer order history.
 */
export async function resolveDeliveryMessage(params: {
  productId?: string | null;
  productSlug?: string | null;
  isFreeDelivery?: boolean | null;
  phone?: string | null;
  userId?: string | null;
}): Promise<DeliveryMessageResponse | null> {
  const config = await getDeliveryMessageConfig();

  // Check product free delivery
  const isProductFree = await checkProductFreeDelivery({
    productId: params.productId,
    productSlug: params.productSlug,
    isFreeDelivery: params.isFreeDelivery,
  });

  // Identify customer by phone
  let resolvedPhone = params.phone?.trim() || null;
  let resolvedUserId = params.userId?.trim() || null;

  if (!resolvedPhone && resolvedUserId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { phone: true },
      });
      if (user?.phone) {
        resolvedPhone = user.phone;
      }
    } catch (err) {
      console.warn('[delivery-message] Failed to fetch user phone:', err);
    }
  }

  let completedOrders = 0;
  if (resolvedPhone || resolvedUserId) {
    const phoneVariants = getPhoneVariants(resolvedPhone);
    const orFilters: any[] = [];

    if (resolvedUserId) {
      orFilters.push({ userId: resolvedUserId });
    }

    if (phoneVariants.length > 0) {
      orFilters.push(
        { shippingAddress: { phone: { in: phoneVariants } } },
        { user: { phone: { in: phoneVariants } } }
      );
    }

    if (orFilters.length > 0) {
      try {
        completedOrders = await prisma.order.count({
          where: {
            status: 'DELIVERED',
            OR: orFilters,
          },
        });
      } catch (error) {
        console.error('[delivery-message] Error counting customer delivered orders:', error);
        completedOrders = 0;
      }
    }
  }

  return selectCanonicalDeliveryMessage({
    isFreeDelivery: isProductFree,
    completedOrdersCount: completedOrders,
    config,
  });
}
