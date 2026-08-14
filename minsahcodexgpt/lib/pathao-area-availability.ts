import { fetchPathaoAreas, type PathaoArea } from '@/lib/pathao-locations';

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
}): Promise<PathaoArea> {
  const pathaoZoneId = toPositiveInt(params.pathaoZoneId);
  const pathaoAreaId = toPositiveInt(params.pathaoAreaId);

  if (!pathaoZoneId || !pathaoAreaId) {
    throw new PathaoAreaAvailabilityError(
      'Please select a valid city, zone and area for delivery.',
      'PATHAO_LOCATION_REQUIRED',
    );
  }

  let areas: PathaoArea[];
  try {
    areas = await fetchPathaoAreas(pathaoZoneId);
  } catch (error) {
    console.error('Pathao area availability check failed:', error);
    throw new PathaoAreaAvailabilityError(
      'Could not verify delivery area right now. Please try again.',
      'PATHAO_AREA_VERIFY_FAILED',
      502,
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
