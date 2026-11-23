import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json(
    {
      error: 'Legacy verify endpoint has been retired. Please sign in through the unified login flow.',
      code: 'LEGACY_AUTH_RETIRED',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );

  for (const name of ['auth_token', 'refresh_token', 'user_id']) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      maxAge: 0,
      path: '/',
    });
  }

  return response;
}
