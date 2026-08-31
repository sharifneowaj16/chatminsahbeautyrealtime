import prisma from '@/lib/prisma';
import {
  DEFAULT_DELIVERY_MESSAGE_CONFIG,
  type DeliveryMessageConfig,
  type DeliveryMessageItemConfig,
  type DeliveryMessageResponse,
} from './types';
import { selectCanonicalDeliveryMessage } from './resolver';

export const DELIVERY_MESSAGE_CONFIG_KEY = 'deliveryMessageConfig';
export const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function isValidHexColor(color: unknown): color is string {
  return typeof color === 'string' && HEX_COLOR_REGEX.test(color.trim());
}

function normalizeItem(raw: any, fallback: DeliveryMessageItemConfig): DeliveryMessageItemConfig {
  if (!raw || typeof raw !== 'object') return fallback;

  const text =
    typeof raw.text === 'string' && raw.text.trim()
      ? raw.text.trim()
      : typeof raw.messageText === 'string' && raw.messageText.trim()
      ? raw.messageText.trim()
      : fallback.text;

  const rawBg =
    typeof raw.backgroundColor === 'string' && raw.backgroundColor.trim()
      ? raw.backgroundColor.trim()
      : typeof raw.bgColor === 'string' && raw.bgColor.trim()
      ? raw.bgColor.trim()
      : fallback.backgroundColor;

  const backgroundColor = isValidHexColor(rawBg) ? rawBg : fallback.backgroundColor;

  const rawTextColor =
    typeof raw.textColor === 'string' && raw.textColor.trim()
      ? raw.textColor.trim()
      : fallback.textColor;

  const textColor = isValidHexColor(rawTextColor) ? rawTextColor : fallback.textColor;

  const active =
    typeof raw.active === 'boolean'
      ? raw.active
      : typeof raw.enabled === 'boolean'
      ? raw.enabled
      : fallback.active;

  return {
    text,
    backgroundColor,
    textColor,
    active,
    messageText: text,
    bgColor: backgroundColor,
    enabled: active,
    ctaText: typeof raw.ctaText === 'string' ? raw.ctaText : fallback.ctaText,
    ctaHref: typeof raw.ctaHref === 'string' ? raw.ctaHref : fallback.ctaHref,
  };
}

export function normalizeDeliveryMessageConfig(raw: unknown): DeliveryMessageConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_DELIVERY_MESSAGE_CONFIG;

  const obj = raw as Record<string, any>;
  const messages = obj.messages || {};

  const message1 = normalizeItem(
    obj.message1 || messages.productFreeDelivery,
    DEFAULT_DELIVERY_MESSAGE_CONFIG.message1
  );
  const message2 = normalizeItem(
    obj.message2 || messages.newCustomer,
    DEFAULT_DELIVERY_MESSAGE_CONFIG.message2
  );
  const message3 = normalizeItem(
    obj.message3 || messages.returningCustomer,
    DEFAULT_DELIVERY_MESSAGE_CONFIG.message3
  );

  const enabled =
    typeof obj.enabled === 'boolean'
      ? obj.enabled
      : DEFAULT_DELIVERY_MESSAGE_CONFIG.enabled;

  const height =
    typeof obj.height === 'string' && obj.height.trim()
      ? obj.height.trim()
      : DEFAULT_DELIVERY_MESSAGE_CONFIG.height;

  return {
    enabled,
    height,
    message1,
    message2,
    message3,
    messages: {
      productFreeDelivery: message1,
      newCustomer: message2,
      returningCustomer: message3,
    },
  };
}

export async function getDeliveryMessageConfig(): Promise<DeliveryMessageConfig> {
  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: DELIVERY_MESSAGE_CONFIG_KEY },
    });
    return normalizeDeliveryMessageConfig(record?.value);
  } catch (error) {
    console.error('Failed to load delivery message config from SiteConfig:', error);
    return DEFAULT_DELIVERY_MESSAGE_CONFIG;
  }
}

/**
 * Unified delegate to the canonical resolver function.
 */
export function selectDeliveryMessage(params: {
  isFreeDelivery: boolean;
  completedOrdersCount?: number;
  config?: DeliveryMessageConfig;
}): DeliveryMessageResponse | null {
  return selectCanonicalDeliveryMessage({
    isFreeDelivery: params.isFreeDelivery,
    completedOrdersCount: params.completedOrdersCount ?? 0,
    config: params.config,
  });
}
