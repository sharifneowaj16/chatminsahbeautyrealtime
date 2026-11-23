import 'server-only';

import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { checkRateLimit, redis } from '@/lib/cache/redis';
import { normalizeBangladeshPhoneNumber } from '@/lib/phone';
import { isQsmsConfigured, sendQsmsMessage } from '@/lib/auth/qsms';

export type PhoneOtpPurpose = 'signin' | 'signup';

export const PHONE_OTP_CONFIG = {
  codeLength: 6,
  ttlSeconds: 5 * 60,
  resendCooldownSeconds: 60,
  maxAttemptsPerCode: 5,
  proofTtlSeconds: 120,
  hourlyPhoneMax: 5,
  dailyPhoneMax: 10,
  hourlyIpMax: 15,
  verifyWindowSeconds: 15 * 60,
  verifyMaxPerWindow: 12,
} as const;

export interface VerifiedOtpProofPayload {
  phone: string;
  purpose: PhoneOtpPurpose;
  fullName?: string;
  email?: string;
  verifiedAt: number;
}

// Local dev fallback store ONLY when Redis is not connected
const devMemoryProofStore = new Map<string, { payload: VerifiedOtpProofPayload; expiresAt: number }>();

function getOtpHmacSecret(): string {
  const secret =
    process.env.OTP_TOKEN_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();

  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('OTP_TOKEN_SECRET, NEXTAUTH_SECRET, or JWT_SECRET must be configured in production');
  }

  return 'dev-only-otp-hmac-secret-do-not-use-in-prod';
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hashPhoneOtp(
  normalizedPhone: string,
  purpose: PhoneOtpPurpose,
  code: string
): string {
  return crypto
    .createHmac('sha256', getOtpHmacSecret())
    .update(`phone-otp:${purpose}:${normalizedPhone}:${code}`)
    .digest('hex');
}

function constantTimeHexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function maskBangladeshPhone(normalizedPhone: string): string {
  if (normalizedPhone.length !== 11) return normalizedPhone;
  return `+880 ${normalizedPhone.slice(1, 3)}****${normalizedPhone.slice(-3)}`;
}

export function sanitizeOtpPurpose(raw: unknown): PhoneOtpPurpose {
  return raw === 'signup' ? 'signup' : 'signin';
}

export type RequestPhoneOtpResult =
  | {
      ok: true;
      phone: string;
      maskedPhone: string;
      cooldownSeconds: number;
      expiresInSeconds: number;
    }
  | {
      ok: false;
      code:
        | 'INVALID_PHONE'
        | 'OTP_UNAVAILABLE'
        | 'RATE_LIMITED'
        | 'SMS_DELIVERY_FAILED';
      error: string;
      retryAfter?: number;
      status: number;
    };

