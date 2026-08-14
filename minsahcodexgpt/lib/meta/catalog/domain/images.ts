export function absoluteCatalogUrl(value: string | null | undefined, origin?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value, origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function uniqueCatalogImages(values: Array<string | null | undefined>, origin?: string) {
  return Array.from(new Set(values.map((value) => absoluteCatalogUrl(value, origin)).filter((value): value is string => Boolean(value))));
}
