function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cleanMetaAdsObject(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export function toMetaAdsMinorAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new TypeError('META_ADS_AMOUNT_INVALID');
  return Math.round(value * 100);
}

export function normalizeMetaTargeting(value: unknown): Record<string, unknown> {
  const input = isRecord(value) ? value : {};
  const geo = isRecord(input.geo_locations) ? input.geo_locations : {};
  const countries = Array.isArray(geo.countries)
    ? [...new Set(geo.countries.map((item) => String(item).trim().toUpperCase()).filter(Boolean))].sort()
    : ['BD'];
  const ageMin = Number.isFinite(Number(input.age_min)) ? Math.max(18, Math.min(65, Number(input.age_min))) : 18;
  const ageMax = Number.isFinite(Number(input.age_max)) ? Math.max(ageMin, Math.min(65, Number(input.age_max))) : 65;
  return cleanMetaAdsObject({
    ...input,
    age_min: ageMin,
    age_max: ageMax,
    geo_locations: { ...geo, countries: countries.length > 0 ? countries : ['BD'] },
  });
}

export function canonicalizeMetaAdsValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeMetaAdsValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['request_id', 'fbtrace_id'].includes(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalizeMetaAdsValue(item)]),
  );
}

export function compareMetaAdsCanonical(left: unknown, right: unknown): readonly string[] {
  return JSON.stringify(canonicalizeMetaAdsValue(left)) === JSON.stringify(canonicalizeMetaAdsValue(right))
    ? Object.freeze([])
    : Object.freeze(['canonical_payload']);
}
