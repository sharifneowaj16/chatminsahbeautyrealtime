import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPhoneOtp } from '@/lib/auth/phone-otp';

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
      otp?: unknown;
      purpose?: unknown;
      fullName?: string;
      email?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON request body', code: 'INVALID_BODY' },
        { status: 400 }
      );
    }

    const result = await verifyPhoneOtp({
      phone: body.phone,
      otp: body.otp,
      purpose: body.purpose,
      ip: getClientIp(request),
      fullName: body.fullName,
      email: body.email,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          ...(result.attemptsLeft !== undefined ? { attemptsLeft: result.attemptsLeft } : {}),
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
        phone: result.phone,
        otpProof: result.otpProof,
        expiresInSeconds: result.expiresInSeconds,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[POST /api/auth/otp/verify] Error:', err);
    return NextResponse.json(
      { error: 'Unable to verify code. Please try again.', code: 'OTP_VERIFY_ERROR' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
