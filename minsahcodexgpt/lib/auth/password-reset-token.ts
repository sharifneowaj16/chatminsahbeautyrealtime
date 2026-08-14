import crypto from 'crypto';

const OTP_PREFIX = 'otp:';
const RESET_PREFIX = 'reset:';

function getPasswordResetSecret(): string {
  return (
    process.env.PASSWORD_RESET_TOKEN_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    'minsah-password-reset-development-fallback-secret'
  );
}

function hmac(value: string): string {
  return crypto
    .createHmac('sha256', getPasswordResetSecret())
    .update(value)
    .digest('hex');
}

export function normalizePasswordResetEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidPasswordResetEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generatePasswordResetOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashPasswordResetOtp(email: string, otp: string): string {
  const normalizedEmail = normalizePasswordResetEmail(email);
  return `${OTP_PREFIX}${hmac(`${normalizedEmail}:${otp}`)}`;
}

export function hashPasswordResetToken(token: string): string {
  return `${RESET_PREFIX}${hmac(token)}`;
}

export function isResetTokenShape(token: string): boolean {
  // crypto.randomBytes(32).toString('base64url') is normally 43 chars.
  // Keep this slightly flexible while still rejecting 6-digit OTP/plain JSON blobs.
  return /^[A-Za-z0-9_-]{40,96}$/.test(token);
}

export function isOtpTokenHash(tokenHash: string): boolean {
  return tokenHash.startsWith(OTP_PREFIX);
}

export function isResetTokenHash(tokenHash: string): boolean {
  return tokenHash.startsWith(RESET_PREFIX);
}
