import type { MetaAssetContext, MetaAssetType, MetaPlatformEnvironment } from '../context/asset-context';

export const META_PROVIDER_IDENTITY_OBJECT_TYPE = 'PROVIDER_IDENTITY' as const;
export const META_PROVIDER_IDENTITY_ASSET_TYPES = Object.freeze([
  'APP',
  'BUSINESS',
  'AD_ACCOUNT',
  'PAGE',
  'INSTAGRAM_ACCOUNT',
  'LEAD_FORM',
] as const);
export type MetaProviderIdentityAssetType = (typeof META_PROVIDER_IDENTITY_ASSET_TYPES)[number];

export const META_PROVIDER_IDENTITY_STATUSES = Object.freeze(['UNVERIFIED', 'ACTIVE', 'INACTIVE', 'REVOKED'] as const);
export type MetaProviderIdentityStatus = (typeof META_PROVIDER_IDENTITY_STATUSES)[number];

export const META_PROVIDER_PERMISSION_HEALTH = Object.freeze([
  'UNKNOWN',
  'HEALTHY',
  'DEGRADED',
  'MISSING_PERMISSION',
  'BLOCKED',
] as const);
export type MetaProviderPermissionHealth = (typeof META_PROVIDER_PERMISSION_HEALTH)[number];

export const META_PROVIDER_IDENTITY_SOURCES = Object.freeze(['RUNTIME', 'BACKFILL', 'RECONCILIATION', 'MANUAL'] as const);
export type MetaProviderIdentitySource = (typeof META_PROVIDER_IDENTITY_SOURCES)[number];

const SAFE_METADATA_KEYS = new Set([
  'connectionName',
  'displayName',
  'providerObjectType',
  'sourceField',
  'username',
]);
const SAFE_PERMISSION_KEYS = new Set(['required', 'granted', 'missing']);
const SECRET_KEY_PATTERN = /(access.?token|app.?secret|authorization|cookie|password|signed.?url|email|phone|message|raw.?payload)/i;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._:-]{1,255}$/;
const SAFE_REASON_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/;

export interface MetaProviderIdentityRecord {
  readonly id: string;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly assetType: MetaProviderIdentityAssetType;
  readonly providerId: string;
  readonly localId: string;
  readonly canonicalKey: string;
  readonly identityStatus: MetaProviderIdentityStatus;
  readonly permissionHealth: MetaProviderPermissionHealth;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly permissionMetadata: Readonly<Record<string, readonly string[]>>;
  readonly source: MetaProviderIdentitySource;
  readonly lastSeenAt?: string;
  readonly lastVerifiedAt?: string;
  readonly disabledAt?: string;
  readonly revokedAt?: string;
  readonly statusReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RegisterMetaProviderIdentityInput {
  readonly context: MetaAssetContext;
  readonly assetType: MetaProviderIdentityAssetType;
  readonly providerId: string;
  readonly identityStatus?: MetaProviderIdentityStatus;
  readonly permissionHealth?: MetaProviderPermissionHealth;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly permissionMetadata?: Readonly<Record<string, unknown>>;
  readonly source?: MetaProviderIdentitySource;
  readonly seenAt?: Date | string;
  readonly verifiedAt?: Date | string;
  readonly statusReason?: string;
}

export interface MetaProviderIdentityLookup {
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly assetType: MetaProviderIdentityAssetType;
  readonly providerId: string;
}

export interface MetaProviderIdentityRepository {
  register(input: RegisterMetaProviderIdentityInput): Promise<MetaProviderIdentityRecord>;
  resolve(lookup: MetaProviderIdentityLookup): Promise<MetaProviderIdentityRecord | null>;
  getById(id: string): Promise<MetaProviderIdentityRecord | null>;
  updateHealth(input: {
    readonly identityId: string;
    readonly identityStatus?: MetaProviderIdentityStatus;
    readonly permissionHealth?: MetaProviderPermissionHealth;
    readonly permissionMetadata?: Readonly<Record<string, unknown>>;
    readonly verifiedAt?: Date | string;
    readonly statusReason?: string;
  }): Promise<MetaProviderIdentityRecord>;
  disable(input: { readonly identityId: string; readonly reason: string; readonly at?: Date | string }): Promise<MetaProviderIdentityRecord>;
  revoke(input: { readonly identityId: string; readonly reason: string; readonly at?: Date | string }): Promise<MetaProviderIdentityRecord>;
}

export class MetaProviderIdentityError extends Error {
  readonly code: string;
  readonly safeDetails: Readonly<Record<string, string>>;

