import { NextRequest, NextResponse } from 'next/server';
import { pathaoRequest } from '@/lib/pathao';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cityId = Number(new URL(request.url).searchParams.get('city_id'));
    if (!cityId) {
      return NextResponse.json({ zones: [], error: 'CITY_ID_REQUIRED' }, { status: 400 });
    }

    const response = await pathaoRequest<{ data?: Array<{ zone_id: number; zone_name: string }> }>(
      `/aladdin/api/v1/cities/${cityId}/zone-list`
    );
    return NextResponse.json({ zones: response.data ?? [] });
  } catch (error) {
    console.error('GET /api/shipping/pathao/zones failed:', error);
    return NextResponse.json({ zones: [], error: 'PATHAO_ZONES_FAILED' }, { status: 502 });
  }
}
