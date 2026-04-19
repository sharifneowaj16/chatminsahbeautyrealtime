import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { buildPublicUrl } from '@/lib/privacy-policy';
import { anonymizeUserDataForMetaRequest } from '@/lib/user-data-deletion';

export const runtime = 'nodejs';

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64');
}

function parseSignedRequest(signedRequest: string) {
  const [encodedSignature, encodedPayload] = signedRequest.split('.');

  if (!encodedSignature || !encodedPayload) {
    throw new Error('Invalid signed_request payload');
  }

  const rawPayload = decodeBase64Url(encodedPayload).toString('utf8');
  const payload = JSON.parse(rawPayload) as {
    algorithm?: string;
    user_id?: string;
  };

  if (payload.algorithm && payload.algorithm.toUpperCase() !== 'HMAC-SHA256') {
    throw new Error('Unsupported Meta signature algorithm');
  }

  const secret = process.env.FACEBOOK_CLIENT_SECRET;
  if (secret) {
    const receivedSignature = decodeBase64Url(encodedSignature);
    const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest();

    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      throw new Error('Invalid Meta signature');
    }
  }

  return payload;
}

async function readRequestBody(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();
    return {
      signedRequest: formData.get('signed_request')?.toString() ?? null,
      email:
        formData.get('email')?.toString() ??
        formData.get('account_email')?.toString() ??
        formData.get('user_email')?.toString() ??
        null,
      facebookUserId:
        formData.get('user_id')?.toString() ??
        formData.get('facebook_user_id')?.toString() ??
        null,
    };
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  return {
    signedRequest: typeof body?.signed_request === 'string' ? body.signed_request : null,
    email:
      typeof body?.email === 'string'
        ? body.email
        : typeof body?.account_email === 'string'
          ? body.account_email
          : typeof body?.user_email === 'string'
            ? body.user_email
            : null,
    facebookUserId:
      typeof body?.user_id === 'string'
        ? body.user_id
        : typeof body?.userId === 'string'
          ? body.userId
          : typeof body?.facebookUserId === 'string'
            ? body.facebookUserId
            : null,
  };
}

function createConfirmationCode() {
  return `DEL-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Submit a POST request to this endpoint for Meta data deletion callbacks.',
      delete_data_page: buildPublicUrl('/delete-data'),
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  try {
    const parsedBody = await readRequestBody(request);
    const requireSignedRequest = process.env.NODE_ENV === 'production';

    if (requireSignedRequest && !parsedBody.signedRequest) {
      throw new Error('signed_request is required for production data deletion callbacks');
    }

    const signedPayload = parsedBody.signedRequest
      ? parseSignedRequest(parsedBody.signedRequest)
      : null;

    const facebookUserId =
      signedPayload?.user_id ??
      (!requireSignedRequest ? parsedBody.facebookUserId : null) ??
      null;
    const email = !requireSignedRequest ? parsedBody.email ?? null : null;

    await anonymizeUserDataForMetaRequest({ facebookUserId, email });

    const confirmationCode = createConfirmationCode();
    const statusUrl = buildPublicUrl(`/delete-data/status/${confirmationCode}`);

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process deletion request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
