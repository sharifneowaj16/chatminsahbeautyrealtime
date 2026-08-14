import { NextRequest, NextResponse } from 'next/server';
import { shouldSkipServerTrackingRequest } from '@/lib/tracking/traffic-filter';
import {
  persistShopCroEvent,
  sanitizeShopCroEvent,
} from '@/lib/tracking/shop-cro-events';
import {
  getRequestId,
  getRequestLogContext,
  logOperationalError,
  logOperationalInfo,
  logOperationalWarning,
} from '@/lib/observability/logger';

export const runtime = 'nodejs';

const MAX_TRACKING_BODY_BYTES = 128_000;

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
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function sanitizeTrackingSummary(input: {
  event?: unknown;
  session?: unknown;
  sessionId?: unknown;
  deviceId?: unknown;
  timestamp?: unknown;
  ip?: string;
  userAgent?: string;
}) {
  const session = isTrackingSessionSummary(input.session) ? input.session : undefined;
  const event = typeof input.event === 'string' ? input.event.trim().slice(0, 100) : 'unknown';

  return {
    event: event || 'unknown',
    timestamp: input.timestamp,
    hasSession: Boolean(session || input.sessionId),
    hasDeviceId: Boolean(input.deviceId),
    deviceType: session?.device?.type?.slice(0, 40) || 'unknown',
    hasUtm: Boolean(session?.utmParams?.source),
    ip: redactIp(input.ip),
    hasUserAgent: Boolean(input.userAgent),
    createdAt: new Date().toISOString(),
  };
}

function jsonWithRequestId(body: unknown, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('x-request-id', requestId);
  response.headers.set('cache-control', 'no-store');
  return response;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = getRequestLogContext(request, requestId);
  const startedAt = Date.now();

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonWithRequestId(
        { success: false, error: 'Content-Type must be application/json' },
        requestId,
        { status: 415 }
      );
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_TRACKING_BODY_BYTES) {
      logOperationalWarning('tracking.events.payload_rejected', {
        ...context,
        contentLength,
        reason: 'PAYLOAD_TOO_LARGE',
      });
      return jsonWithRequestId(
        { success: false, error: 'Tracking payload is too large' },
        requestId,
        { status: 413 }
      );
    }

    const skippedTraffic = shouldSkipServerTrackingRequest(request);
    if (skippedTraffic) {
      logOperationalInfo('tracking.events.skipped', {
        ...context,
        reason: skippedTraffic.reason,
        durationMs: Date.now() - startedAt,
      });
      return jsonWithRequestId({
        success: true,
        skipped: true,
        reason: skippedTraffic.reason,
      }, requestId);
    }

    const body = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return jsonWithRequestId(
        { success: false, error: 'Invalid tracking payload' },
        requestId,
        { status: 400 }
      );
    }

    const { event, data, session, sessionId, deviceId, timestamp } = body;
    if (typeof event !== 'string' || !event.trim()) {
      return jsonWithRequestId(
        { success: false, error: 'Tracking event name is required' },
        requestId,
        { status: 400 }
      );
    }

    const clientIp = getFirstIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    const shopCroEvent = sanitizeShopCroEvent({ event, data, timestamp, sessionId, deviceId });
    if (shopCroEvent) {
      const persistence = await persistShopCroEvent(shopCroEvent);
      const insights = await calculateInsights({
        event: shopCroEvent.event_name,
        timestamp,
        hasSession: Boolean(sessionId),
        hasDeviceId: Boolean(deviceId),
        deviceType: 'unknown',
        hasUtm: false,
        ip: redactIp(clientIp),
        hasUserAgent: Boolean(userAgent),
        createdAt: new Date().toISOString(),
      });

      if (!persistence.ok) {
        logOperationalWarning('tracking.events.shop_cro_persistence_failed', {
          ...context,
          eventName: shopCroEvent.event_name,
          eventId: shopCroEvent.event_id,
          itemCount: shopCroEvent.items.length,
          durationMs: Date.now() - startedAt,
        });
      } else {
        logOperationalInfo('tracking.events.shop_cro_persisted', {
          ...context,
          eventName: shopCroEvent.event_name,
          eventId: shopCroEvent.event_id,
          itemCount: shopCroEvent.items.length,
          durationMs: Date.now() - startedAt,
        });
      }

      return jsonWithRequestId({
        success: true,
        eventId: shopCroEvent.event_id,
        schemaVersion: shopCroEvent.schema_version,
        persisted: persistence.ok,
        retainedItemCount: shopCroEvent.items.length,
        intentOnly: shopCroEvent.intent_only,
        insights,
      }, requestId);
    }

    const sanitizedEvent = sanitizeTrackingSummary({
      event,
      session,
      sessionId,
      deviceId,
      timestamp,
      ip: clientIp,
      userAgent,
    });

    const insights = await calculateInsights(sanitizedEvent);

    logOperationalInfo('tracking.events.accepted', {
      ...context,
      eventName: sanitizedEvent.event,
      hasSession: sanitizedEvent.hasSession,
      hasDeviceId: sanitizedEvent.hasDeviceId,
      hasUtm: sanitizedEvent.hasUtm,
      durationMs: Date.now() - startedAt,
    });

    return jsonWithRequestId({
      success: true,
      eventId: `evt_${requestId}`,
      insights,
    }, requestId);
  } catch (error) {
    logOperationalError('tracking.events.failed', error, {
      ...context,
      durationMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(
      { success: false, error: 'Failed to process tracking event' },
      requestId,
      { status: 500 }
    );
  }
}

async function calculateInsights(event: ReturnType<typeof sanitizeTrackingSummary>) {
  return {
    deviceType: event.deviceType || 'unknown',
    hasUTM: Boolean(event.hasUtm),
    isReturningVisitor: false,
    predictedValue: 0,
  };
}