  constructor(code: string, safeDetails: Readonly<Record<string, string>> = {}) {
    super(code);
    this.name = 'MetaProviderIdentityError';
    this.code = code;
    this.safeDetails = Object.freeze({ ...safeDetails });
  }
}

function requiredText(value: unknown, code: string, maxLength = 255): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

function normalizedDate(value: Date | string | undefined, code: string): string | undefined {
  if (value === undefined) return undefined;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError(code);
  return date.toISOString();
}

function sanitizeScalar(value: unknown): string | boolean | number | null | undefined {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const clean = value.trim();
    return clean ? clean.slice(0, 255) : undefined;
  }
  return undefined;
}

export function sanitizeMetaProviderIdentityMetadata(input: unknown): Readonly<Record<string, unknown>> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return Object.freeze({});
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key) || !SAFE_METADATA_KEYS.has(key)) continue;
    const scalar = sanitizeScalar(value);
    if (scalar !== undefined) safe[key] = scalar;
  }
  return Object.freeze(safe);
}

function permissionList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  const unique = new Set<string>();
  for (const item of value.slice(0, 100)) {
    if (typeof item !== 'string') continue;
    const clean = item.trim().toLowerCase();
    if (/^[a-z][a-z0-9_]{1,119}$/.test(clean)) unique.add(clean);
  }
  return Object.freeze([...unique].sort());
}

export function sanitizeMetaProviderPermissionMetadata(input: unknown): Readonly<Record<string, readonly string[]>> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return Object.freeze({});
  const safe: Record<string, readonly string[]> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!SAFE_PERMISSION_KEYS.has(key) || SECRET_KEY_PATTERN.test(key)) continue;
    safe[key] = permissionList(value);
  }
  return Object.freeze(safe);
}

export function metaProviderIdentityLocalId(assetType: MetaProviderIdentityAssetType, providerId: string): string {
  return `meta-identity:${assetType}:${providerId}`;
}

export function metaProviderIdentityCanonicalKey(assetType: MetaProviderIdentityAssetType, providerId: string): string {
  return `META:${assetType}:${providerId}`;
}

export function normalizeMetaProviderIdentityInput(input: RegisterMetaProviderIdentityInput) {
  if (!META_PROVIDER_IDENTITY_ASSET_TYPES.includes(input.assetType)) throw new TypeError('META_PROVIDER_IDENTITY_ASSET_TYPE_INVALID');
  const providerId = requiredText(input.providerId, 'META_PROVIDER_IDENTITY_PROVIDER_ID_INVALID');
  if (!IDENTIFIER_PATTERN.test(providerId)) throw new TypeError('META_PROVIDER_IDENTITY_PROVIDER_ID_INVALID');
  const boundAsset = input.context.assets[input.assetType as MetaAssetType];
  if (boundAsset !== providerId) {
    throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_CONTEXT_MISMATCH', {
      environment: input.context.environment,
      assetType: input.assetType,
    });
  }
  const identityStatus = input.identityStatus ?? 'UNVERIFIED';
  const permissionHealth = input.permissionHealth ?? 'UNKNOWN';
  const source = input.source ?? 'RUNTIME';
  if (!META_PROVIDER_IDENTITY_STATUSES.includes(identityStatus)) throw new TypeError('META_PROVIDER_IDENTITY_STATUS_INVALID');
  if (!META_PROVIDER_PERMISSION_HEALTH.includes(permissionHealth)) throw new TypeError('META_PROVIDER_PERMISSION_HEALTH_INVALID');
  if (!META_PROVIDER_IDENTITY_SOURCES.includes(source)) throw new TypeError('META_PROVIDER_IDENTITY_SOURCE_INVALID');
  const statusReason = input.statusReason === undefined
    ? undefined
    : requiredText(input.statusReason, 'META_PROVIDER_IDENTITY_STATUS_REASON_INVALID', 80).toUpperCase();
  if (statusReason && !SAFE_REASON_PATTERN.test(statusReason)) throw new TypeError('META_PROVIDER_IDENTITY_STATUS_REASON_INVALID');
  return Object.freeze({
    environment: input.context.environment,
    connectionKey: input.context.connectionKey,
    assetType: input.assetType,
    providerId,
    localId: metaProviderIdentityLocalId(input.assetType, providerId),
    canonicalKey: metaProviderIdentityCanonicalKey(input.assetType, providerId),
    identityStatus,
    identityStatusExplicit: input.identityStatus !== undefined,
    permissionHealth,
    permissionHealthExplicit: input.permissionHealth !== undefined,
    metadata: sanitizeMetaProviderIdentityMetadata(input.metadata),
    permissionMetadata: sanitizeMetaProviderPermissionMetadata(input.permissionMetadata),
    source,
    seenAt: normalizedDate(input.seenAt, 'META_PROVIDER_IDENTITY_SEEN_AT_INVALID'),
    verifiedAt: normalizedDate(input.verifiedAt, 'META_PROVIDER_IDENTITY_VERIFIED_AT_INVALID'),
    statusReason,
  });
}

