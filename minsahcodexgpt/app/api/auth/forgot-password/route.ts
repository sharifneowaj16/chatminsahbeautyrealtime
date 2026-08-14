import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/cache/redis';
import { createLogger } from '@/lib/logger';
import {
  generatePasswordResetOtp,
  hashPasswordResetOtp,
  isValidPasswordResetEmail,
  normalizePasswordResetEmail,
} from '@/lib/auth/password-reset-token';
import { sendPasswordResetOtpEmail } from '@/lib/auth/password-reset-email';

const logger = createLogger('auth:forgot-password');

const OTP_TTL_MINUTES = 10;
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function genericSuccess(email: string) {
  return NextResponse.json({
    message: 'If an account exists for this email, a password reset code has been sent.',
    email,
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const emailInput = typeof body?.email === 'string' ? body.email : '';
    const email = normalizePasswordResetEmail(emailInput);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!isValidPasswordResetEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const [ipRateLimit, emailRateLimit] = await Promise.all([
      checkRateLimit(`forgot-password:ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
      checkRateLimit(`forgot-password:email:${email}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
    ]);

    if (!ipRateLimit.allowed || !emailRateLimit.allowed) {
      const retryAfter = Math.max(ipRateLimit.resetIn, emailRateLimit.resetIn);
      logger.warn('Rate limit exceeded for forgot-password', { ip, email });
      return NextResponse.json(
        {
          error: 'Too many password reset requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true },
    });

    // Avoid account enumeration: unknown or inactive users still get the same response.
    if (!user || user.status !== 'ACTIVE') {
      logger.info('Forgot-password requested for non-resettable account', {
        email,
        exists: Boolean(user),
      });
      return genericSuccess(email);
    }

    const otp = generatePasswordResetOtp();
    const tokenHash = hashPasswordResetOtp(email, otp);
    const expires = new Date(Date.now() + OTP_TTL_MS);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: {
          email,
          used: false,
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          email,
          token: tokenHash,
          expires,
          used: false,
        },
      }),
    ]);

    const sent = await sendPasswordResetOtpEmail({
      email,
      otp,
      expiresInMinutes: OTP_TTL_MINUTES,
    });

    if (!sent && process.env.NODE_ENV === 'production') {
      await prisma.passwordResetToken.update({
        where: { token: tokenHash },
        data: { used: true },
      });
      logger.error('Password reset OTP could not be delivered in production', undefined, { email });
      return NextResponse.json(
        { error: 'Password reset email service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (!sent) {
      logger.warn('Password reset OTP generated but email delivery is not configured', { email });
    }

    return genericSuccess(email);
  } catch (error) {
    logger.error('Error handling forgot-password request', error);
    return NextResponse.json(
      { error: 'Failed to start password reset. Please try again.' },
      { status: 500 }
    );
  }
}