export async function requestPhoneOtp(params: {
  phone: unknown;
  purpose?: unknown;
  ip: string;
  deviceId?: string | null;
}): Promise<RequestPhoneOtpResult> {
  const normalizedPhone = normalizeBangladeshPhoneNumber(params.phone);
  if (!normalizedPhone) {
    return {
      ok: false,
      code: 'INVALID_PHONE',
      error: 'Please enter a valid 11-digit Bangladesh mobile number (01XXXXXXXXX).',
      status: 400,
    };
  }

  if (!isQsmsConfigured()) {
    return {
      ok: false,
      code: 'OTP_UNAVAILABLE',
      error: 'SMS verification is temporarily unavailable. Please sign in with Google, Facebook, or password.',
      status: 503,
    };
  }

  const purpose = sanitizeOtpPurpose(params.purpose);
  const ip = params.ip || 'unknown';
  const deviceId =
    typeof params.deviceId === 'string' && params.deviceId.trim()
      ? params.deviceId.trim().slice(0, 128)
      : null;

  // Multi-layer anti-SMS-pumping rate limits
  const [cooldown, hourlyPhone, dailyPhone, hourlyIp] = await Promise.all([
    checkRateLimit(`otp:cool:${normalizedPhone}`, 1, PHONE_OTP_CONFIG.resendCooldownSeconds),
    checkRateLimit(`otp:phone:1h:${normalizedPhone}`, PHONE_OTP_CONFIG.hourlyPhoneMax, 3600),
    checkRateLimit(`otp:phone:24h:${normalizedPhone}`, PHONE_OTP_CONFIG.dailyPhoneMax, 86400),
    checkRateLimit(`otp:ip:1h:${ip}`, PHONE_OTP_CONFIG.hourlyIpMax, 3600),
  ]);

  if (!cooldown.allowed) {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      error: `Please wait ${cooldown.resetIn} seconds before requesting another code.`,
      retryAfter: cooldown.resetIn,
      status: 429,
    };
  }

  if (!hourlyPhone.allowed || !dailyPhone.allowed || !hourlyIp.allowed) {
    const retryAfter = Math.max(
      hourlyPhone.allowed ? 0 : hourlyPhone.resetIn,
      dailyPhone.allowed ? 0 : dailyPhone.resetIn,
      hourlyIp.allowed ? 0 : hourlyIp.resetIn
    );
    return {
      ok: false,
      code: 'RATE_LIMITED',
      error: 'Too many OTP requests. Please try again later or sign in with Google/Facebook.',
      retryAfter: retryAfter || 300,
      status: 429,
    };
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashPhoneOtp(normalizedPhone, purpose, code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PHONE_OTP_CONFIG.ttlSeconds * 1000);

  // Invalidate any prior unconsumed OTPs for this phone+purpose, then persist new one
  const created = await prisma.$transaction(async (tx) => {
    await tx.otpRequest.updateMany({
      where: {
        phone: normalizedPhone,
        purpose,
        consumedAt: null,
      },
      data: { consumedAt: now },
    });

    return tx.otpRequest.create({
      data: {
        phone: normalizedPhone,
        codeHash,
        purpose,
        attempts: 0,
        expiresAt,
        deviceId,
        ip,
      },
      select: { id: true },
    });
  });

  const smsText = `Your Minsah Beauty login code is ${code}. Valid for 5 minutes. Never share this code.`;
  const smsResult = await sendQsmsMessage({
    phone: normalizedPhone,
    message: smsText,
    type: 'plain',
  });

  if (!smsResult.ok) {
    // Mark created OTP consumed so it cannot be guessed if delivery failed
    await prisma.otpRequest
      .update({
        where: { id: created.id },
        data: { consumedAt: new Date() },
      })
      .catch(() => {});

    return {
      ok: false,
      code: 'SMS_DELIVERY_FAILED',
      error: 'Could not send verification SMS right now. Please try again or use Google/Facebook.',
      status: 502,
    };
  }

  return {
    ok: true,
    phone: normalizedPhone,
    maskedPhone: maskBangladeshPhone(normalizedPhone),
    cooldownSeconds: PHONE_OTP_CONFIG.resendCooldownSeconds,
    expiresInSeconds: PHONE_OTP_CONFIG.ttlSeconds,
  };
}

async function storeSingleUseOtpProof(payload: VerifiedOtpProofPayload): Promise<string> {
  const proofToken = crypto.randomBytes(32).toString('base64url');
  const key = `otp:proof:${sha256Hex(proofToken)}`;

  if (redis) {
    await redis.set(key, JSON.stringify(payload), 'EX', PHONE_OTP_CONFIG.proofTtlSeconds);
    return proofToken;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Redis is required for OTP verification proof storage in production');
  }

  devMemoryProofStore.set(key, {
    payload,
    expiresAt: Date.now() + PHONE_OTP_CONFIG.proofTtlSeconds * 1000,
  });
  return proofToken;
}

const CONSUME_PROOF_LUA = `
local val = redis.call("GET", KEYS[1])
if val then
  redis.call("DEL", KEYS[1])
end
return val
`;

/**
 * Atomically reads and deletes a verified single-use OTP proof token.
 * Used exclusively by NextAuth CredentialsProvider.authorize().
 */
