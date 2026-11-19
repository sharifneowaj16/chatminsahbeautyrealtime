import { NextRequest, NextResponse } from 'next/server';
import { extractPathaoArray, getPathaoBaseUrl, pathaoRequest } from '@/lib/pathao';
import { cacheGet, cacheSet } from '@/lib/cache/redis';

export const dynamic = 'force-dynamic';

const PATHAO_ZONES_TTL_SECONDS = 60 * 60 * 12; // 12h

function normalizeZone(item: unknown): { id: number; name: string } | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  const source = item as Record<string, unknown>;
  const id = Number(source.zone_id ?? source.id);
  const name = typeof source.zone_name === 'string'
    ? source.zone_name.trim()
    : typeof source.name === 'string'
      ? source.name.trim()
      : '';

  if (!id || !name) {
    return null;
  }

  return { id, name };
}

export async function GET(request: NextRequest) {
  try {
    const cityId = Number(new URL(request.url).searchParams.get('city_id'));
    if (!cityId) {
      return NextResponse.json({ error: 'CITY_ID_REQUIRED', message: 'Please select a Pathao city first.' }, { status: 400 });
    }

    const cacheKey = `pathao:v1:zones:${cityId}`;
    const cached = await cacheGet<Array<{ id: number; name: string }>>(cacheKey);
    if (cached && cached.length > 0) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=43200' },
      });
    }

    const endpointPath = `/aladdin/api/v1/cities/${cityId}/zone-list`;
    const response = await pathaoRequest<unknown>(
      endpointPath,
      undefined,
      'GET'
    );
    const zones = extractPathaoArray(response)
      .map(normalizeZone)
      .filter((zone): zone is { id: number; name: string } => !!zone);

    if (zones.length > 0) {
      void cacheSet(cacheKey, zones, PATHAO_ZONES_TTL_SECONDS);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Pathao zones] normalized response', {
        baseUrl: getPathaoBaseUrl(),
        path: endpointPath,
        cityId,
        count: zones.length,
      });
    }

    return NextResponse.json(zones, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=43200' },
    });
  } catch (error) {
    console.error('GET /api/shipping/pathao/zones failed:', error);
    return NextResponse.json(
      { error: 'PATHAO_ZONES_FAILED', message: 'Pathao zones could not be loaded. Please try again.' },
      { status: 502 }
    );
  }
}
