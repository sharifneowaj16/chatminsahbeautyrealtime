import {
  createMetaCanonicalResource,
  type MetaCanonicalAttributes,
  type MetaCanonicalObjectType,
  type MetaCanonicalPage,
  type MetaCanonicalResource,
  type MetaCanonicalScalar,
} from './canonical';

export interface MetaProviderResourceMapping {
  readonly objectType: MetaCanonicalObjectType;
  readonly idFields: readonly string[];
  readonly parentIdFields?: readonly string[];
  readonly nameFields?: readonly string[];
  readonly statusFields?: readonly string[];
  readonly updatedAtFields?: readonly string[];
  readonly attributes?: Readonly<Record<string, readonly string[]>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readPath(input: Record<string, unknown>, path: string): unknown {
  let current: unknown = input;
  for (const segment of path.split('.')) {
    if (!isRecord(current) || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function normalizeIdentifier(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return value.toString();
  return undefined;
}

function normalizeScalar(value: unknown): MetaCanonicalScalar | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') return value.toString();
  return undefined;
}

function firstValue(input: Record<string, unknown>, fields: readonly string[] | undefined): unknown {
  for (const field of fields ?? []) {
    const value = readPath(input, field);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function optionalText(input: Record<string, unknown>, fields: readonly string[] | undefined): string | undefined {
  return normalizeIdentifier(firstValue(input, fields));
}

function normalizeStatus(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function selectAttributes(
  input: Record<string, unknown>,
  mapping: Readonly<Record<string, readonly string[]>> | undefined,
): MetaCanonicalAttributes {
  const selected: Record<string, MetaCanonicalScalar> = {};
  for (const [canonicalKey, providerFields] of Object.entries(mapping ?? {})) {
    const value = normalizeScalar(firstValue(input, providerFields));
    if (value !== undefined) selected[canonicalKey] = value;
  }
  return selected;
}

export function normalizeMetaProviderResource(
  input: unknown,
  mapping: MetaProviderResourceMapping,
  capturedAt?: Date | string,
): MetaCanonicalResource {
  if (!isRecord(input)) throw new TypeError('META_PROVIDER_RESOURCE_INVALID');
  const id = optionalText(input, mapping.idFields);
  if (!id) throw new TypeError('META_PROVIDER_RESOURCE_ID_MISSING');

  return createMetaCanonicalResource({
    objectType: mapping.objectType,
    id,
    parentId: optionalText(input, mapping.parentIdFields),
    name: optionalText(input, mapping.nameFields),
    status: normalizeStatus(optionalText(input, mapping.statusFields)),
    updatedAt: optionalText(input, mapping.updatedAtFields),
    capturedAt,
    attributes: selectAttributes(input, mapping.attributes),
  });
}

export function normalizeMetaProviderPage(
  input: unknown,
  mapping: MetaProviderResourceMapping,
  capturedAt?: Date | string,
): MetaCanonicalPage<MetaCanonicalResource> {
  if (!isRecord(input) || !Array.isArray(input.data)) throw new TypeError('META_PROVIDER_PAGE_INVALID');
  const paging = isRecord(input.paging) ? input.paging : undefined;
  const cursors = paging && isRecord(paging.cursors) ? paging.cursors : undefined;
  const nextCursor = normalizeIdentifier(cursors?.after);
  const hasNext = Boolean(nextCursor || (paging && typeof paging.next === 'string' && paging.next.trim()));

  return Object.freeze({
    items: Object.freeze(input.data.map((item) => normalizeMetaProviderResource(item, mapping, capturedAt))),
    ...(nextCursor ? { nextCursor } : {}),
    hasNext,
  });
}
