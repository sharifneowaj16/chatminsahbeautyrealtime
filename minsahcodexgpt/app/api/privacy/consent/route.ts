import { NextRequest, NextResponse } from 'next/server';
import { recordTrackingConsent } from '@/lib/privacy/consent-record';
import { CURRENT_TRACKING_CONSENT_VERSION } from '@/lib/tracking/tracking-consent';

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
  return NextResponse.json({ ok: true, consent: result }, { status: 201 });
}
