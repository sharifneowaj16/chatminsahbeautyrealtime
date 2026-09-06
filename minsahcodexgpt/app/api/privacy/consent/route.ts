import { NextRequest, NextResponse } from 'next/server';
import { recordTrackingConsent } from '@/lib/privacy/consent-record';
import {
  CURRENT_TRACKING_CONSENT_VERSION,
  TRACKING_CONSENT_COOKIE,
  TRACKING_CONSENT_VERSION_COOKIE,
  TRACKING_CONSENT_MAX_AGE_SECONDS,
  NON_ESSENTIAL_TRACKING_COOKIES,
} from '@/lib/tracking/tracking-consent';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    state?: unknown;
    previousState?: unknown;
    version?: unknown;
  } | null;
  const state = String(body?.state ?? '').toLowerCase();
  const previousState = String(body?.previousState ?? '').toLowerCase();
  if (!['granted', 'denied'].includes(state)) {
    return NextResponse.json({ ok: false, error: 'state must be granted or denied' }, { status: 400 });
  }
  const durableState = state === 'denied' && previousState === 'granted'
    ? 'WITHDRAWN' as const
    : state === 'granted' ? 'GRANTED' as const : 'DENIED' as const;
  const version = typeof body?.version === 'string' && body.version.trim()
    ? body.version.trim().slice(0, 100)
    : CURRENT_TRACKING_CONSENT_VERSION;
  const result = await recordTrackingConsent({
    state: durableState,
    version,
    source: 'CONSENT_UI',
    visitorId: request.cookies.get('mb_vid')?.value,
  });

  const response = NextResponse.json({ ok: true, consent: result }, { status: 201 });

  const isHttps = request.headers.get('x-forwarded-proto') === 'https'
    || request.nextUrl.protocol === 'https:'
    || (process.env.NODE_ENV === 'production' && !request.headers.get('host')?.includes('localhost'));

  const cookieBase = {
    path: '/',
    sameSite: 'lax' as const,
    secure: isHttps,
    httpOnly: false,
  };

  if (state === 'granted') {
    response.cookies.set(TRACKING_CONSENT_COOKIE, 'granted', {
      ...cookieBase,
      maxAge: TRACKING_CONSENT_MAX_AGE_SECONDS,
    });
    response.cookies.set(TRACKING_CONSENT_VERSION_COOKIE, version, {
      ...cookieBase,
      maxAge: TRACKING_CONSENT_MAX_AGE_SECONDS,
    });
  } else {
    response.cookies.set(TRACKING_CONSENT_COOKIE, 'denied', {
      ...cookieBase,
      maxAge: TRACKING_CONSENT_MAX_AGE_SECONDS,
    });
    response.cookies.set(TRACKING_CONSENT_VERSION_COOKIE, version, {
      ...cookieBase,
      maxAge: TRACKING_CONSENT_MAX_AGE_SECONDS,
    });

    for (const cookieName of NON_ESSENTIAL_TRACKING_COOKIES) {
      response.cookies.set(cookieName, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: isHttps,
        httpOnly: false,
      });
    }
  }

  return response;
}

