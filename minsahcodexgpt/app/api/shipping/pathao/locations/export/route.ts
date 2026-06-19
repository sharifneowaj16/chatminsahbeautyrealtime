import { NextRequest } from 'next/server';
import {
  fetchPathaoAreas,
  fetchPathaoCities,
  fetchPathaoZones,
  type PathaoArea,
  type PathaoCity,
  type PathaoZone,
} from '@/lib/pathao-locations';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type ExportCounts = {
  cities: number;
  zones: number;
  areas: number;
  errors: number;
};

type ZoneWithAreas = PathaoZone & {
  areas: PathaoArea[];
  error?: string;
};

const encoder = new TextEncoder();

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(task: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await wait(500 * (attempt + 1));
      }
    }
  }

  throw lastError;
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

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function loadZoneWithAreas(zone: PathaoZone, counts: ExportCounts): Promise<ZoneWithAreas> {
  counts.zones += 1;

  try {
    const areas = await withRetry(() => fetchPathaoAreas(zone.id));
    counts.areas += areas.length;
    return { ...zone, areas };
  } catch (error) {
    counts.errors += 1;
    return { ...zone, areas: [], error: toErrorMessage(error) };
  }
}

function createNestedLocationStream() {
  const counts: ExportCounts = { cities: 0, zones: 0, areas: 0, errors: 0 };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      write(`{"generatedAt":${JSON.stringify(new Date().toISOString())},"format":"nested","locations":[`);

      try {
        const cities = await withRetry(() => fetchPathaoCities());
        let firstCity = true;

        for (const city of cities) {
          counts.cities += 1;

          let zones: PathaoZone[] = [];
          let cityError: string | undefined;

          try {
            zones = await withRetry(() => fetchPathaoZones(city.id));
          } catch (error) {
            counts.errors += 1;
            cityError = toErrorMessage(error);
          }

          const zonesWithAreas = await mapWithConcurrency(zones, 4, (zone) =>
            loadZoneWithAreas(zone, counts)
          );
          const cityPayload: PathaoCity & { zones: ZoneWithAreas[]; error?: string } = {
            ...city,
            zones: zonesWithAreas,
            ...(cityError ? { error: cityError } : {}),
          };

          write(`${firstCity ? '' : ','}${JSON.stringify(cityPayload)}`);
          firstCity = false;
        }

        write(`],"counts":${JSON.stringify(counts)}}`);
      } catch (error) {
        counts.errors += 1;
        write(
          `],"counts":${JSON.stringify(counts)},"fatalError":${JSON.stringify(toErrorMessage(error))}}`
        );
      } finally {
        controller.close();
      }
    },
  });
}

function createFlatLocationStream() {
  const counts: ExportCounts = { cities: 0, zones: 0, areas: 0, errors: 0 };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      write(`{"generatedAt":${JSON.stringify(new Date().toISOString())},"format":"flat","locations":[`);

      try {
        const cities = await withRetry(() => fetchPathaoCities());
        let firstRow = true;

        for (const city of cities) {
          counts.cities += 1;

          let zones: PathaoZone[] = [];
          try {
            zones = await withRetry(() => fetchPathaoZones(city.id));
          } catch {
            counts.errors += 1;
            continue;
          }

          const zonesWithAreas = await mapWithConcurrency(zones, 4, (zone) =>
            loadZoneWithAreas(zone, counts)
          );

          for (const zone of zonesWithAreas) {
            for (const area of zone.areas) {
              const row = {
                cityId: city.id,
                cityName: city.name,
                zoneId: zone.id,
                zoneName: zone.name,
                areaId: area.id,
                areaName: area.name,
                homeDeliveryAvailable: area.homeDeliveryAvailable,
                pickupAvailable: area.pickupAvailable,
              };

              write(`${firstRow ? '' : ','}${JSON.stringify(row)}`);
              firstRow = false;
            }
          }
        }

        write(`],"counts":${JSON.stringify(counts)}}`);
      } catch (error) {
        counts.errors += 1;
        write(
          `],"counts":${JSON.stringify(counts)},"fatalError":${JSON.stringify(toErrorMessage(error))}}`
        );
      } finally {
        controller.close();
      }
    },
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const flat = url.searchParams.get('flat') === '1';
  const filename = flat ? 'pathao-locations-flat.json' : 'pathao-locations.json';

  return new Response(flat ? createFlatLocationStream() : createNestedLocationStream(), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Accel-Buffering': 'no',
    },
  });
}
