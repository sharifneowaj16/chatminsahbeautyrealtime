import { NextRequest, NextResponse } from 'next/server';
import { extractPathaoArray, getPathaoBaseUrl, pathaoRequest } from '@/lib/pathao';
import { normalizePathaoAvailabilityFlag } from '@/lib/pathao-availability-flags';
import { cacheGet, cacheSet } from '@/lib/cache/redis';

export const dynamic = 'force-dynamic';

const PATHAO_AREAS_TTL_SECONDS = 60 * 60 * 12; // 12h

type PathaoArea = {
  id: number;
  name: string;
  homeDeliveryAvailable: boolean;
  pickupAvailable: boolean;
};

function normalizeArea(item: unknown): PathaoArea | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  const source = item as Record<string, unknown>;
  const id = Number(source.area_id ?? source.id);
  const name =
    typeof source.area_name === 'string'
      ? source.area_name.trim()
      : typeof source.name === 'string'
        ? source.name.trim()
        : '';

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    homeDeliveryAvailable: normalizePathaoAvailabilityFlag(source.home_delivery_available),
    pickupAvailable: normalizePathaoAvailabilityFlag(source.pickup_available),
  };
}

export async function GET(request: NextRequest) {
  try {
    const zoneId = Number(new URL(request.url).searchParams.get('zone_id'));
    if (!zoneId) {
      return NextResponse.json(
        { error: 'ZONE_ID_REQUIRED', message: 'Please select a Pathao zone first.' },
        { status: 400 }
      );
    }

    const cacheKey = `pathao:v1:areas:${zoneId}`;
    const cached = await cacheGet<PathaoArea[]>(cacheKey);
    if (cached && cached.length > 0) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=43200' },
      });
    }

    const endpointPath = `/aladdin/api/v1/zones/${zoneId}/area-list`;
    const response = await pathaoRequest<unknown>(endpointPath, undefined, 'GET');
    const areas = extractPathaoArray(response)
      .map(normalizeArea)
      .filter((area): area is PathaoArea => !!area);

    if (areas.length > 0) {
      void cacheSet(cacheKey, areas, PATHAO_AREAS_TTL_SECONDS);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Pathao areas] normalized response', {
        baseUrl: getPathaoBaseUrl(),
        path: endpointPath,
        zoneId,
        count: areas.length,
      });
    }

    return NextResponse.json(areas, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=43200' },
    });
  } catch (error) {
    console.error('GET /api/shipping/pathao/areas failed:', error);
    return NextResponse.json(
      { error: 'PATHAO_AREAS_FAILED', message: 'Pathao areas could not be loaded. Please try again.' },
      { status: 502 }
    );
  }
}
