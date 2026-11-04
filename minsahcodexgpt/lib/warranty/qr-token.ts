import crypto from 'crypto';
import QRCode from 'qrcode';

export interface WarrantyTokenPayload {
  orderId: string;
  orderNumber: string;
  itemId?: string;
  createdAt?: number;
}

function getSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    'minsah-beauty-warranty-qr-secret-key-2026'
  );
}

function hmac(value: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(value)
    .digest('base64url')
    .slice(0, 16);
}

/**
 * Generates a compact, tamper-proof token for Order Slip + Warranty QR access.
 */
export function generateOrderWarrantyToken({
  orderId,
  orderNumber,
  itemId = 'all',
}: {
  orderId: string;
  orderNumber: string;
  itemId?: string;
}): string {
  const cleanOrderId = String(orderId || '').trim();
  const cleanOrderNumber = String(orderNumber || '').trim();
  const cleanItemId = String(itemId || 'all').trim();

  const payloadString = `${cleanOrderId}:${cleanOrderNumber}:${cleanItemId}`;
  const encodedPayload = Buffer.from(payloadString, 'utf-8').toString('base64url');
  const signature = hmac(payloadString);

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies a token and extracts orderId, orderNumber, and itemId.
 */
export function verifyOrderWarrantyToken(token: string): {
  valid: boolean;
  orderId?: string;
  orderNumber?: string;
  itemId?: string;
  error?: string;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is missing' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [encodedPayload, signature] = parts;

  try {
    const payloadString = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const expectedSignature = hmac(payloadString);

    // Constant-time comparison
    const sigBuffer = Buffer.from(signature, 'utf-8');
    const expectedSigBuffer = Buffer.from(expectedSignature, 'utf-8');

    if (
      sigBuffer.length !== expectedSigBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
    ) {
      return { valid: false, error: 'Invalid or tampered token' };
    }

    const [orderId, orderNumber, itemId] = payloadString.split(':');

    if (!orderId || !orderNumber) {
      return { valid: false, error: 'Token missing required order references' };
    }

    return {
      valid: true,
      orderId,
      orderNumber,
      itemId: itemId === 'all' ? undefined : itemId,
    };
  } catch (err) {
    return { valid: false, error: 'Failed to decode token payload' };
  }
}

/**
 * Returns the full scannable URL pointing to minsahbeauty.cloud/q/<token>
 */
export function getOrderWarrantyUrl(token: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://minsahbeauty.cloud').replace(/\/$/, '');
  return `${baseUrl}/q/${token}`;
}

/**
 * Generates base64 data URL for QR Code (Thermal-friendly, high-contrast, pure black/white)
 */
export async function generateQrDataUrl(text: string, size = 180): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: size,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

