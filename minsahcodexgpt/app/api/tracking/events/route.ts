import { NextRequest, NextResponse } from 'next/server';
import { shouldSkipServerTrackingRequest } from '@/lib/tracking/traffic-filter';

/**
 * Server-side Tracking Events API
 * Receives client-side tracking events for lightweight behavioural analytics.
 *
 * Production safety: never logs full raw payload/session/user-agent/IP. Store or log only
 * sanitized summaries unless a dedicated PII-safe database schema is added.
 */

function getFirstIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-vercel-forwarded-for') ||
    undefined
  );
}

function redactIp(ip?: string) {
  if (!ip) return undefined;

  // IPv4: keep first two octets only. IPv6: keep first two hextets only.
  if (ip.includes('.')) {
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.x.x` : 'redacted';
  }

  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}::redacted` : 'redacted';
  }

  return 'redacted';
}

type TrackingSessionSummary = {
  device?: { type?: string };
  utmParams?: { source?: string };
};

function isTrackingSessionSummary(value: unknown): value is TrackingSessionSummary {
  return Boolean(value && typeof value === 'object');
}

function sanitizeTrackingSummary(input: {
  event?: unknown;
  session?: unknown;
  timestamp?: unknown;
  ip?: string;
  userAgent?: string;
}) {
  const session = isTrackingSessionSummary(input.session) ? input.session : undefined;

  return {
    event: typeof input.event === 'string' ? input.event : 'unknown',
    timestamp: input.timestamp,
    hasSession: Boolean(session),
    deviceType: session?.device?.type || 'unknown',
    hasUtm: Boolean(session?.utmParams?.source),
    ip: redactIp(input.ip),
    hasUserAgent: Boolean(input.userAgent),
    createdAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const skippedTraffic = shouldSkipServerTrackingRequest(request);
    if (skippedTraffic) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: skippedTraffic.reason,
      });
    }

    const body = await request.json();
    const { event, session, timestamp } = body;

    const clientIp = getFirstIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    const sanitizedEvent = sanitizeTrackingSummary({
      event,
      session,
      timestamp,
      ip: clientIp,
      userAgent,
    });

    // TODO: Store a PII-safe summary in database if needed.
    if (process.env.NODE_ENV !== 'production') {
      console.log('Tracking Event Summary:', sanitizedEvent);
    }

    const insights = await calculateInsights(sanitizedEvent);

    return NextResponse.json({
      success: true,
      eventId: `evt_${timestamp}_${Math.random().toString(36).substring(7)}`,
      insights,
    });
  } catch (error) {
    console.error('Tracking API Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to process tracking event' },
      { status: 500 }
    );
  }
}

/**
 * Calculate customer insights from a sanitized event summary.
 */
async function calculateInsights(event: ReturnType<typeof sanitizeTrackingSummary>) {
  return {
    deviceType: event.deviceType || 'unknown',
    hasUTM: Boolean(event.hasUtm),
    isReturningVisitor: false,
    predictedValue: 0,
  };
}
