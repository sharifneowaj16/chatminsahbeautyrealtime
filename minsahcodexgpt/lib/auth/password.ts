import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

// Precomputed dummy hash for constant-time comparison when user does not exist
const DUMMY_BCRYPT_HASH =
  '$2a$12$C6UzMDM.H6dfI/f/IKxGhu6p1iL9D3e3y8xW2u1rH2pY9f9K3J7kG';

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  '00000000',
  '11111111',
  'qwerty123',
  'qwertyui',
  'admin123',
  'letmein1',
  'welcome1',
  'iloveyou',
  'bangladesh',
  'minsah123',
  'minsahbeauty',
]);

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Always executes bcrypt comparison (even when hash is missing) to prevent
 * timing-based account enumeration.
 */
export async function verifyPasswordTimingSafe(
  password: string,
  hashedPassword: string | null | undefined
): Promise<boolean> {
  const targetHash = hashedPassword || DUMMY_BCRYPT_HASH;
  const matched = await bcrypt.compare(password, targetHash).catch(() => false);
  return Boolean(hashedPassword) && matched;
}

/**
 * Modern NIST-aligned password validation:
 * - Minimum 8 characters, maximum 128 characters
 * - Blocks common breached passwords and repeated single-character strings
 * - Mobile-friendly: no forced special characters or arbitrary composition hoops
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
    };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }

  const lowered = password.trim().toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(lowered) || /^(.)\1+$/.test(lowered)) {
    errors.push('This password is too easy to guess. Please choose a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function randomChar(chars: string): string {
  return chars.charAt(crypto.randomInt(0, chars.length));
}

export function generateSecurePassword(length: number = 16): string {
  const safeLength = Math.max(length, 8);
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = lowercase + uppercase + numbers + special;

  const chars: string[] = [
    randomChar(lowercase),
    randomChar(uppercase),
    randomChar(numbers),
    randomChar(special),
  ];

  for (let i = chars.length; i < safeLength; i++) {
    chars.push(randomChar(allChars));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const charI = chars[i];
    const charJ = chars[j];
    if (charI !== undefined && charJ !== undefined) {
      chars[i] = charJ;
      chars[j] = charI;
    }
  }

  return chars.join('');
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}
