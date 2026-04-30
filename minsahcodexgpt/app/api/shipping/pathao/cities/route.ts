import { NextResponse } from 'next/server';
import { extractPathaoArray, getPathaoBaseUrl, pathaoRequest } from '@/lib/pathao';

export const dynamic = 'force-dynamic';

function normalizeCity(item: unknown): { id: number; name: string } | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  const source = item as Record<string, unknown>;
  const id = Number(source.city_id ?? source.id);
  const name = typeof source.city_name === 'string'
    ? source.city_name.trim()
    : typeof source.name === 'string'
      ? source.name.trim()
      : '';

  if (!id || !name) {
    return null;
  }

  return { id, name };
}

export async function GET() {
  try {
    const endpointPath = '/aladdin/api/v1/city-list';
    const response = await pathaoRequest<unknown>(
      endpointPath,
      undefined,
      'GET'
    );
    const cities = extractPathaoArray(response)
      .map(normalizeCity)
      .filter((city): city is { id: number; name: string } => !!city);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Pathao cities] normalized response', {
        baseUrl: getPathaoBaseUrl(),
        path: endpointPath,
        count: cities.length,
      });
    }

    return NextResponse.json(cities);
  } catch (error) {
    console.error('GET /api/shipping/pathao/cities failed:', error);
    return NextResponse.json(
      { error: 'PATHAO_CITIES_FAILED', message: 'Pathao cities could not be loaded. Please try again.' },
      { status: 502 }
    );
  }
}
