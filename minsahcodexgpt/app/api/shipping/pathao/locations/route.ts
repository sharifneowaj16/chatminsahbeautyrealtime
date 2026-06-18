import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPathaoAreas,
  fetchPathaoCities,
  fetchPathaoLocationTree,
  fetchPathaoZones,
} from '@/lib/pathao-locations';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const flat = url.searchParams.get('flat') === '1';
    const all = url.searchParams.get('all') === '1';
    const includeAreas = url.searchParams.get('include_areas') === '1';
    const cityId = Number(url.searchParams.get('city_id'));
    const zoneId = Number(url.searchParams.get('zone_id'));

    if (zoneId) {
      const areas = await fetchPathaoAreas(zoneId);
      return NextResponse.json({
        counts: { cities: 0, zones: 1, areas: areas.length },
        areas,
      });
    }

    if (cityId) {
      const zones = await fetchPathaoZones(cityId);

      if (!includeAreas) {
        return NextResponse.json({
          message: 'Use ?zone_id=ID to load areas for one zone, or add &include_areas=1 to load all areas for this city.',
          counts: { cities: 1, zones: zones.length, areas: 0 },
          cityId,
          zones,
        });
      }

      const zonesWithAreas = await Promise.all(
        zones.map(async (zone) => ({
          ...zone,
          areas: await fetchPathaoAreas(zone.id),
        }))
      );

      if (flat) {
        return NextResponse.json({
          counts: {
            cities: 1,
            zones: zonesWithAreas.length,
            areas: zonesWithAreas.reduce((total, zone) => total + zone.areas.length, 0),
          },
          locations: zonesWithAreas.flatMap((zone) =>
            zone.areas.map((area) => ({
              cityId,
              zoneId: zone.id,
              zoneName: zone.name,
              areaId: area.id,
              areaName: area.name,
              homeDeliveryAvailable: area.homeDeliveryAvailable,
              pickupAvailable: area.pickupAvailable,
            }))
          ),
        });
      }

      return NextResponse.json({
        counts: {
          cities: 1,
          zones: zonesWithAreas.length,
          areas: zonesWithAreas.reduce((total, zone) => total + zone.areas.length, 0),
        },
        cityId,
        zones: zonesWithAreas,
      });
    }

    if (!all) {
      const cities = await fetchPathaoCities();
      return NextResponse.json({
        message: 'Use ?city_id=ID to load zones, then ?zone_id=ID to load areas. Use ?all=1 only for the full tree.',
        counts: { cities: cities.length, zones: 0, areas: 0 },
        cities,
      });
    }

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
