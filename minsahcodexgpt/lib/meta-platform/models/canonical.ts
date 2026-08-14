export const META_CANONICAL_OBJECT_TYPES = [
  'APP',
  'BUSINESS',
  'AD_ACCOUNT',
  'CAMPAIGN',
  'AD_SET',
  'AD',
  'CREATIVE',
  'CATALOG',
  'PRODUCT_ITEM',
  'PRODUCT_SET',
  'PIXEL',
  'DATASET',
  'PAGE',
  'LEAD_FORM',
  'LEAD',
  'INSTAGRAM_ACCOUNT',
  'CONVERSATION',
  'MESSAGE',
  'INSIGHT',
] as const;

export type MetaCanonicalObjectType = (typeof META_CANONICAL_OBJECT_TYPES)[number];
export type MetaCanonicalScalar = string | number | boolean | null;
export type MetaCanonicalValue = MetaCanonicalScalar | readonly MetaCanonicalScalar[];
export type MetaCanonicalAttributes = Readonly<Record<string, MetaCanonicalValue>>;

export interface MetaCanonicalResource {
  readonly provider: 'META';
  readonly objectType: MetaCanonicalObjectType;
  readonly id: string;
  readonly parentId?: string;
  readonly name?: string;
  readonly status?: string;
  readonly updatedAt?: string;
  readonly capturedAt: string;
  readonly attributes: MetaCanonicalAttributes;
}

export interface MetaCanonicalPage<TItem> {
  readonly items: readonly TItem[];
  readonly nextCursor?: string;
  readonly hasNext: boolean;
}

export interface CreateMetaCanonicalResourceInput {
  readonly objectType: MetaCanonicalObjectType;
  readonly id: string;
  readonly parentId?: string;
  readonly name?: string;
  readonly status?: string;
  readonly updatedAt?: Date | string;
  readonly capturedAt?: Date | string;
  readonly attributes?: Readonly<Record<string, MetaCanonicalValue>>;
}

const ATTRIBUTE_KEY = /^[a-z][a-zA-Z0-9_]{0,63}$/;

function normalizeRequiredText(value: string, code: string, maxLength = 255): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

function normalizeOptionalText(value: string | undefined, code: string, maxLength = 255): string | undefined {
  if (value === undefined) return undefined;
  return normalizeRequiredText(value, code, maxLength);
}

function normalizeDate(value: Date | string | undefined, fallback?: Date): string | undefined {
  if (value === undefined) return fallback?.toISOString();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('META_CANONICAL_DATE_INVALID');
  return date.toISOString();
}

function normalizeAttributes(input: Readonly<Record<string, MetaCanonicalValue>> | undefined): MetaCanonicalAttributes {
  const normalized: Record<string, MetaCanonicalValue> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (!ATTRIBUTE_KEY.test(key)) throw new TypeError('META_CANONICAL_ATTRIBUTE_KEY_INVALID');
    if (Array.isArray(value)) {
      normalized[key] = Object.freeze([...value]);
      continue;
    }
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
      throw new TypeError('META_CANONICAL_ATTRIBUTE_VALUE_INVALID');
    }
    normalized[key] = value;
  }
  return Object.freeze(normalized);
}

export function createMetaCanonicalResource(input: CreateMetaCanonicalResourceInput): MetaCanonicalResource {
  if (!META_CANONICAL_OBJECT_TYPES.includes(input.objectType)) {
    throw new TypeError('META_CANONICAL_OBJECT_TYPE_INVALID');
  }
  const capturedAt = normalizeDate(input.capturedAt, new Date());
  if (!capturedAt) throw new TypeError('META_CANONICAL_CAPTURED_AT_REQUIRED');
  const updatedAt = normalizeDate(input.updatedAt);

  return Object.freeze({
    provider: 'META' as const,
    objectType: input.objectType,
    id: normalizeRequiredText(input.id, 'META_CANONICAL_ID_INVALID'),
    ...(input.parentId ? { parentId: normalizeRequiredText(input.parentId, 'META_CANONICAL_PARENT_ID_INVALID') } : {}),
    ...(input.name ? { name: normalizeOptionalText(input.name, 'META_CANONICAL_NAME_INVALID', 500) } : {}),
    ...(input.status ? { status: normalizeOptionalText(input.status, 'META_CANONICAL_STATUS_INVALID', 80) } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    capturedAt,
    attributes: normalizeAttributes(input.attributes),
  });
}