export async function consumePhoneOtpProof(
  rawPhone: string,
  proofToken: string
): Promise<VerifiedOtpProofPayload | null> {
  const normalizedPhone = normalizeBangladeshPhoneNumber(rawPhone);
  if (!normalizedPhone || !proofToken || proofToken.length < 32) return null;

  const key = `otp:proof:${sha256Hex(proofToken.trim())}`;

  if (redis) {
    try {
      const raw = (await redis.eval(CONSUME_PROOF_LUA, 1, key)) as string | null;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as VerifiedOtpProofPayload;
      if (parsed.phone !== normalizedPhone) return null;
      return parsed;
    } catch (err) {
      console.error('[PhoneOTP] Failed to consume Redis proof:', err);
      return null;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const entry = devMemoryProofStore.get(key);
  devMemoryProofStore.delete(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  if (entry.payload.phone !== normalizedPhone) return null;
  return entry.payload;
}

export type VerifyPhoneOtpResult =
  | {
      ok: true;
      phone: string;
      otpProof: string;
      expiresInSeconds: number;
    }
  | {
      ok: false;
      code: 'INVALID_INPUT' | 'RATE_LIMITED' | 'OTP_EXPIRED' | 'OTP_LOCKED' | 'OTP_INVALID';
      error: string;
      attemptsLeft?: number;
      retryAfter?: number;
      status: number;
    };

export async function verifyPhoneOtp(params: {
  phone: unknown;
  otp: unknown;
  purpose?: unknown;
  ip: string;
  fullName?: string;
  email?: string;
}): Promise<VerifyPhoneOtpResult> {
  const normalizedPhone = normalizeBangladeshPhoneNumber(params.phone);
  const code = typeof params.otp === 'string' ? params.otp.replace(/\D/g, '').trim() : '';
  const purpose = sanitizeOtpPurpose(params.purpose);

  if (!normalizedPhone || !/^\d{6}$/.test(code)) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      error: 'Please enter a valid phone number and 6-digit verification code.',
      status: 400,
    };
  }

  const ip = params.ip || 'unknown';
  const [phoneRate, ipRate] = await Promise.all([
    checkRateLimit(
      `otp:verify:phone:${normalizedPhone}`,
      PHONE_OTP_CONFIG.verifyMaxPerWindow,
      PHONE_OTP_CONFIG.verifyWindowSeconds
    ),
    checkRateLimit(
      `otp:verify:ip:${ip}`,
      PHONE_OTP_CONFIG.verifyMaxPerWindow * 2,
      PHONE_OTP_CONFIG.verifyWindowSeconds
    ),
  ]);

  if (!phoneRate.allowed || !ipRate.allowed) {
    const retryAfter = Math.max(
      phoneRate.allowed ? 0 : phoneRate.resetIn,
      ipRate.allowed ? 0 : ipRate.resetIn
    );
    return {
      ok: false,
      code: 'RATE_LIMITED',
      error: 'Too many failed verification attempts. Please wait a few minutes and try again.',
      retryAfter: retryAfter || 300,
      status: 429,
    };
  }

  const now = new Date();
  const activeOtp = await prisma.otpRequest.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeOtp) {
    return {
      ok: false,
      code: 'OTP_EXPIRED',
      error: 'Verification code has expired or was not found. Please request a new code.',
      status: 400,
    };
  }

  if (activeOtp.attempts >= PHONE_OTP_CONFIG.maxAttemptsPerCode) {
    await prisma.otpRequest
      .update({
        where: { id: activeOtp.id },
        data: { consumedAt: now },
      })
      .catch(() => {});

    return {
      ok: false,
      code: 'OTP_LOCKED',
      error: 'Too many incorrect attempts. Please request a new verification code.',
      attemptsLeft: 0,
      status: 429,
    };
  }

  const expectedHash = hashPhoneOtp(normalizedPhone, purpose, code);
  const matched = constantTimeHexEqual(activeOtp.codeHash, expectedHash);

  if (!matched) {
    const updated = await prisma.otpRequest.update({
      where: { id: activeOtp.id },
      data: {
        attempts: { increment: 1 },
        ...(activeOtp.attempts + 1 >= PHONE_OTP_CONFIG.maxAttemptsPerCode
          ? { consumedAt: now }
          : {}),
      },
      select: { attempts: true },
    });

    const attemptsLeft = Math.max(0, PHONE_OTP_CONFIG.maxAttemptsPerCode - updated.attempts);
    if (attemptsLeft === 0) {
      return {
        ok: false,
        code: 'OTP_LOCKED',
        error: 'Too many incorrect attempts. Please request a new verification code.',
        attemptsLeft: 0,
        status: 429,
      };
    }

    return {
      ok: false,
      code: 'OTP_INVALID',
      error: 'Incorrect verification code. Please check your SMS and try again.',
      attemptsLeft,
      status: 401,
    };
  }

  // Atomic single-use consumption (prevents parallel replay race)
  const consumed = await prisma.otpRequest.updateMany({
    where: {
      id: activeOtp.id,
      consumedAt: null,
    },
    data: { consumedAt: now },
  });

  if (consumed.count !== 1) {
    return {
      ok: false,
      code: 'OTP_EXPIRED',
      error: 'This verification code has already been used. Please request a new code.',
      status: 400,
    };
  }

  const cleanFullName =
    typeof params.fullName === 'string' && params.fullName.trim()
      ? params.fullName.trim().slice(0, 100)
      : undefined;
  const cleanEmail =
    typeof params.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email.trim())
      ? params.email.trim().toLowerCase()
      : undefined;

  const otpProof = await storeSingleUseOtpProof({
    phone: normalizedPhone,
    purpose,
    fullName: cleanFullName,
    email: cleanEmail,
    verifiedAt: Date.now(),
  });

  return {
    ok: true,
    phone: normalizedPhone,
    otpProof,
    expiresInSeconds: PHONE_OTP_CONFIG.proofTtlSeconds,
  };
}
