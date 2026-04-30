import { NextRequest, NextResponse } from 'next/server';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';
import { getPathaoBaseUrl } from '@/lib/pathao';

export const dynamic = 'force-dynamic';

const REQUIRED_INTEGRATION_SECRET = 'f3992ecc-59da-4cbe-a049-a13da2018d51';

function configStatus(request: NextRequest) {
  return {
    callbackUrl: `${request.nextUrl.origin}/api/webhooks/pathao`,
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
    requiredIntegrationSecret: REQUIRED_INTEGRATION_SECRET,
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
        ok: response.status === 202 && headerValue === REQUIRED_INTEGRATION_SECRET,
        status: response.status,
        headerMatched: headerValue === REQUIRED_INTEGRATION_SECRET,
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
