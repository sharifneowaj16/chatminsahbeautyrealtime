import { NextRequest, NextResponse } from 'next/server';
import { getMetaLeadConfig } from '@/lib/meta/leads/config';
import { handoffMetaLeadWebhookNotifications } from '@/lib/meta/leads/handoff';
import { recordRejectedMetaWebhook } from '@/lib/meta/leads/receipt';
import { META_LEAD_WEBHOOK_MAX_BYTES } from '@/lib/meta/leads/types';
import {
  metaWebhookEnvelopeFailureResponse,
  metaWebhookHandoffResponse,
  metaWebhookHandoffUnavailableResponse,
  metaWebhookRequestFailureResponse,
  parseAndNormalizeMetaWebhookNotifications,
  readAndVerifyMetaWebhookRequest,
  verifyMetaWebhookChallengeRequest,
} from '@/lib/meta-platform/transports/webhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const config = getMetaLeadConfig();
  const result = verifyMetaWebhookChallengeRequest({
    searchParams: request.nextUrl.searchParams,
    expectedToken: config.webhookVerifyToken,
  });
  if (!result.ok) return NextResponse.json({ error: 'Webhook verification failed', code: result.code }, { status: 403 });
  return new NextResponse(result.challenge, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

export async function POST(request: NextRequest) {
  const config = getMetaLeadConfig();
  const transport = await readAndVerifyMetaWebhookRequest({
    request,
    appSecret: config.appSecret,
    maxBytes: META_LEAD_WEBHOOK_MAX_BYTES,
  });
  if (!transport.ok) {
    if (transport.payloadDigest) {
      await recordRejectedMetaWebhook({ payloadDigest: transport.payloadDigest, code: transport.code }).catch(() => undefined);
    }
    const failure = metaWebhookRequestFailureResponse(transport);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  let parsed: ReturnType<typeof parseAndNormalizeMetaWebhookNotifications>;
  try {
    parsed = parseAndNormalizeMetaWebhookNotifications({
      rawBody: transport.rawBody,
      maxBytes: META_LEAD_WEBHOOK_MAX_BYTES,
      expectedPayloadDigest: transport.payloadDigest,
    });
  } catch (error) {
    const failure = metaWebhookEnvelopeFailureResponse(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  try {
    const summary = await handoffMetaLeadWebhookNotifications({
      events: parsed.notifications,
      rawPayload: parsed.envelope,
      expectedPageId: config.pageId,
      allowedFormIds: config.allowedFormIds,
    });
    return NextResponse.json(metaWebhookHandoffResponse(summary), { status: 200 });
  } catch {
    const failure = metaWebhookHandoffUnavailableResponse();
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
