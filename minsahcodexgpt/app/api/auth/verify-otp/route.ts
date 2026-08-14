import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/cache/redis';
import { createLogger } from '@/lib/logger';
import {
  generatePasswordResetToken,
  hashPasswordResetOtp,
  hashPasswordResetToken,
  isOtpTokenHash,
  isValidPasswordResetEmail,
  normalizePasswordResetEmail,
} from '@/lib/auth/password-reset-token';

const logger = createLogger('auth:verify-otp');

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const emailInput = typeof body?.email === 'string' ? body.email : '';
    const otpInput = typeof body?.otp === 'string' ? body.otp : '';
    const email = normalizePasswordResetEmail(emailInput);
    const otp = otpInput.trim();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    if (!isValidPasswordResetEmail(email) || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid email or OTP format' },
        { status: 400 }
      );
    }

    const [ipRateLimit, emailRateLimit] = await Promise.all([
      checkRateLimit(`verify-password-reset-otp:ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
      checkRateLimit(`verify-password-reset-otp:email:${email}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
    ]);

    if (!ipRateLimit.allowed || !emailRateLimit.allowed) {
      const retryAfter = Math.max(ipRateLimit.resetIn, emailRateLimit.resetIn);
      logger.warn('Rate limit exceeded for verify-otp', { ip, email });
      return NextResponse.json(
        {
          error: 'Too many OTP verification attempts. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    const otpHash = hashPasswordResetOtp(email, otp);
    const storedOtp = await prisma.passwordResetToken.findFirst({
      where: {
        email,
        token: otpHash,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!storedOtp || !isOtpTokenHash(storedOtp.token)) {
      logger.info('Invalid password reset OTP attempted', { email, ip });
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please request a new one.' },
        { status: 401 }
      );
    }

    if (storedOtp.expires < new Date()) {
      await prisma.passwordResetToken.update({
        where: { id: storedOtp.id },
        data: { used: true },
      });
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 401 }
      );
    }

    const resetToken = generatePasswordResetToken();
    const resetTokenHash = hashPasswordResetToken(resetToken);

    await prisma.passwordResetToken.update({
      where: { id: storedOtp.id },
      data: {
        token: resetTokenHash,
        expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        used: false,
      },
    });

    return NextResponse.json({
      message: 'OTP verified successfully',
      token: resetToken,
    });
  } catch (error) {
    logger.error('Error verifying password reset OTP', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
