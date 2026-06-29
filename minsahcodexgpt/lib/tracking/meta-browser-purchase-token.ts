import 'server-only';
import crypto from 'node:crypto';

const TOKEN_VERSION = 'v1';
export const ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE = 'mb_online_bpt';
export const ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE_MAX_AGE_SECONDS = 15 * 60;
const DEFAULT_TTL_SECONDS = ONLINE_BROWSER_PURCHASE_TOKEN_COOKIE_MAX_AGE_SECONDS;

type BrowserPurchaseTokenPayload = {
  v: typeof TOKEN_VERSION;
  purpose: 'online_browser_purchase';
  orderId: string;
  exp: number;
};

function getSecret() {
  const secret =
    process.env.META_BROWSER_PURCHASE_TOKEN_SECRET?.trim() ||
    process.env.PAYMENT_WEBHOOK_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error('META_BROWSER_PURCHASE_TOKEN_SECRET or PAYMENT_WEBHOOK_SECRET is required');
  }

  return secret;
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(encodedPayload: string) {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createOnlineBrowserPurchaseToken(params: {
  orderId: string;
  ttlSeconds?: number;
}) {
  const payload: BrowserPurchaseTokenPayload = {
    v: TOKEN_VERSION,
    purpose: 'online_browser_purchase',
    orderId: params.orderId,
    exp: Math.floor(Date.now() / 1000) + (params.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyOnlineBrowserPurchaseToken(params: {
  token: string;
  orderId: string;
}) {
  const [encodedPayload, signature] = params.token.split('.');
  if (!encodedPayload || !signature) {
    return { ok: false as const, reason: 'INVALID_BROWSER_PURCHASE_TOKEN' };
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    return { ok: false as const, reason: 'INVALID_BROWSER_PURCHASE_TOKEN_SIGNATURE' };
  }

  let payload: BrowserPurchaseTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as BrowserPurchaseTokenPayload;
  } catch {
    return { ok: false as const, reason: 'INVALID_BROWSER_PURCHASE_TOKEN_PAYLOAD' };
  }

  if (payload.v !== TOKEN_VERSION || payload.purpose !== 'online_browser_purchase') {
    return { ok: false as const, reason: 'INVALID_BROWSER_PURCHASE_TOKEN_PURPOSE' };
  }

  if (payload.orderId !== params.orderId) {
    return { ok: false as const, reason: 'BROWSER_PURCHASE_TOKEN_ORDER_MISMATCH' };
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false as const, reason: 'BROWSER_PURCHASE_TOKEN_EXPIRED' };
  }

  return { ok: true as const };
}
