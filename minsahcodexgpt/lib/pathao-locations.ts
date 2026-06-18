import { extractPathaoArray, pathaoRequest } from '@/lib/pathao';

export interface PathaoCity {
  id: number;
  name: string;
}

export interface PathaoZone {
  id: number;
  name: string;
}

export interface PathaoArea {
  id: number;
  name: string;
  homeDeliveryAvailable: boolean;
  pickupAvailable: boolean;
}

export interface PathaoLocationTreeCity extends PathaoCity {
  zones: Array<PathaoZone & { areas: PathaoArea[] }>;
}

function normalizeCity(item: unknown): PathaoCity | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;

  const source = item as Record<string, unknown>;
  const id = Number(source.city_id ?? source.id);
  const name =
    typeof source.city_name === 'string'
      ? source.city_name.trim()
      : typeof source.name === 'string'
        ? source.name.trim()
        : '';

  return id && name ? { id, name } : null;
}

function normalizeZone(item: unknown): PathaoZone | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;

  const source = item as Record<string, unknown>;
  const id = Number(source.zone_id ?? source.id);
  const name =
    typeof source.zone_name === 'string'
      ? source.zone_name.trim()
      : typeof source.name === 'string'
        ? source.name.trim()
        : '';

  return id && name ? { id, name } : null;
}

function normalizeArea(item: unknown): PathaoArea | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;

  const source = item as Record<string, unknown>;
  const id = Number(source.area_id ?? source.id);
  const name =
    typeof source.area_name === 'string'
      ? source.area_name.trim()
      : typeof source.name === 'string'
        ? source.name.trim()
        : '';

  return id && name
    ? {
        id,
        name,
        homeDeliveryAvailable: Boolean(source.home_delivery_available),
        pickupAvailable: Boolean(source.pickup_available),
      }
    : null;
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<TResult>
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function fetchPathaoCities(): Promise<PathaoCity[]> {
  const response = await pathaoRequest<unknown>('/aladdin/api/v1/city-list', undefined, 'GET');
  return extractPathaoArray(response)
    .map(normalizeCity)
    .filter((city): city is PathaoCity => !!city);
}

export async function fetchPathaoZones(cityId: number): Promise<PathaoZone[]> {
  const response = await pathaoRequest<unknown>(
    `/aladdin/api/v1/cities/${cityId}/zone-list`,
    undefined,
    'GET'
  );
  return extractPathaoArray(response)
    .map(normalizeZone)
    .filter((zone): zone is PathaoZone => !!zone);
}

export async function fetchPathaoAreas(zoneId: number): Promise<PathaoArea[]> {
  const response = await pathaoRequest<unknown>(
    `/aladdin/api/v1/zones/${zoneId}/area-list`,
    undefined,
    'GET'
  );
  return extractPathaoArray(response)
    .map(normalizeArea)
    .filter((area): area is PathaoArea => !!area);
}

export async function fetchPathaoLocationTree(): Promise<PathaoLocationTreeCity[]> {
  const cities = await fetchPathaoCities();

  return mapWithConcurrency(cities, 3, async (city) => {
    const zones = await fetchPathaoZones(city.id);
    const zonesWithAreas = await mapWithConcurrency(zones, 5, async (zone) => ({
      ...zone,
      areas: await fetchPathaoAreas(zone.id),
    }));

    return {
      ...city,
      zones: zonesWithAreas,
    };
  });
}
