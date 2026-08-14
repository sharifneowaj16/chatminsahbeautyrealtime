/**
 * Canonical checkout payment-method registry.
 *
 * Keep provider availability in one dependency-free module so API validation,
 * payment creation, footer/checkout UI, and release audits cannot drift.
 */
export const CHECKOUT_PAYMENT_METHODS = ['cod', 'bkash', 'nagad'] as const;
export const ONLINE_PAYMENT_METHODS = ['bkash', 'nagad'] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];
export type OnlinePaymentMethod = (typeof ONLINE_PAYMENT_METHODS)[number];

export type PaymentMethodConfig = {
  id: CheckoutPaymentMethod | 'rocket' | 'card';
  label: string;
  enabled: boolean;
  online: boolean;
  gateway: OnlinePaymentMethod | null;
};

export const PAYMENT_METHOD_CONFIG = {
  cod: {
    id: 'cod',
    label: 'Cash on Delivery',
    enabled: true,
    online: false,
    gateway: null,
  },
  bkash: {
    id: 'bkash',
    label: 'bKash',
    enabled: true,
    online: true,
    gateway: 'bkash',
  },
  nagad: {
    id: 'nagad',
    label: 'Nagad',
    enabled: true,
    online: true,
    gateway: 'nagad',
  },
  rocket: {
    id: 'rocket',
    label: 'Rocket',
    enabled: false,
    online: true,
    gateway: null,
  },
  card: {
    id: 'card',
    label: 'Card',
    enabled: false,
    online: true,
    gateway: null,
  },
} as const satisfies Record<string, PaymentMethodConfig>;

const CHECKOUT_PAYMENT_METHOD_SET = new Set<string>(CHECKOUT_PAYMENT_METHODS);
const ONLINE_PAYMENT_METHOD_SET = new Set<string>(ONLINE_PAYMENT_METHODS);
const COD_METHOD_PATTERNS = [
  'cod',
  'cash',
  'cash_on_delivery',
  'cash-on-delivery',
  'cash on delivery',
] as const;

export function normalizePaymentMethod(paymentMethod?: string | null) {
  return String(paymentMethod ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function normalizeGatewayName(gateway?: string | null) {
  return String(gateway ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function isCodPaymentMethod(paymentMethod?: string | null) {
  const normalized = normalizePaymentMethod(paymentMethod);
  return COD_METHOD_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function parseCanonicalOnlinePaymentMethod(
  paymentMethod?: string | null,
): OnlinePaymentMethod | null {
  const normalized = normalizePaymentMethod(paymentMethod);
  return ONLINE_PAYMENT_METHOD_SET.has(normalized)
    ? (normalized as OnlinePaymentMethod)
    : null;
}

export function parseSupportedCheckoutPaymentMethod(
  paymentMethod?: string | null,
): CheckoutPaymentMethod | null {
  const normalized = normalizePaymentMethod(paymentMethod);
  return CHECKOUT_PAYMENT_METHOD_SET.has(normalized)
    ? (normalized as CheckoutPaymentMethod)
    : null;
}

export function isCanonicalOnlinePaymentMethod(paymentMethod?: string | null) {
  return parseCanonicalOnlinePaymentMethod(paymentMethod) !== null;
}

export function isSupportedCheckoutPaymentMethod(paymentMethod?: string | null) {
  return parseSupportedCheckoutPaymentMethod(paymentMethod) !== null;
}

export function getCanonicalOnlinePaymentMethods(): OnlinePaymentMethod[] {
  return [...ONLINE_PAYMENT_METHODS];
}

export function getSupportedCheckoutPaymentMethods(): CheckoutPaymentMethod[] {
  return [...CHECKOUT_PAYMENT_METHODS];
}

export function getEnabledPaymentMethodConfigs(): PaymentMethodConfig[] {
  return Object.values(PAYMENT_METHOD_CONFIG)
    .filter((method) => method.enabled)
    .map((method) => ({
      id: method.id,
      label: method.label,
      enabled: method.enabled,
      online: method.online,
      gateway: method.gateway,
    }));
}

export function getEnabledPaymentMethodLabels(): string[] {
  return getEnabledPaymentMethodConfigs().map((method) => method.label);
}
