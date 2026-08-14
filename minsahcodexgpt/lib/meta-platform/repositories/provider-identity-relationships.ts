import type { MetaPlatformEnvironment } from '../context/asset-context';
import {
  MetaProviderIdentityError,
  type MetaProviderIdentityAssetType,
  type MetaProviderIdentityRecord,
  type MetaProviderIdentityRepository,
  type MetaProviderIdentitySource,
} from './provider-identities';

export const META_PROVIDER_IDENTITY_RELATIONSHIP_TYPES = Object.freeze([
  'APP_ASSOCIATED_WITH_BUSINESS',
  'BUSINESS_OWNS_PAGE',
  'BUSINESS_OWNS_AD_ACCOUNT',
  'PAGE_LINKED_INSTAGRAM_ACCOUNT',
  'PAGE_CONTAINS_LEAD_FORM',
] as const);
export type MetaProviderIdentityRelationshipType = (typeof META_PROVIDER_IDENTITY_RELATIONSHIP_TYPES)[number];

export const META_PROVIDER_IDENTITY_RELATIONSHIP_STATUSES = Object.freeze(['UNVERIFIED', 'ACTIVE', 'INACTIVE', 'REVOKED'] as const);
export type MetaProviderIdentityRelationshipStatus = (typeof META_PROVIDER_IDENTITY_RELATIONSHIP_STATUSES)[number];

const RELATION_ASSETS = Object.freeze({
  APP_ASSOCIATED_WITH_BUSINESS: Object.freeze(['APP', 'BUSINESS']),
  BUSINESS_OWNS_PAGE: Object.freeze(['BUSINESS', 'PAGE']),
  BUSINESS_OWNS_AD_ACCOUNT: Object.freeze(['BUSINESS', 'AD_ACCOUNT']),
  PAGE_LINKED_INSTAGRAM_ACCOUNT: Object.freeze(['PAGE', 'INSTAGRAM_ACCOUNT']),
  PAGE_CONTAINS_LEAD_FORM: Object.freeze(['PAGE', 'LEAD_FORM']),
} satisfies Readonly<Record<
  MetaProviderIdentityRelationshipType,
  readonly [MetaProviderIdentityAssetType, MetaProviderIdentityAssetType]
>>);

export interface MetaProviderIdentityRelationshipRecord {
  readonly id: string;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly relationshipType: MetaProviderIdentityRelationshipType;
  readonly parentReferenceId: string;
  readonly childReferenceId: string;
  readonly status: MetaProviderIdentityRelationshipStatus;
  readonly source: MetaProviderIdentitySource;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly lastVerifiedAt?: string;
  readonly disabledAt?: string;
  readonly revokedAt?: string;
  readonly statusReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MetaProviderIdentityRelationshipRepository {
  link(input: {
    readonly relationshipType: MetaProviderIdentityRelationshipType;
    readonly parentIdentityId: string;
    readonly childIdentityId: string;
    readonly status?: MetaProviderIdentityRelationshipStatus;
    readonly source?: MetaProviderIdentitySource;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly verifiedAt?: Date | string;
  }): Promise<MetaProviderIdentityRelationshipRecord>;
  find(input: {
    readonly relationshipType: MetaProviderIdentityRelationshipType;
    readonly parentIdentityId: string;
    readonly childIdentityId: string;
  }): Promise<MetaProviderIdentityRelationshipRecord | null>;
  listByParent(input: {
    readonly relationshipType: MetaProviderIdentityRelationshipType;
    readonly parentIdentityId: string;
  }): Promise<readonly MetaProviderIdentityRelationshipRecord[]>;
  listByChild(input: {
    readonly relationshipType: MetaProviderIdentityRelationshipType;
    readonly childIdentityId: string;
  }): Promise<readonly MetaProviderIdentityRelationshipRecord[]>;
}

function requiredText(value: unknown, code: string, maxLength = 255): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const clean = value.trim();
  if (!clean || clean.length > maxLength) throw new TypeError(code);
  return clean;
}

function iso(value: Date | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('META_PROVIDER_RELATION_DATE_INVALID');
  return date.toISOString();
}

function relationKey(input: { relationshipType: MetaProviderIdentityRelationshipType; parentIdentityId: string; childIdentityId: string }) {
  return [input.relationshipType, input.parentIdentityId, input.childIdentityId].join('\u001f');
}

