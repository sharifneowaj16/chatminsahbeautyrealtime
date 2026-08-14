import crypto from 'node:crypto';
import type { CanonicalCatalogItem } from './domain/types';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

export function catalogPayloadHash(item: CanonicalCatalogItem) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(item))).digest('hex');
}
