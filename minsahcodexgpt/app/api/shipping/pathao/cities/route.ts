import { NextResponse } from 'next/server';
import { extractPathaoArray, getPathaoBaseUrl, pathaoRequest } from '@/lib/pathao';
import { cacheGet, cacheSet } from '@/lib/cache/redis';

export const dynamic = 'force-dynamic';

const PATHAO_CITIES_CACHE_KEY = 'pathao:v1:cities';
const PATHAO_CITIES_TTL_SECONDS = 60 * 60 * 12; // 12h

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
    const cached = await cacheGet<Array<{ id: number; name: string }>>(PATHAO_CITIES_CACHE_KEY);
    if (cached && cached.length > 0) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=43200' },
      });
    }

    const endpointPath = '/aladdin/api/v1/city-list';
    const response = await pathaoRequest<unknown>(
      endpointPath,
      undefined,
      'GET'
    );
    const cities = extractPathaoArray(response)
      .map(normalizeCity)
      .filter((city): city is { id: number; name: string } => !!city);

    if (cities.length > 0) {
      void cacheSet(PATHAO_CITIES_CACHE_KEY, cities, PATHAO_CITIES_TTL_SECONDS);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Pathao cities] normalized response', {
        baseUrl: getPathaoBaseUrl(),
        path: endpointPath,
        count: cities.length,
      });
    }

    return NextResponse.json(cities, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=43200' },
    });
  } catch (error) {
    console.error('GET /api/shipping/pathao/cities failed:', error);
    return NextResponse.json(
      { error: 'PATHAO_CITIES_FAILED', message: 'Pathao cities could not be loaded. Please try again.' },
      { status: 502 }
    );
  }
}
