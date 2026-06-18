import { NextRequest, NextResponse } from 'next/server';
import { fetchPathaoLocationTree } from '@/lib/pathao-locations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const flat = url.searchParams.get('flat') === '1';
    const locations = await fetchPathaoLocationTree();

    const counts = locations.reduce(
      (summary, city) => {
        summary.cities += 1;
        summary.zones += city.zones.length;
        summary.areas += city.zones.reduce((total, zone) => total + zone.areas.length, 0);
        return summary;
      },
      { cities: 0, zones: 0, areas: 0 }
    );

    if (flat) {
      return NextResponse.json({
        counts,
        locations: locations.flatMap((city) =>
          city.zones.flatMap((zone) =>
            zone.areas.map((area) => ({
              cityId: city.id,
              cityName: city.name,
              zoneId: zone.id,
              zoneName: zone.name,
              areaId: area.id,
              areaName: area.name,
              homeDeliveryAvailable: area.homeDeliveryAvailable,
              pickupAvailable: area.pickupAvailable,
            }))
          )
        ),
      });
    }

    return NextResponse.json({ counts, locations });
  } catch (error) {
    console.error('GET /api/shipping/pathao/locations failed:', error);
    return NextResponse.json(
      {
        error: 'PATHAO_LOCATIONS_FAILED',
        message: 'Pathao city, zone and area list could not be loaded.',
      },
      { status: 502 }
    );
  }
}