export function assertMetaProviderIdentityRelationship(input: {
  readonly relationshipType: MetaProviderIdentityRelationshipType;
  readonly parent: MetaProviderIdentityRecord;
  readonly child: MetaProviderIdentityRecord;
}): void {
  if (!META_PROVIDER_IDENTITY_RELATIONSHIP_TYPES.includes(input.relationshipType)) throw new TypeError('META_PROVIDER_RELATION_TYPE_INVALID');
  const [parentType, childType] = RELATION_ASSETS[input.relationshipType];
  if (input.parent.assetType !== parentType || input.child.assetType !== childType) {
    throw new MetaProviderIdentityError('META_PROVIDER_RELATION_ASSET_PAIR_INVALID', { relationshipType: input.relationshipType });
  }
  if (input.parent.environment !== input.child.environment || input.parent.connectionKey !== input.child.connectionKey) {
    throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_RELATION_SCOPE_MISMATCH', { relationshipType: input.relationshipType });
  }
  if (input.parent.id === input.child.id) throw new MetaProviderIdentityError('META_PROVIDER_RELATION_SELF_REFERENCE');
  if (input.parent.identityStatus === 'REVOKED' || input.child.identityStatus === 'REVOKED') {
    throw new MetaProviderIdentityError('META_PROVIDER_RELATION_REVOKED_IDENTITY');
  }
}

export class InMemoryMetaProviderIdentityRelationshipRepository implements MetaProviderIdentityRelationshipRepository {
  readonly #byKey = new Map<string, MetaProviderIdentityRelationshipRecord>();
  readonly #identityRepository: MetaProviderIdentityRepository;
  readonly #now: () => Date;
  readonly #createId: () => string;

  constructor(input: {
    readonly identityRepository: MetaProviderIdentityRepository;
    readonly now?: () => Date;
    readonly createId?: () => string;
  }) {
    this.#identityRepository = input.identityRepository;
    this.#now = input.now ?? (() => new Date());
    this.#createId = input.createId ?? (() => globalThis.crypto.randomUUID());
  }

  async link(input: {
    readonly relationshipType: MetaProviderIdentityRelationshipType;
    readonly parentIdentityId: string;
    readonly childIdentityId: string;
    readonly status?: MetaProviderIdentityRelationshipStatus;
    readonly source?: MetaProviderIdentitySource;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly verifiedAt?: Date | string;
  }): Promise<MetaProviderIdentityRelationshipRecord> {
    const parentIdentityId = requiredText(input.parentIdentityId, 'META_PROVIDER_RELATION_PARENT_ID_INVALID');
    const childIdentityId = requiredText(input.childIdentityId, 'META_PROVIDER_RELATION_CHILD_ID_INVALID');
    const parent = await this.#identityRepository.getById(parentIdentityId);
    const child = await this.#identityRepository.getById(childIdentityId);
    if (!parent || !child) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_FOUND');
    assertMetaProviderIdentityRelationship({ relationshipType: input.relationshipType, parent, child });
    const status = input.status ?? 'UNVERIFIED';
    if (!META_PROVIDER_IDENTITY_RELATIONSHIP_STATUSES.includes(status)) throw new TypeError('META_PROVIDER_RELATION_STATUS_INVALID');
    const key = relationKey({ relationshipType: input.relationshipType, parentIdentityId, childIdentityId });
    const existing = this.#byKey.get(key);
    if (existing?.status === 'REVOKED' && status !== 'REVOKED') {
      throw new MetaProviderIdentityError('META_PROVIDER_RELATION_STATUS_TRANSITION_INVALID');
    }
    const now = this.#now().toISOString();
    const record: MetaProviderIdentityRelationshipRecord = Object.freeze({
      id: existing?.id ?? this.#createId(),
      environment: parent.environment,
      connectionKey: parent.connectionKey,
      relationshipType: input.relationshipType,
      parentReferenceId: parent.id,
      childReferenceId: child.id,
      status,
      source: input.source ?? 'RUNTIME',
      metadata: Object.freeze({ ...(input.metadata ?? existing?.metadata ?? {}) }),
      ...(iso(input.verifiedAt) ?? existing?.lastVerifiedAt ? { lastVerifiedAt: iso(input.verifiedAt) ?? existing?.lastVerifiedAt } : {}),
      ...(status === 'INACTIVE' ? { disabledAt: existing?.disabledAt ?? now } : existing?.disabledAt ? { disabledAt: existing.disabledAt } : {}),
      ...(status === 'REVOKED' ? { revokedAt: existing?.revokedAt ?? now } : existing?.revokedAt ? { revokedAt: existing.revokedAt } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    this.#byKey.set(key, record);
    return record;
  }

  async find(input: { relationshipType: MetaProviderIdentityRelationshipType; parentIdentityId: string; childIdentityId: string }) {
    return this.#byKey.get(relationKey(input)) ?? null;
  }

  async listByParent(input: { relationshipType: MetaProviderIdentityRelationshipType; parentIdentityId: string }) {
    return Object.freeze([...this.#byKey.values()].filter((row) => row.relationshipType === input.relationshipType && row.parentReferenceId === input.parentIdentityId));
  }

  async listByChild(input: { relationshipType: MetaProviderIdentityRelationshipType; childIdentityId: string }) {
    return Object.freeze([...this.#byKey.values()].filter((row) => row.relationshipType === input.relationshipType && row.childReferenceId === input.childIdentityId));
  }

  snapshot(): readonly MetaProviderIdentityRelationshipRecord[] {
    return Object.freeze([...this.#byKey.values()]);
  }
}
