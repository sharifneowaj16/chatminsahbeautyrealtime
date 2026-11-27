import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const measurementId = (
    process.env.GA4_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    ''
  ).trim();

  const enabled =
    process.env.NEXT_PUBLIC_GA_ENABLED !== 'false' && Boolean(measurementId);

  return NextResponse.json(
    { enabled, measurementId: enabled ? measurementId : '' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
