import { NextRequest, NextResponse } from 'next/server';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';
import { getPathaoBaseUrl } from '@/lib/pathao';
import {
  DEFAULT_PATHAO_WEBHOOK_INTEGRATION_SECRET,
  getPathaoWebhookCallbackUrl,
  getPathaoWebhookIntegrationSecret,
} from '@/lib/pathao-webhook';

export const dynamic = 'force-dynamic';

function configStatus(request: NextRequest) {
  const integrationSecret = getPathaoWebhookIntegrationSecret();

  return {
    callbackUrl: getPathaoWebhookCallbackUrl(request.nextUrl.origin),
    baseUrl: getPathaoBaseUrl(),
    credentialsConfigured: Boolean(
      process.env.PATHAO_CLIENT_ID &&
        process.env.PATHAO_CLIENT_SECRET &&
        process.env.PATHAO_USERNAME &&
        process.env.PATHAO_PASSWORD
    ),
    storeConfigured: Boolean(process.env.PATHAO_STORE_ID),
    webhookSecretConfigured: Boolean(process.env.PATHAO_WEBHOOK_SECRET?.trim()),
    integrationSecretConfigured: Boolean(process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET?.trim()),
    requiredIntegrationSecret: integrationSecret,
    usingDefaultIntegrationSecret: integrationSecret === DEFAULT_PATHAO_WEBHOOK_INTEGRATION_SECRET,
  };
}

export async function GET(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  return NextResponse.json(configStatus(request));
}

export async function POST(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) return adminUnauthorizedResponse();

  const status = configStatus(request);
  try {
    const response = await fetch(status.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'webhook_integration' }),
      cache: 'no-store',
    });
    const headerValue = response.headers.get('X-Pathao-Merchant-Webhook-Integration-Secret');

    return NextResponse.json({
      ...status,
      test: {
        ok: response.status === 202 && headerValue === status.requiredIntegrationSecret,
        status: response.status,
        headerMatched: headerValue === status.requiredIntegrationSecret,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ...status,
        test: {
          ok: false,
          error: error instanceof Error ? error.message : 'Webhook test failed',
        },
      },
      { status: 502 }
    );
  }
}
