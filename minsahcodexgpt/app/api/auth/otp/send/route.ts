import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestPhoneOtp } from '@/lib/auth/phone-otp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      phone?: unknown;
      purpose?: unknown;
      deviceId?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON request body', code: 'INVALID_BODY' },
        { status: 400 }
      );
    }

    const result = await requestPhoneOtp({
      phone: body.phone,
      purpose: body.purpose,
      ip: getClientIp(request),
      deviceId: body.deviceId ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          ...(result.retryAfter ? { retryAfter: result.retryAfter } : {}),
        },
        {
          status: result.status,
          headers: {
            'Cache-Control': 'no-store',
            ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
          },
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        maskedPhone: result.maskedPhone,
        cooldownSeconds: result.cooldownSeconds,
        expiresInSeconds: result.expiresInSeconds,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[POST /api/auth/otp/send] Error:', err);
    return NextResponse.json(
      { error: 'Unable to send verification code. Please try again.', code: 'OTP_SEND_ERROR' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
