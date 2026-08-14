/**
 * Production payment/Purchase contract.
 *
 * This file remains dependency-free so API routes and audits can share the
 * same rules. Payment-method normalization and availability come from the
 * canonical registry in payment-methods.ts.
 */
import {
  getCanonicalOnlinePaymentMethods,
  isCanonicalOnlinePaymentMethod,
  isCodPaymentMethod,
  normalizeGatewayName,
  normalizePaymentMethod,
} from '@/lib/payments/payment-methods';
import { isPaidGatewayStatus } from '@/lib/orders/payment-lifecycle';

export const CANONICAL_PAYMENT_FLOW =
  '/api/orders -> verified payment/COD phone-confirmed -> tracking queue' as const;

export {
  getCanonicalOnlinePaymentMethods,
  isCanonicalOnlinePaymentMethod,
  isCodPaymentMethod,
  normalizeGatewayName,
  normalizePaymentMethod,
};

export function isPaidLikePaymentStatus(status?: string | null) {
  return isPaidGatewayStatus(status);
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
      message:
        'Order paymentMethod is missing; verified online payment cannot be recorded.',
    };
  }

  if (isCodPaymentMethod(paymentMethod)) {
    return {
      ok: false as const,
      code: 'COD_PAYMENT_CANNOT_USE_VERIFIED_ONLINE_FLOW',
      message:
        'COD Purchase must be created only by the phone-confirmed Server CAPI flow.',
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
