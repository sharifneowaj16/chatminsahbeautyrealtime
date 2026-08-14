import { assertMetaReferenceScope, type MetaAssetContext } from '../context/asset-context';
import type {
  MetaExternalReferenceLocalLookup,
  MetaExternalReferenceProviderLookup,
  MetaExternalReferenceRecord,
  RegisterMetaExternalReferenceInput,
} from './types';
import { META_EXTERNAL_REFERENCE_SOURCES, type MetaExternalReferenceSource } from './types';

export interface MetaExternalReferenceRepository {
  findByLocal(lookup: MetaExternalReferenceLocalLookup): Promise<MetaExternalReferenceRecord | null>;
  findByProvider(lookup: MetaExternalReferenceProviderLookup): Promise<MetaExternalReferenceRecord | null>;
  register(context: MetaAssetContext, input: RegisterMetaExternalReferenceInput): Promise<MetaExternalReferenceRecord>;
}

export class MetaExternalReferenceConflictError extends Error {
  readonly code: 'META_REFERENCE_LOCAL_CONFLICT' | 'META_REFERENCE_PROVIDER_CONFLICT';

  constructor(code: 'META_REFERENCE_LOCAL_CONFLICT' | 'META_REFERENCE_PROVIDER_CONFLICT') {
    super(code);
    this.name = 'MetaExternalReferenceConflictError';
    this.code = code;
  }
}

export interface InMemoryMetaExternalReferenceRepositoryOptions {
  readonly now?: () => Date;
  readonly createId?: () => string;
}

const OBJECT_TYPE_PATTERN = /^[A-Z][A-Z0-9_]{1,79}$/;

function normalizeText(value: string, code: string, maxLength = 255): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

function normalizeDate(value: Date | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('META_REFERENCE_DATE_INVALID');
  return date.toISOString();
}

function scopeKey(value: MetaExternalReferenceLocalLookup | MetaExternalReferenceProviderLookup): string {
  return [value.environment, value.connectionKey, value.assetType, value.assetId, value.objectType].join('\u001f');
}

export function localReferenceKey(value: MetaExternalReferenceLocalLookup): string {
  return `${scopeKey(value)}\u001f${value.localId}`;
}

export function providerReferenceKey(value: MetaExternalReferenceProviderLookup): string {
  return `${scopeKey(value)}\u001f${value.providerId}`;
}

export type NormalizedMetaExternalReferenceInput = Omit<RegisterMetaExternalReferenceInput, 'source' | 'lastVerifiedAt'> & {
  readonly source: MetaExternalReferenceSource;
  readonly lastVerifiedAt?: string;
};

export function normalizeMetaExternalReferenceInput(input: RegisterMetaExternalReferenceInput): NormalizedMetaExternalReferenceInput {
  const objectType = normalizeText(input.objectType, 'META_REFERENCE_OBJECT_TYPE_INVALID', 80).toUpperCase();
  if (!OBJECT_TYPE_PATTERN.test(objectType)) throw new TypeError('META_REFERENCE_OBJECT_TYPE_INVALID');
  const source = input.source ?? 'RUNTIME';
  if (!META_EXTERNAL_REFERENCE_SOURCES.includes(source)) throw new TypeError('META_REFERENCE_SOURCE_INVALID');

  return Object.freeze({
    environment: input.environment,
    connectionKey: normalizeText(input.connectionKey, 'META_REFERENCE_CONNECTION_KEY_INVALID', 80),
    assetType: input.assetType,
    assetId: normalizeText(input.assetId, 'META_REFERENCE_ASSET_ID_INVALID'),
    objectType,
    localId: normalizeText(input.localId, 'META_REFERENCE_LOCAL_ID_INVALID'),
    providerId: normalizeText(input.providerId, 'META_REFERENCE_PROVIDER_ID_INVALID'),
    ...(input.providerParentId ? { providerParentId: normalizeText(input.providerParentId, 'META_REFERENCE_PARENT_ID_INVALID') } : {}),
    ...(input.canonicalKey ? { canonicalKey: normalizeText(input.canonicalKey, 'META_REFERENCE_CANONICAL_KEY_INVALID', 500) } : {}),
    source,
    ...(input.metadata ? { metadata: Object.freeze({ ...input.metadata }) } : {}),
    ...(input.lastVerifiedAt ? { lastVerifiedAt: normalizeDate(input.lastVerifiedAt) } : {}),
  });
}

function createDefaultReferenceId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  throw new Error('META_REFERENCE_ID_FACTORY_REQUIRED');
}

export class InMemoryMetaExternalReferenceRepository implements MetaExternalReferenceRepository {
  private readonly byLocal = new Map<string, MetaExternalReferenceRecord>();
  private readonly byProvider = new Map<string, MetaExternalReferenceRecord>();
  private readonly now: () => Date;
  private readonly createId: () => string;

  constructor(options: InMemoryMetaExternalReferenceRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? createDefaultReferenceId;
  }

  async findByLocal(lookup: MetaExternalReferenceLocalLookup): Promise<MetaExternalReferenceRecord | null> {
    return this.byLocal.get(localReferenceKey(lookup)) ?? null;
  }

  async findByProvider(lookup: MetaExternalReferenceProviderLookup): Promise<MetaExternalReferenceRecord | null> {
    return this.byProvider.get(providerReferenceKey(lookup)) ?? null;
  }

  async register(context: MetaAssetContext, rawInput: RegisterMetaExternalReferenceInput): Promise<MetaExternalReferenceRecord> {
    const input = normalizeMetaExternalReferenceInput(rawInput);
    assertMetaReferenceScope(context, input);
    const localKey = localReferenceKey(input);
    const providerKey = providerReferenceKey(input);
    const existingLocal = this.byLocal.get(localKey);
    const existingProvider = this.byProvider.get(providerKey);

    if (existingLocal && existingLocal.providerId !== input.providerId) {
      throw new MetaExternalReferenceConflictError('META_REFERENCE_LOCAL_CONFLICT');
    }
    if (existingProvider && existingProvider.localId !== input.localId) {
      throw new MetaExternalReferenceConflictError('META_REFERENCE_PROVIDER_CONFLICT');
    }

    const now = this.now().toISOString();
    const existing = existingLocal ?? existingProvider;
    const record: MetaExternalReferenceRecord = Object.freeze({
      id: existing?.id ?? this.createId(),
      ...input,
      ...(input.lastVerifiedAt ? { lastVerifiedAt: normalizeDate(input.lastVerifiedAt) } : existing?.lastVerifiedAt ? { lastVerifiedAt: existing.lastVerifiedAt } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    this.byLocal.set(localKey, record);
    this.byProvider.set(providerKey, record);
    return record;
  }
}
