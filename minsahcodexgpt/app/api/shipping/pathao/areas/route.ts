import { NextRequest, NextResponse } from 'next/server';
import { extractPathaoArray, getPathaoBaseUrl, pathaoRequest } from '@/lib/pathao';

export const dynamic = 'force-dynamic';

function normalizeArea(item: unknown) {
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
    homeDeliveryAvailable: Boolean(source.home_delivery_available),
    pickupAvailable: Boolean(source.pickup_available),
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

    const endpointPath = `/aladdin/api/v1/zones/${zoneId}/area-list`;
    const response = await pathaoRequest<unknown>(endpointPath, undefined, 'GET');
    const areas = extractPathaoArray(response)
      .map(normalizeArea)
      .filter(
        (area): area is { id: number; name: string; homeDeliveryAvailable: boolean; pickupAvailable: boolean } =>
          !!area
      );

    if (process.env.NODE_ENV === 'development') {
      console.log('[Pathao areas] normalized response', {
        baseUrl: getPathaoBaseUrl(),
        path: endpointPath,
        zoneId,
        count: areas.length,
      });
    }

    return NextResponse.json(areas);
  } catch (error) {
    console.error('GET /api/shipping/pathao/areas failed:', error);
    return NextResponse.json(
      { error: 'PATHAO_AREAS_FAILED', message: 'Pathao areas could not be loaded. Please try again.' },
      { status: 502 }
    );
  }
}
