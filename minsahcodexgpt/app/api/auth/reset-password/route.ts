import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/cache/redis';
import { createLogger } from '@/lib/logger';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import {
  hashPasswordResetToken,
  isResetTokenHash,
  isResetTokenShape,
} from '@/lib/auth/password-reset-token';

const logger = createLogger('auth:reset-password');

// Rate limit: 5 attempts per hour per IP/token
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 3600;

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function responseValidationErrors(errors: string[]) {
  return NextResponse.json(
    { error: 'Password requirements not met', details: errors },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (!isResetTokenShape(token)) {
      logger.info('Malformed password reset token attempted', { ip });
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    const tokenHash = hashPasswordResetToken(token);
    const tokenRateLimitKey = `reset-password:token:${tokenHash.slice(0, 32)}`;
    const [ipRateLimit, tokenRateLimit] = await Promise.all([
      checkRateLimit(`reset-password:ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
      checkRateLimit(tokenRateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
    ]);

    if (!ipRateLimit.allowed || !tokenRateLimit.allowed) {
      const retryAfter = Math.max(ipRateLimit.resetIn, tokenRateLimit.resetIn);
      logger.warn('Rate limit exceeded for password reset', { ip });
      return NextResponse.json(
        {
          error: 'Too many password reset attempts. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return responseValidationErrors(passwordValidation.errors);
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!resetToken || !isResetTokenHash(resetToken.token)) {
      logger.info('Invalid password reset token attempted', { ip });
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    if (resetToken.expires < new Date()) {
      logger.info('Expired password reset token used', { email: resetToken.email });
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 401 }
      );
    }

    if (resetToken.used) {
      logger.warn('Already used password reset token attempted', { email: resetToken.email });
      return NextResponse.json(
        { error: 'This reset token has already been used' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      logger.error('User not found for valid reset token', undefined, { email: resetToken.email });
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          email: resetToken.email,
          used: false,
          id: { not: resetToken.id },
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revoked: true },
      }),
    ]);

    logger.info('Password reset successful', { userId: user.id });

    return NextResponse.json({
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error) {
    logger.error('Password reset error', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting password. Please try again.' },
      { status: 500 }
    );
  }
}
