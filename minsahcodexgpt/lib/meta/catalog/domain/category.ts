export function cleanCatalogCategory(value?: string | null) {
  return value?.replace(/\s+/g, ' ').trim() || undefined;
}
