export function normalizePathaoAvailabilityFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'available', 'enabled'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'unavailable', 'disabled'].includes(normalized)) return false;
  }

  return Boolean(value);
}
