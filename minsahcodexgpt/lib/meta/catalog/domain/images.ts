const DEFAULT_CATALOG_ORIGIN = 'https://minsahbeauty.cloud';

export function absoluteCatalogUrl(value: string | null | undefined, origin?: string) {
  if (!value) return undefined;
  try {
    const effectiveOrigin = origin || DEFAULT_CATALOG_ORIGIN;
    const url = new URL(value, effectiveOrigin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function uniqueCatalogImages(values: Array<string | null | undefined>, origin?: string) {
  const effectiveOrigin = origin || DEFAULT_CATALOG_ORIGIN;
  return Array.from(new Set(values.map((value) => absoluteCatalogUrl(value, effectiveOrigin)).filter((value): value is string => Boolean(value))));
}
