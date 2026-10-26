import { NextRequest, NextResponse } from 'next/server';
import { recordTrackingConsent } from '@/lib/privacy/consent-record';
import {
  TRACKING_CONSENT_COOKIE,
  TRACKING_CONSENT_VERSION_COOKIE,
  TRACKING_CONSENT_VERSION,
  TRACKING_CONSENT_MAX_AGE,
  normalizeTrackingConsent,
  NON_ESSENTIAL_TRACKING_COOKIES,
} from '@/lib/tracking/tracking-consent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'JSON object body is required' }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const state = normalizeTrackingConsent(data.state);
    if (state !== 'granted' && state !== 'denied') {
      return NextResponse.json({ error: 'Invalid consent state' }, { status: 400 });
    }
    const previousState = normalizeTrackingConsent(data.previousState);
    const durableState = state === 'denied' && previousState === 'granted'
      ? 'WITHDRAWN'
      : state === 'granted' ? 'GRANTED' : 'DENIED';
    const visitorId = request.cookies.get('mb_vid')?.value;
    const record = await recordTrackingConsent({
      state: durableState,
      version: TRACKING_CONSENT_VERSION,
      source: 'CONSENT_UI',
      userId: null,
      visitorId,
    });

    const response = NextResponse.json({ ok: true, state, recordId: record.id, version: TRACKING_CONSENT_VERSION });
    const cookieOptions = {
      httpOnly: false,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: TRACKING_CONSENT_MAX_AGE,
    };
    response.cookies.set(TRACKING_CONSENT_COOKIE, state, cookieOptions);
    response.cookies.set(TRACKING_CONSENT_VERSION_COOKIE, TRACKING_CONSENT_VERSION, cookieOptions);
    if (state === 'denied') {
      for (const name of NON_ESSENTIAL_TRACKING_COOKIES) {
        response.cookies.set(name, '', { path: '/', secure: cookieOptions.secure, sameSite: 'lax', maxAge: 0 });
      }
    }
    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to save consent' }, { status: 500 });
  }
}