function identityKey(input: MetaProviderIdentityLookup): string {
  return [input.environment, input.connectionKey.trim(), input.assetType, input.providerId.trim()].join('\u001f');
}

function transitionAllowed(current: MetaProviderIdentityStatus, next: MetaProviderIdentityStatus): boolean {
  if (current === next) return true;
  if (current === 'REVOKED') return false;
  if (current === 'UNVERIFIED') return ['ACTIVE', 'INACTIVE', 'REVOKED'].includes(next);
  if (current === 'ACTIVE') return ['INACTIVE', 'REVOKED'].includes(next);
  return ['ACTIVE', 'REVOKED'].includes(next);
}

export function isMetaProviderIdentityWritable(record: MetaProviderIdentityRecord): boolean {
  return record.identityStatus === 'ACTIVE' && record.permissionHealth === 'HEALTHY';
}

export type MetaProviderIdentityReceiptPlatform = 'LEAD_ADS' | 'INSTAGRAM' | 'FACEBOOK_PAGE';

const RECEIPT_IDENTITY_ASSET_TYPES = Object.freeze({
  LEAD_ADS: Object.freeze(['LEAD_FORM', 'PAGE'] as const),
  INSTAGRAM: Object.freeze(['INSTAGRAM_ACCOUNT'] as const),
  FACEBOOK_PAGE: Object.freeze(['PAGE'] as const),
} satisfies Readonly<Record<MetaProviderIdentityReceiptPlatform, readonly MetaProviderIdentityAssetType[]>>);

export function assertMetaProviderIdentityReceiptCompatibility(input: {
  readonly platform: MetaProviderIdentityReceiptPlatform;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly identity: MetaProviderIdentityRecord;
}): void {
  if (input.environment !== input.identity.environment || input.connectionKey.trim() !== input.identity.connectionKey) {
    throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_RECEIPT_SCOPE_MISMATCH');
  }
  const allowedAssetTypes: readonly MetaProviderIdentityAssetType[] = RECEIPT_IDENTITY_ASSET_TYPES[input.platform];
  if (!allowedAssetTypes.includes(input.identity.assetType)) {
    throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_RECEIPT_TYPE_MISMATCH');
  }
  if (input.identity.identityStatus === 'REVOKED') {
    throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_REVOKED');
  }
}

export interface InMemoryMetaProviderIdentityRepositoryOptions {
  readonly now?: () => Date;
  readonly createId?: () => string;
}

export class InMemoryMetaProviderIdentityRepository implements MetaProviderIdentityRepository {
  readonly #byKey = new Map<string, MetaProviderIdentityRecord>();
  readonly #byId = new Map<string, MetaProviderIdentityRecord>();
  readonly #now: () => Date;
  readonly #createId: () => string;

  constructor(options: InMemoryMetaProviderIdentityRepositoryOptions = {}) {
    this.#now = options.now ?? (() => new Date());
    this.#createId = options.createId ?? (() => globalThis.crypto.randomUUID());
  }

