import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth/nextauth';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const logger = createLogger('auth:logout');

const STATIC_COOKIES_TO_CLEAR = [
  'auth_token',
  'refresh_token',
  'user_id',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
];

function clearAllAuthCookies(request: NextRequest, response: NextResponse) {
  const isHttps =
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.nextUrl.protocol === 'https:' ||
    process.env.NODE_ENV === 'production';

  const cookieNames = new Set(STATIC_COOKIES_TO_CLEAR);
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith('next-auth.') ||
      cookie.name.startsWith('__Secure-next-auth.') ||
      cookie.name.startsWith('__Host-next-auth.')
    ) {
      cookieNames.add(cookie.name);
    }
  }

  for (const name of cookieNames) {
    const mustBeSecure = name.startsWith('__Secure-') || name.startsWith('__Host-');
    const isCsrf = name.includes('csrf-token');
    response.cookies.set(name, '', {
      httpOnly: !isCsrf,
      secure: mustBeSecure ? true : isHttps,
      sameSite: 'lax',
      expires: new Date(0),
      maxAge: 0,
      path: '/',
    });
  }

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    const cookieUserId = request.cookies.get('user_id')?.value;
    const session = await getServerSession(authOptions).catch(() => null);
    const resolvedUserId = cookieUserId || session?.user?.id || null;

    if (refreshToken) {
      await prisma.refreshToken
        .updateMany({
          where: { token: refreshToken },
          data: { revoked: true },
        })
        .catch(() => {});
    }

    if (resolvedUserId) {
      await prisma.refreshToken
        .updateMany({
          where: { userId: resolvedUserId, revoked: false },
          data: { revoked: true },
        })
        .catch(() => {});
    }

    logger.info('User logged out', { userId: resolvedUserId || 'unknown' });

    const response = NextResponse.json({
      ok: true,
      message: 'Logged out successfully',
    });

    return clearAllAuthCookies(request, response);
  } catch (error) {
    logger.error('Logout error', error);
    const response = NextResponse.json({
      ok: true,
      message: 'Logged out',
    });
    return clearAllAuthCookies(request, response);
  }
}
