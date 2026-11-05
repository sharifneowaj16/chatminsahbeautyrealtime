import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { generateTokenPair } from '@/lib/auth/jwt';
import { checkRateLimit } from '@/lib/cache/redis';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:register');

// Rate limit: 3 registrations per hour per IP
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return { valid: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';

  try {
    // Rate limiting
    const rateLimitKey = `register:${ip}`;
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);

    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded for registration', { ip });
      return NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: rateLimit.resetIn
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetIn),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        }
      );
    }

    const body = await request.json();
    const { email, name, phone, password, dateOfBirth, gender, referralCode } = body;

    // Parse name into firstName and lastName
    let firstName = '';
    let lastName = '';
    if (name) {
      const nameParts = name.trim().split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Validate required fields: Name is required, along with either Phone or Email
    if (!name || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Name and either Phone or Email are required' },
        { status: 400 }
      );
    }

    // Clean phone number if provided
    let cleanPhone: string | null = null;
    let rawDigits: string | null = null;
    if (phone && typeof phone === 'string') {
      cleanPhone = phone.replace(/[-\s]/g, '');
      rawDigits = cleanPhone.replace(/^\+?88/, '');
    }

    // Validate email format if provided
    let cleanEmail: string | null = null;
    if (email && typeof email === 'string' && email.trim()) {
      cleanEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (password && typeof password === 'string' && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      passwordHash = await bcrypt.hash(password, 12);
    }

    // Check for existing user by Phone OR Email to prevent duplicate records
    let existingUser = null;
    if (rawDigits) {
      existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: rawDigits },
            { phone: cleanPhone! },
            { phone: `+88${rawDigits}` },
            { phone: `+880${rawDigits.replace(/^0/, '')}` },
          ],
        },
      });
    }

    if (!existingUser && cleanEmail) {
      existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
    }

    // If an account with this email exists under a DIFFERENT user id, prevent collision
    if (cleanEmail) {
      const emailUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (emailUser && existingUser && emailUser.id !== existingUser.id) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check referral code if provided
    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    let user;
    if (existingUser) {
      // Upsert/Update existing user with profile details
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
          email: cleanEmail || existingUser.email,
          phone: rawDigits || existingUser.phone,
          ...(passwordHash ? { passwordHash } : {}),
          status: 'ACTIVE',
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
    } else {
      // Generate unique referral code for new customer
      let userReferralCode = generateReferralCode();
      let codeExists = true;
      let attempts = 0;
      while (codeExists && attempts < 10) {
        const existing = await prisma.user.findUnique({
          where: { referralCode: userReferralCode },
        });
        if (!existing) {
          codeExists = false;
        } else {
          userReferralCode = generateReferralCode();
          attempts++;
        }
      }

      // Create new user in database
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          firstName: firstName || 'Minsah',
          lastName: lastName || 'Member',
          phone: rawDigits || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          referralCode: userReferralCode,
          referredById,
          loyaltyPoints: 100, // Welcome bonus
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
    }

    // Add referral bonus if referred
    if (referredById) {
      await prisma.user.update({
        where: { id: referredById },
        data: { loyaltyPoints: { increment: 200 } }, // Referral bonus
      });
      logger.info('Referral bonus added', { referrerId: referredById, newUserId: user.id });
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = await generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    const response = NextResponse.json({
      user: {
        ...user,
        role: user.role.toLowerCase(),
      },
      accessToken,
      message: 'Registration successful',
    }, { status: 201 });

    // Set HTTP-only cookies for tokens
    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    logger.error('Registration error', error);
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
