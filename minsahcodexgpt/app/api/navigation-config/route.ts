import { NextResponse } from 'next/server';
import { getMobileNavigationConfig } from '@/lib/navigation/config-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getMobileNavigationConfig();
    return NextResponse.json(
      { success: true, config },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch navigation config' },
      { status: 500 }
    );
  }
}

