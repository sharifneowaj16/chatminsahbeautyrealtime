import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { captureMarketingAttribution, type AttributionDb } from '@/lib/attribution/repository';
import { getServerTrackingConsentFromCookie, getServerTrackingConsentVersionFromCookie, TRACKING_CONSENT_COOKIE, TRACKING_CONSENT_VERSION_COOKIE } from '@/lib/tracking/tracking-consent';
import { resolveTrackingDecision } from '@/lib/privacy/consent-resolver';
import { shouldSkipServerTrackingRequest } from '@/lib/tracking/traffic-filter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const skipped = shouldSkipServerTrackingRequest(request);
    if (skipped) return NextResponse.json({ ok: true, skipped: true, reason: skipped.reason });
    const consentState = getServerTrackingConsentFromCookie(request.cookies.get(TRACKING_CONSENT_COOKIE)?.value);
    const consentVersion = getServerTrackingConsentVersionFromCookie(request.cookies.get(TRACKING_CONSENT_VERSION_COOKIE)?.value);
    const decision = resolveTrackingDecision({ consentState, consentVersion, eventCategory: 'ADVERTISING' });
    if (!decision.allowCapiEvent) return NextResponse.json({ ok: true, captured: false, reason: decision.reason });
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'JSON object body is required' }, { status: 400 });
    const result = await captureMarketingAttribution(prisma as unknown as AttributionDb, { ...(body as Record<string, unknown>), consentState: decision.consentState });
    return NextResponse.json({ ok: true, captured: true, created: result.created, firstTouchPreserved: !result.conflict });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'ATTRIBUTION_CAPTURE_FAILED';
    const status = /REQUIRED|INVALID|TOO_OLD|IN_FUTURE/.test(code) ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? code : 'Attribution capture failed' }, { status });
  }
}
