import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { sanitizeTrackingPath, sanitizeTrackingUrl } from '@/lib/tracking/sanitize-url';
import { normalizeMetaExternalIdValue } from '@/lib/tracking/meta-external-id';

// Get allowed origins from environment or use defaults
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map((origin) => origin.trim());
  }

  // Default origins based on environment
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://minsahbeauty.cloud',
      'https://www.minsahbeauty.cloud',
    ];
  }

  return ['http://localhost:3000', 'http://127.0.0.1:3000'];
}

// Check if origin is allowed
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Allow same-origin requests
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

// Generate nonce for CSP
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

const TRACKING_COOKIE_MAX_AGE = {
  fbp: 90 * 24 * 60 * 60,
  fbc: 90 * 24 * 60 * 60,
  attribution: 30 * 24 * 60 * 60,
  visitor: 180 * 24 * 60 * 60,
};

const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'campaign_id',
  'adset_id',
  'ad_id',
  'placement',
] as const;

function encodeCookieJson(value: Record<string, string>) {
  return encodeURIComponent(JSON.stringify(value));
}

function createFbp() {
  return `fb.1.${Date.now()}.${Math.floor(Math.random() * 1_000_000_000_000_000_000)}`;
}

function createVisitorId() {
  return `mbv_${Date.now()}_${crypto.randomUUID()}`;
}

function shouldApplyTrackingCookies(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  if (pathname.startsWith('/api')) return false;
  if (pathname.startsWith('/admin')) return false;
  if (pathname.startsWith('/checkout/payment-bridge')) return false;
  return true;
}

function applyTrackingCookies(request: NextRequest, response: NextResponse): NextResponse {
  if (!shouldApplyTrackingCookies(request)) return response;

  const secure = request.nextUrl.protocol === 'https:';
  const cookieOptions = {
    path: '/',
    sameSite: 'lax' as const,
    secure,
  };
  const searchParams = request.nextUrl.searchParams;
  const fbclid = searchParams.get('fbclid')?.trim();
  const attribution = ATTRIBUTION_PARAMS.reduce<Record<string, string>>((acc, key) => {
    const value = searchParams.get(key)?.trim();
    if (value) acc[key] = value;
    return acc;
  }, {});

  if (!request.cookies.get('_fbp')?.value) {
    response.cookies.set('_fbp', createFbp(), {
      ...cookieOptions,
      maxAge: TRACKING_COOKIE_MAX_AGE.fbp,
    });
  }

  if (fbclid && !request.cookies.get('_fbc')?.value) {
    response.cookies.set('_fbc', `fb.1.${Date.now()}.${fbclid}`, {
      ...cookieOptions,
      maxAge: TRACKING_COOKIE_MAX_AGE.fbc,
    });
  }

  const existingVisitorId = request.cookies.get('mb_vid')?.value;
  const normalizedVisitorId = normalizeMetaExternalIdValue(existingVisitorId);
  if (!normalizedVisitorId) {
    response.cookies.set('mb_vid', createVisitorId(), {
      ...cookieOptions,
      maxAge: TRACKING_COOKIE_MAX_AGE.visitor,
    });
  } else if (existingVisitorId !== normalizedVisitorId) {
    response.cookies.set('mb_vid', normalizedVisitorId, {
      ...cookieOptions,
      maxAge: TRACKING_COOKIE_MAX_AGE.visitor,
    });
  }

  if (Object.keys(attribution).length > 0) {
    response.cookies.set('mb_attribution', encodeCookieJson(attribution), {
      ...cookieOptions,
      maxAge: TRACKING_COOKIE_MAX_AGE.attribution,
    });
  }

  if (!request.cookies.get('mb_first_landing_path')?.value) {
    response.cookies.set(
      'mb_first_landing_path',
      encodeURIComponent(
        sanitizeTrackingPath(`${request.nextUrl.pathname}${request.nextUrl.search}`) ?? request.nextUrl.pathname
      ),
      {
        ...cookieOptions,
        maxAge: TRACKING_COOKIE_MAX_AGE.visitor,
      }
    );
  }

  if (!request.cookies.get('mb_first_landing_url')?.value) {
    response.cookies.set(
      'mb_first_landing_url',
      encodeURIComponent(sanitizeTrackingUrl(request.nextUrl.href) ?? request.nextUrl.origin),
      {
        ...cookieOptions,
        maxAge: TRACKING_COOKIE_MAX_AGE.visitor,
      }
    );
  }

  const referrer = request.headers.get('referer')?.trim();
  if (referrer && !request.cookies.get('mb_referrer')?.value) {
    const safeReferrer = sanitizeTrackingUrl(referrer);
    if (safeReferrer) {
      response.cookies.set('mb_referrer', encodeURIComponent(safeReferrer), {
        ...cookieOptions,
        maxAge: TRACKING_COOKIE_MAX_AGE.visitor,
      });
    }
  }

  return response;
}

