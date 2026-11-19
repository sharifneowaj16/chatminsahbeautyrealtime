import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPathaoAreas,
  fetchPathaoCities,
  fetchPathaoLocationTree,
  fetchPathaoZones,
} from '@/lib/pathao-locations';
import { cacheGet, cacheSet } from '@/lib/cache/redis';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PATHAO_LOCATIONS_TTL_SECONDS = 60 * 60 * 6; // 6h

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const flat = url.searchParams.get('flat') === '1';
    const all = url.searchParams.get('all') === '1';
    const includeAreas = url.searchParams.get('include_areas') === '1';
    const cityId = Number(url.searchParams.get('city_id'));
    const zoneId = Number(url.searchParams.get('zone_id'));

    const cacheKey = `pathao:v1:locations:c=${cityId || 0}:z=${zoneId || 0}:a=${all ? 1 : 0}:ia=${includeAreas ? 1 : 0}:f=${flat ? 1 : 0}`;
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=21600' },
      });
    }

    const respondAndCache = (payload: Record<string, unknown>, shouldCache: boolean) => {
      if (shouldCache) {
        void cacheSet(cacheKey, payload, PATHAO_LOCATIONS_TTL_SECONDS);
      }
      return NextResponse.json(payload, {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=21600' },
      });
    };

    if (zoneId) {
      const areas = await fetchPathaoAreas(zoneId);
      return respondAndCache(
        {
          counts: { cities: 0, zones: 1, areas: areas.length },
          areas,
        },
        areas.length > 0
      );
    }

    if (cityId) {
      const zones = await fetchPathaoZones(cityId);

      if (!includeAreas) {
        return respondAndCache(
          {
            message: 'Use ?zone_id=ID to load areas for one zone, or add &include_areas=1 to load all areas for this city.',
            counts: { cities: 1, zones: zones.length, areas: 0 },
            cityId,
            zones,
          },
          zones.length > 0
        );
      }

      const zonesWithAreas = await Promise.all(
        zones.map(async (zone) => ({
          ...zone,
          areas: await fetchPathaoAreas(zone.id),
        }))
      );

      const totalAreas = zonesWithAreas.reduce((total, zone) => total + zone.areas.length, 0);

      if (flat) {
        return respondAndCache(
          {
            counts: {
              cities: 1,
              zones: zonesWithAreas.length,
              areas: totalAreas,
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
          },
          zonesWithAreas.length > 0
        );
      }

      return respondAndCache(
        {
          counts: {
            cities: 1,
            zones: zonesWithAreas.length,
            areas: totalAreas,
          },
          cityId,
          zones: zonesWithAreas,
        },
        zonesWithAreas.length > 0
      );
    }

    if (!all) {
      const cities = await fetchPathaoCities();
      return respondAndCache(
        {
          message: 'Use ?city_id=ID to load zones, then ?zone_id=ID to load areas. Use ?all=1 only for the full tree.',
          counts: { cities: cities.length, zones: 0, areas: 0 },
          cities,
        },
        cities.length > 0
      );
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
      return respondAndCache(
        {
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
        },
        counts.cities > 0
      );
    }

    return respondAndCache({ counts, locations }, counts.cities > 0);
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
