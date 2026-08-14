import { NextRequest, NextResponse } from 'next/server';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { normalizeInstagramWebhookEvents } from '@/lib/meta/instagram/webhook';
import { receiveInstagramWebhookEvents } from '@/lib/meta/instagram/service';
import {
  META_WEBHOOK_DEFAULT_MAX_BYTES,
  metaWebhookEnvelopeFailureResponse,
  metaWebhookHandoffResponse,
  metaWebhookHandoffUnavailableResponse,
  metaWebhookRequestFailureResponse,
  parseAndNormalizeMetaWebhookNotifications,
  readAndVerifyMetaWebhookRequest,
  verifyMetaWebhookChallengeRequest,
  type MetaWebhookRequestFailureCode,
} from '@/lib/meta-platform/transports/webhook';
import { incrementMetaCounter } from '@/lib/observability/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const config = getMetaBusinessConfig();
  const result = verifyMetaWebhookChallengeRequest({
    searchParams: request.nextUrl.searchParams,
    expectedToken: config.webhookVerifyToken,
  });
  if (!result.ok) return NextResponse.json({ error: 'Webhook verification failed', code: result.code }, { status: 403 });
  return new NextResponse(result.challenge, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

function transportOutcome(code: MetaWebhookRequestFailureCode) {
  if (code === 'PAYLOAD_TOO_LARGE') return 'too_large';
  if (code.startsWith('SIGNATURE_') || code === 'APP_SECRET_MISSING') return 'invalid_signature';
  return 'invalid_request';
}

export async function POST(request: NextRequest) {
  const config = getMetaBusinessConfig();
  const transport = await readAndVerifyMetaWebhookRequest({
    request,
    appSecret: config.appSecret,
    maxBytes: META_WEBHOOK_DEFAULT_MAX_BYTES,
  });
  if (!transport.ok) {
    incrementMetaCounter('meta_webhook_received_total', {
      object_type: 'instagram',
      outcome: transportOutcome(transport.code),
    });
    const failure = metaWebhookRequestFailureResponse(transport);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  let parsed: ReturnType<typeof parseAndNormalizeMetaWebhookNotifications>;
  try {
    parsed = parseAndNormalizeMetaWebhookNotifications({
      rawBody: transport.rawBody,
      maxBytes: META_WEBHOOK_DEFAULT_MAX_BYTES,
      expectedPayloadDigest: transport.payloadDigest,
    });
  } catch (error) {
    incrementMetaCounter('meta_webhook_received_total', { object_type: 'instagram', outcome: 'invalid_envelope' });
    const failure = metaWebhookEnvelopeFailureResponse(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const events = normalizeInstagramWebhookEvents(parsed.notifications);
  try {
    const summary = await receiveInstagramWebhookEvents({
      events,
      signatureOk: true,
      ignored: Math.max(0, parsed.notifications.length - events.length),
    });
    return NextResponse.json(metaWebhookHandoffResponse(summary), { status: 200 });
  } catch {
    const failure = metaWebhookHandoffUnavailableResponse();
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
