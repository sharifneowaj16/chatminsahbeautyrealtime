import { fetchPathaoAreas, type PathaoArea } from '@/lib/pathao-locations';
import { cacheGet, cacheSet } from '@/lib/cache/redis';

const PATHAO_AREAS_TTL_SECONDS = 60 * 60 * 12;

export class PathaoAreaAvailabilityError extends Error {
  status: number;
  code: string;

  constructor(message: string, code = 'PATHAO_AREA_UNAVAILABLE', status = 400) {
    super(message);
    this.name = 'PathaoAreaAvailabilityError';
    this.code = code;
    this.status = status;
  }
}

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function verifyPathaoHomeDeliveryArea(params: {
  pathaoZoneId?: number | null;
  pathaoAreaId?: number | null;
  selectedAreaName?: string | null;
}): Promise<PathaoArea | null> {
  const pathaoZoneId = toPositiveInt(params.pathaoZoneId);
  const pathaoAreaId = toPositiveInt(params.pathaoAreaId);

  if (!pathaoZoneId) {
    throw new PathaoAreaAvailabilityError(
      'Please select a valid city and zone for delivery.',
      'PATHAO_LOCATION_REQUIRED',
    );
  }

  let areas: PathaoArea[];
  try {
    const cacheKey = `pathao:v1:areas:${pathaoZoneId}`;
    const cached = await cacheGet<PathaoArea[]>(cacheKey);
    if (cached && cached.length > 0) {
      areas = cached;
    } else {
      areas = await fetchPathaoAreas(pathaoZoneId);
      if (areas.length > 0) {
        void cacheSet(cacheKey, areas, PATHAO_AREAS_TTL_SECONDS);
      }
    }
  } catch (error) {
    console.error('Pathao area availability check failed:', error);
    throw new PathaoAreaAvailabilityError(
      'Could not verify delivery area right now. Please try again.',
      'PATHAO_AREA_VERIFY_FAILED',
      502,
    );
  }

  // Some Pathao zones have no sub-areas (empty area-list). Zone-level delivery is valid.
  if (areas.length === 0) {
    return null;
  }

  if (!pathaoAreaId) {
    throw new PathaoAreaAvailabilityError(
      'Please select a valid delivery area for this zone.',
      'PATHAO_LOCATION_REQUIRED',
    );
  }

  const area = areas.find((candidate) => candidate.id === pathaoAreaId);
  if (!area) {
    throw new PathaoAreaAvailabilityError(
      'Selected area does not belong to the selected zone. Please choose the area again.',
      'PATHAO_AREA_ZONE_MISMATCH',
    );
  }

  if (!area.homeDeliveryAvailable) {
    throw new PathaoAreaAvailabilityError(
      `Home delivery is not available in ${area.name}. Please select another area.`,
      'PATHAO_HOME_DELIVERY_UNAVAILABLE',
    );
  }

  const selectedAreaName = params.selectedAreaName?.trim();
  if (selectedAreaName && selectedAreaName.toLowerCase() !== area.name.trim().toLowerCase()) {
    throw new PathaoAreaAvailabilityError(
      'Selected area name does not match Pathao area ID. Please choose the area again.',
      'PATHAO_AREA_NAME_MISMATCH',
    );
  }

  return area;
}