// Create base response with security headers
function createSecureResponse(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');

  // CSP header for production
  if (process.env.NODE_ENV === 'production') {
    const minioHost = process.env.MINIO_ENDPOINT || 'storage.minsahbeauty.cloud';

    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://www.google-analytics.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      `img-src 'self' data: https: blob: http://${minioHost}:9000 https://${minioHost}; ` +
      "font-src 'self' https://fonts.gstatic.com; " +
      `connect-src 'self' https://www.google-analytics.com https://graph.facebook.com wss: http://${minioHost}:9000; ` +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "upgrade-insecure-requests;"
    );
  }

  return response;
}

// Handle CORS preflight and headers
function handleCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  // Check if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Same-origin request or server-to-server
    response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return handleCors(request, response);
  }

  // Handle API routes
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    // Do NOT set a fixed Content-Type here.
    // - Response Content-Type is set by each route handler (e.g. NextResponse.json()).
    // - Upload routes receive multipart/form-data requests; forcing application/json
    //   onto the NextResponse.next() object overwrites the forwarded request Content-Type
    //   header in Next.js App Router proxy, causing request.formData() to throw.
    return handleCors(request, createSecureResponse(response));
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    // Allow access to login page
    if (pathname === '/admin/login') {
      return createSecureResponse(NextResponse.next());
    }

    // Check for admin access token
    const accessToken = request.cookies.get('admin_access_token');
    const refreshToken = request.cookies.get('admin_refresh_token');

    // No tokens at all - redirect to login
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return createSecureResponse(NextResponse.redirect(loginUrl));
    }

    // Has refresh token but no access token - let the client handle refresh
    // The AdminAuthContext will automatically try to refresh
    if (!accessToken && refreshToken) {
      return createSecureResponse(NextResponse.next());
    }

    // Access token exists - verify the JWT before rendering admin pages.
    // If it is expired but a refresh token exists, let the client refresh flow run.
    if (accessToken) {
      const payload = await verifyAdminAccessToken(accessToken.value);
      if (payload) {
        return createSecureResponse(NextResponse.next());
      }
    }

    if (refreshToken) {
      return createSecureResponse(NextResponse.next());
    }

    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return createSecureResponse(NextResponse.redirect(loginUrl));
  }

  // Protect user account routes
  if (pathname.startsWith('/account')) {
    // Allow login and register pages
    if (pathname === '/login' || pathname === '/register') {
      return createSecureResponse(NextResponse.next());
    }

    // Check for NextAuth session
    const sessionToken = request.cookies.get('next-auth.session-token') ||
                         request.cookies.get('__Secure-next-auth.session-token');

    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return createSecureResponse(NextResponse.redirect(loginUrl));
    }

    return createSecureResponse(NextResponse.next());
  }

  // All other routes
  return applyTrackingCookies(request, createSecureResponse(NextResponse.next()));
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
    '/api/:path*',
    // Exclude static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
