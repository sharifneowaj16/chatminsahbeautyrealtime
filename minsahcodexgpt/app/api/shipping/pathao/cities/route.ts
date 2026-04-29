import { NextResponse } from 'next/server';
import { pathaoRequest } from '@/lib/pathao';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await pathaoRequest<{ data?: Array<{ city_id: number; city_name: string }> }>(
      '/aladdin/api/v1/cities/1'
    );
    return NextResponse.json({ cities: response.data ?? [] });
  } catch (error) {
    console.error('GET /api/shipping/pathao/cities failed:', error);
    return NextResponse.json({ cities: [], error: 'PATHAO_CITIES_FAILED' }, { status: 502 });
  }
}