  async register(raw: RegisterMetaProviderIdentityInput): Promise<MetaProviderIdentityRecord> {
    const input = normalizeMetaProviderIdentityInput(raw);
    const key = identityKey(input);
    const existing = this.#byKey.get(key);
    const identityStatus = existing && !input.identityStatusExplicit ? existing.identityStatus : input.identityStatus;
    const permissionHealth = existing && !input.permissionHealthExplicit ? existing.permissionHealth : input.permissionHealth;
    if (existing && !transitionAllowed(existing.identityStatus, identityStatus)) {
      throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_STATUS_TRANSITION_INVALID');
    }
    const now = this.#now().toISOString();
    const record: MetaProviderIdentityRecord = Object.freeze({
      id: existing?.id ?? this.#createId(),
      environment: input.environment,
      connectionKey: input.connectionKey,
      assetType: input.assetType,
      providerId: input.providerId,
      localId: input.localId,
      canonicalKey: input.canonicalKey,
      identityStatus,
      permissionHealth,
      metadata: Object.keys(input.metadata).length > 0 ? input.metadata : existing?.metadata ?? Object.freeze({}),
      permissionMetadata: Object.keys(input.permissionMetadata).length > 0
        ? input.permissionMetadata
        : existing?.permissionMetadata ?? Object.freeze({}),
      source: input.source,
      ...(input.seenAt ?? existing?.lastSeenAt ? { lastSeenAt: input.seenAt ?? existing?.lastSeenAt } : {}),
      ...(input.verifiedAt ?? existing?.lastVerifiedAt ? { lastVerifiedAt: input.verifiedAt ?? existing?.lastVerifiedAt } : {}),
      ...(identityStatus === 'INACTIVE' ? { disabledAt: existing?.disabledAt ?? now } : existing?.disabledAt ? { disabledAt: existing.disabledAt } : {}),
      ...(identityStatus === 'REVOKED' ? { revokedAt: existing?.revokedAt ?? now } : existing?.revokedAt ? { revokedAt: existing.revokedAt } : {}),
      ...(input.statusReason ?? existing?.statusReason ? { statusReason: input.statusReason ?? existing?.statusReason } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    this.#byKey.set(key, record);
    this.#byId.set(record.id, record);
    return record;
  }

  async resolve(lookup: MetaProviderIdentityLookup): Promise<MetaProviderIdentityRecord | null> {
    return this.#byKey.get(identityKey(lookup)) ?? null;
  }

  async getById(id: string): Promise<MetaProviderIdentityRecord | null> {
    return this.#byId.get(requiredText(id, 'META_PROVIDER_IDENTITY_ID_INVALID')) ?? null;
  }

  async updateHealth(input: {
    readonly identityId: string;
    readonly identityStatus?: MetaProviderIdentityStatus;
    readonly permissionHealth?: MetaProviderPermissionHealth;
    readonly permissionMetadata?: Readonly<Record<string, unknown>>;
    readonly verifiedAt?: Date | string;
    readonly statusReason?: string;
  }): Promise<MetaProviderIdentityRecord> {
    const id = requiredText(input.identityId, 'META_PROVIDER_IDENTITY_ID_INVALID');
    const existing = this.#byId.get(id);
    if (!existing) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_FOUND');
    const nextStatus = input.identityStatus ?? existing.identityStatus;
    if (!META_PROVIDER_IDENTITY_STATUSES.includes(nextStatus) || !transitionAllowed(existing.identityStatus, nextStatus)) {
      throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_STATUS_TRANSITION_INVALID');
    }
    const nextHealth = input.permissionHealth ?? existing.permissionHealth;
    if (!META_PROVIDER_PERMISSION_HEALTH.includes(nextHealth)) throw new TypeError('META_PROVIDER_PERMISSION_HEALTH_INVALID');
    const statusReason = input.statusReason === undefined ? existing.statusReason : requiredText(input.statusReason, 'META_PROVIDER_IDENTITY_STATUS_REASON_INVALID', 80).toUpperCase();
    if (statusReason && !SAFE_REASON_PATTERN.test(statusReason)) throw new TypeError('META_PROVIDER_IDENTITY_STATUS_REASON_INVALID');
    const now = this.#now().toISOString();
    const updated: MetaProviderIdentityRecord = Object.freeze({
      ...existing,
      identityStatus: nextStatus,
      permissionHealth: nextHealth,
      permissionMetadata: input.permissionMetadata === undefined
        ? existing.permissionMetadata
        : sanitizeMetaProviderPermissionMetadata(input.permissionMetadata),
      ...(normalizedDate(input.verifiedAt, 'META_PROVIDER_IDENTITY_VERIFIED_AT_INVALID') ? { lastVerifiedAt: normalizedDate(input.verifiedAt, 'META_PROVIDER_IDENTITY_VERIFIED_AT_INVALID') } : {}),
      ...(nextStatus === 'INACTIVE' ? { disabledAt: existing.disabledAt ?? now } : {}),
      ...(nextStatus === 'REVOKED' ? { revokedAt: existing.revokedAt ?? now } : {}),
      ...(statusReason ? { statusReason } : {}),
      updatedAt: now,
    });
    this.#byId.set(id, updated);
    this.#byKey.set(identityKey(updated), updated);
    return updated;
  }

  disable(input: { readonly identityId: string; readonly reason: string; readonly at?: Date | string }) {
    return this.updateHealth({ identityId: input.identityId, identityStatus: 'INACTIVE', statusReason: input.reason, verifiedAt: input.at });
  }

  revoke(input: { readonly identityId: string; readonly reason: string; readonly at?: Date | string }) {
    return this.updateHealth({ identityId: input.identityId, identityStatus: 'REVOKED', permissionHealth: 'BLOCKED', statusReason: input.reason, verifiedAt: input.at });
  }

  snapshot(): readonly MetaProviderIdentityRecord[] {
    return Object.freeze([...this.#byId.values()]);
  }
}
