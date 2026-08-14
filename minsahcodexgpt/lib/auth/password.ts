import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Use 12 rounds for secure password hashing
// This takes ~250ms on modern hardware, providing good security
const SALT_ROUNDS = 12;

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Validate password strength
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

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password',
    '12345678',
    'qwerty',
    'admin123',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master',
    'password123',
  ];

  if (commonPasswords.some((common) => password.toLowerCase().includes(common))) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a secure random password
 */
function randomChar(chars: string): string {
  return chars[crypto.randomInt(0, chars.length)];
}

/**
 * Generate a secure random password
 */
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

  // Fisher-Yates shuffle with crypto-backed indexes.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Generate a password reset token (high-entropy URL-safe string)
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a verification code (6 digits)
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}
