/**
 * Production payment/Purchase contract.
 *
 * This file is intentionally small and dependency-free so API routes and audits can
 * share the same rules. A payment can become a Meta/GA4 Purchase only through:
 * 1) COD phone-confirmed admin/Telegram flow, or
 * 2) verified online gateway flow (/api/payments/verified).
 */

export const CANONICAL_PAYMENT_FLOW = '/api/orders -> verified payment/COD phone-confirmed -> tracking queue' as const;

const COD_METHOD_PATTERNS = ['cod', 'cash', 'cash_on_delivery', 'cash-on-delivery', 'cash on delivery'];
const CANONICAL_ONLINE_PAYMENT_METHODS = new Set(['bkash', 'nagad']);
const PAID_STATUSES = new Set(['paid', 'completed', 'complete', 'success', 'successful', 'validated']);

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

export function isCanonicalOnlinePaymentMethod(paymentMethod?: string | null) {
  return CANONICAL_ONLINE_PAYMENT_METHODS.has(normalizePaymentMethod(paymentMethod));
}

export function isPaidLikePaymentStatus(status?: string | null) {
  return PAID_STATUSES.has(String(status ?? '').trim().toLowerCase());
}

export function getCanonicalOnlinePaymentMethods() {
  return [...CANONICAL_ONLINE_PAYMENT_METHODS];
}

export function validateVerifiedPaymentContract(params: {
  paymentMethod?: string | null;
  gateway?: string | null;
}) {
  const paymentMethod = normalizePaymentMethod(params.paymentMethod);
  const gateway = normalizeGatewayName(params.gateway);

  if (!paymentMethod) {
    return {
      ok: false as const,
      code: 'PAYMENT_METHOD_MISSING',
      message: 'Order paymentMethod is missing; verified online payment cannot be recorded.',
    };
  }

  if (isCodPaymentMethod(paymentMethod)) {
    return {
      ok: false as const,
      code: 'COD_PAYMENT_CANNOT_USE_VERIFIED_ONLINE_FLOW',
      message: 'COD Purchase must be created only by the phone-confirmed Server CAPI flow.',
    };
  }

  if (!isCanonicalOnlinePaymentMethod(paymentMethod)) {
    return {
      ok: false as const,
      code: 'UNSUPPORTED_ONLINE_PAYMENT_METHOD',
      message: `Unsupported online payment method "${paymentMethod}". Add a verified provider adapter before enabling it in production.`,
    };
  }

  if (!gateway) {
    return {
      ok: false as const,
      code: 'PAYMENT_GATEWAY_MISSING',
      message: 'Verified online payment payload must include gateway.',
    };
  }

  if (gateway !== paymentMethod) {
    return {
      ok: false as const,
      code: 'PAYMENT_GATEWAY_METHOD_MISMATCH',
      message: `Payment gateway "${gateway}" does not match order payment method "${paymentMethod}".`,
    };
  }

  return { ok: true as const };
}

export function getCanonicalPaymentContractErrorResponse(error: {
  code: string;
  message: string;
}) {
  return {
    success: false,
    code: error.code,
    error: error.message,
    requiredFlow: CANONICAL_PAYMENT_FLOW,
  };
}
