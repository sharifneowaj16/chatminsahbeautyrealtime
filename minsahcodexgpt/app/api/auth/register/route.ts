import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { checkRateLimit } from '@/lib/cache/redis';
import { createLogger } from '@/lib/logger';
import {
  getBangladeshPhoneVariations,
  normalizeBangladeshPhoneNumber,
} from '@/lib/phone';

export const dynamic = 'force-dynamic';

const logger = createLogger('auth:register');

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 3600; // 1 hour

function generateCryptoReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    const rateLimit = await checkRateLimit(`register:ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);

    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded for registration', { ip });
      return NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: rateLimit.resetIn,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetIn),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const dateOfBirth = typeof body.dateOfBirth === 'string' ? body.dateOfBirth.trim() : '';
    const gender = typeof body.gender === 'string' ? body.gender.trim().toLowerCase() : '';
    const referralCode = typeof body.referralCode === 'string' ? body.referralCode.trim() : '';

    if (!rawName || (!rawEmail && !rawPhone)) {
      return NextResponse.json(
        { error: 'Full name and either email or mobile number are required.' },
        { status: 400 }
      );
    }

    let cleanEmail: string | null = null;
    if (rawEmail) {
      cleanEmail = rawEmail.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
      }
    }

    let normalizedPhone: string | null = null;
    if (rawPhone) {
      normalizedPhone = normalizeBangladeshPhoneNumber(rawPhone);
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: 'Please enter a valid 11-digit Bangladesh mobile number (01XXXXXXXXX).' },
          { status: 400 }
        );
      }
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      return NextResponse.json(
        {
          error: passwordCheck.errors[0] || 'Password does not meet security requirements.',
          details: passwordCheck.errors,
        },
        { status: 400 }
      );
    }

    // Never allow silent overwrite or account takeover of existing email/phone records
    if (cleanEmail) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true },
      });
      if (existingByEmail) {
        return NextResponse.json(
          {
            error: 'An account with this email already exists. Please sign in instead.',
            code: 'EMAIL_EXISTS',
          },
          { status: 409 }
        );
      }
    }

    if (normalizedPhone) {
      const phoneVariations = getBangladeshPhoneVariations(normalizedPhone);
      const existingByPhone = await prisma.user.findFirst({
        where: {
          OR: [
            { verifiedPhone: { in: phoneVariations } },
            { phone: { in: phoneVariations } },
          ],
        },
        select: { id: true },
      });
      if (existingByPhone) {
        return NextResponse.json(
          {
            error: 'An account with this mobile number already exists. Please sign in with Mobile OTP.',
            code: 'PHONE_EXISTS_USE_OTP',
          },
          { status: 409 }
        );
      }
    }

    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
        select: { id: true },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const nameParts = rawName.replace(/\s+/g, ' ').split(' ');
    const firstName = nameParts[0] || 'Minsah';
    const lastName = nameParts.slice(1).join(' ') || null;

    let userReferralCode = generateCryptoReferralCode();
    for (let attempts = 0; attempts < 10; attempts++) {
      const exists = await prisma.user.findUnique({
        where: { referralCode: userReferralCode },
        select: { id: true },
      });
      if (!exists) break;
      userReferralCode = generateCryptoReferralCode();
    }

    const passwordHash = await hashPassword(password);
    const parsedDob = dateOfBirth ? new Date(dateOfBirth) : null;
    const validDob = parsedDob && !Number.isNaN(parsedDob.getTime()) ? parsedDob : null;
    const validGender = ['male', 'female', 'other'].includes(gender) ? gender : null;

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        passwordChangedAt: new Date(),
        firstName,
        lastName,
        phone: normalizedPhone,
        dateOfBirth: validDob,
        gender: validGender,
        referralCode: userReferralCode,
        referredById,
        loyaltyPoints: 100,
        newsletter: true,
        promotions: true,
        newProducts: true,
        orderUpdates: true,
        status: 'ACTIVE',
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        emailVerified: true,
        loyaltyPoints: true,
        referralCode: true,
        createdAt: true,
      },
    });

    if (referredById) {
      await prisma.user
        .update({
          where: { id: referredById },
          data: { loyaltyPoints: { increment: 200 } },
        })
        .catch(() => {});
      logger.info('Referral bonus added', { referrerId: referredById, newUserId: user.id });
    }

    logger.info('User registered successfully', { userId: user.id });

    return NextResponse.json(
      {
        ok: true,
        user: {
          ...user,
          role: user.role.toLowerCase(),
        },
        message: 'Registration successful',
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('Registration error', error);
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
