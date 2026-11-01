import 'server-only';
import crypto, { randomUUID } from 'node:crypto';

export const PRICE_QUOTE_TTL_SECONDS = 10 * 60; // 10 minutes per Master Spec Section 11.1

export type PriceQuoteItem = {
  productId: string;
  variantId?: string | null;
  lineKey?: string | null;
  name?: string;
  quantity: number;
  price: number;
  pricingSource?: string;
  campaignRef?: string | null;
};

export type PriceQuoteAddress = {
  pathaoCityId?: number | null;
  pathaoZoneId?: number | null;
  pathaoAreaId?: number | null;
  street1?: string | null;
  phoneNumber?: string | null;
};

export type PriceQuotePayload = {
  quoteId: string;
  userId: string;
  itemsHash: string;
  addressHash: string;
  couponCode: string | null;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  exp: number; // Unix timestamp in seconds
};

export type PriceQuoteVerifyContext = {
  userId: string;
  items: PriceQuoteItem[];
  address: PriceQuoteAddress;
  couponCode?: string | null;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
};

export type PriceQuoteVerifyResult =
  | { valid: true; quote: PriceQuotePayload }
  | { valid: false; reason: 'EXPIRED' | 'INVALID' | 'PAYLOAD_MISMATCH'; error: string };

function getSecret(): string {
  return (
    process.env.PRICE_QUOTE_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.PAYMENT_WEBHOOK_SECRET?.trim() ||
    'minsah-beauty-price-quote-salt-secret-2026'
  );
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function computePriceQuoteItemsHash(items: PriceQuoteItem[]): string {
  const canonicalItems = items
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId || '',
      lineKey: item.lineKey || '',
      quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
      price: parseFloat(Number(item.price).toFixed(2)),
      pricingSource: item.pricingSource || 'REGULAR',
      campaignRef: item.campaignRef || '',
    }))
    .sort((a, b) =>
      `${a.productId}:${a.variantId}:${a.lineKey}`.localeCompare(
        `${b.productId}:${b.variantId}:${b.lineKey}`,
      ),
    );

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalItems))
    .digest('hex');
}

export function computePriceQuoteAddressHash(address: PriceQuoteAddress): string {
  const canonicalAddress = {
    pathaoCityId: address.pathaoCityId ?? null,
    pathaoZoneId: address.pathaoZoneId ?? null,
    pathaoAreaId: address.pathaoAreaId ?? null,
    street1: (address.street1 || '').trim().toLowerCase(),
    phoneNumber: (address.phoneNumber || '').trim(),
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalAddress))
    .digest('hex');
}

/**
 * Creates a tamper-proof cryptographic Price Quote Token.
 * Bound to userId, items hash, address hash, totals, and an explicit 10-minute expiry window.
 */
export function createPriceQuoteToken(params: {
  userId: string;
  items: PriceQuoteItem[];
  address: PriceQuoteAddress;
  couponCode?: string | null;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  ttlSeconds?: number;
}): { token: string; payload: PriceQuotePayload } {
  const quoteId = `quote_${randomUUID().replace(/-/g, '')}`;
  const itemsHash = computePriceQuoteItemsHash(params.items);
  const addressHash = computePriceQuoteAddressHash(params.address);
  const exp =
    Math.floor(Date.now() / 1000) +
    (params.ttlSeconds ?? PRICE_QUOTE_TTL_SECONDS);

  const payload: PriceQuotePayload = {
    quoteId,
    userId: params.userId,
    itemsHash,
    addressHash,
    couponCode: params.couponCode ? params.couponCode.trim().toUpperCase() : null,
    subtotal: parseFloat(params.subtotal.toFixed(2)),
    discountAmount: parseFloat(params.discountAmount.toFixed(2)),
    shippingCost: parseFloat(params.shippingCost.toFixed(2)),
    total: parseFloat(params.total.toFixed(2)),
    exp,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  const token = `${encodedPayload}.${signature}`;

  return { token, payload };
}

/**
 * Verifies a priceQuoteToken against cryptographic signature and current order context.
 * Strict Replay & Modification Protection (Master Spec Section 11.1):
 * Any tamper with items, quantities, addresses, or total will fail verification.
 */
export function verifyPriceQuoteToken(
  token: string | null | undefined,
  context: PriceQuoteVerifyContext,
): PriceQuoteVerifyResult {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return {
      valid: false,
      reason: 'INVALID',
      error: 'Invalid or missing price quote token.',
    };
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return {
      valid: false,
      reason: 'INVALID',
      error: 'Malformed price quote token structure.',
    };
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    return {
      valid: false,
      reason: 'INVALID',
      error: 'Price quote signature verification failed. Quote has been tampered with.',
    };
  }

  let payload: PriceQuotePayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return {
      valid: false,
      reason: 'INVALID',
      error: 'Failed to decode price quote payload.',
    };
  }

  // 1. Expiration check (10-minute window)
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds > payload.exp) {
    return {
      valid: false,
      reason: 'EXPIRED',
      error: 'Price quote has expired. Please review and confirm the latest price.',
    };
  }

  // 2. User binding check
  if (payload.userId !== context.userId) {
    return {
      valid: false,
      reason: 'INVALID',
      error: 'Price quote does not belong to the authenticated user.',
    };
  }

  // 3. Items & Pricing binding check
  const currentItemsHash = computePriceQuoteItemsHash(context.items);
  if (payload.itemsHash !== currentItemsHash) {
    return {
      valid: false,
      reason: 'PAYLOAD_MISMATCH',
      error: 'Cart items, quantities, or prices changed since quote was generated.',
    };
  }

  // 4. Address binding check
  const currentAddressHash = computePriceQuoteAddressHash(context.address);
  if (payload.addressHash !== currentAddressHash) {
    return {
      valid: false,
      reason: 'PAYLOAD_MISMATCH',
      error: 'Shipping address was modified. Please re-confirm delivery charge and total.',
    };
  }

  // 5. Total payable check
  const currentTotal = parseFloat(context.total.toFixed(2));
  if (Math.abs(payload.total - currentTotal) > 0.01) {
    return {
      valid: false,
      reason: 'PAYLOAD_MISMATCH',
      error: 'Payable order total does not match quoted amount.',
    };
  }

  return { valid: true, quote: payload };
}
