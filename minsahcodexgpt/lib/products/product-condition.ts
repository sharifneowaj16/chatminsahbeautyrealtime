export type ProductConditionValue = 'NEW' | 'REFURBISHED' | 'USED';

export function normalizeProductCondition(value: unknown, fallback: ProductConditionValue = 'NEW'): ProductConditionValue {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return normalized === 'USED' || normalized === 'REFURBISHED' || normalized === 'NEW'
    ? normalized
    : fallback;
}
