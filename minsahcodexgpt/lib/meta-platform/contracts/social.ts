import type { MetaPlatformEnvironment } from '../context/asset-context.ts';

export const META_PROVIDER_IDENTITY_SCHEMA_VERSION = 1 as const;

export const META_PROVIDER_IDENTITY_TYPES = [
  'APP',
  'BUSINESS',
  'AD_ACCOUNT',
  'PAGE',
  'INSTAGRAM_ACCOUNT',
] as const;

export type MetaProviderIdentityType = (typeof META_PROVIDER_IDENTITY_TYPES)[number];

export interface MetaProviderIdentity {
  readonly schemaVersion: typeof META_PROVIDER_IDENTITY_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly assetType: MetaProviderIdentityType;
  /** Canonical provider ID. Ad accounts never include the Graph `act_` prefix here. */
  readonly providerId: string;
  /** Provider node ID used in Graph paths. Ad accounts include the `act_` prefix here. */
  readonly graphId: string;
  readonly identityKey: string;
  readonly appId: string | null;
  readonly businessId: string | null;
  readonly pageId: string | null;
  readonly displayName: string | null;
  readonly username: string | null;
}

export interface CreateMetaProviderIdentityInput {
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly assetType: MetaProviderIdentityType;
  readonly providerId: string;
  readonly appId?: string | null;
  readonly businessId?: string | null;
  readonly pageId?: string | null;
  readonly displayName?: string | null;
  readonly username?: string | null;
}

const META_PROVIDER_IDENTITY_ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const;
const CONNECTION_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/i;

function normalizeRequired(value: string, code: string, maxLength = 255): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

function normalizeOptional(value: string | null | undefined, code: string, maxLength = 255): string | null {
  if (value === undefined || value === null) return null;
  return normalizeRequired(value, code, maxLength);
}

function normalizeProviderId(assetType: MetaProviderIdentityType, value: string): string {
  const normalized = normalizeRequired(value, 'META_PROVIDER_IDENTITY_ID_INVALID');
  if (assetType !== 'AD_ACCOUNT') return normalized;
  const accountId = normalized.startsWith('act_') ? normalized.slice(4) : normalized;
  return normalizeRequired(accountId, 'META_PROVIDER_AD_ACCOUNT_ID_INVALID');
}

function normalizeSelfRelationship(input: {
  readonly assetType: MetaProviderIdentityType;
  readonly providerId: string;
  readonly relationshipType: 'APP' | 'BUSINESS' | 'PAGE';
  readonly relationshipId: string | null;
}): string | null {
  if (input.assetType !== input.relationshipType) return input.relationshipId;
  if (input.relationshipId !== null && input.relationshipId !== input.providerId) {
    throw new TypeError(`META_PROVIDER_${input.relationshipType}_IDENTITY_MISMATCH`);
  }
  return input.providerId;
}

export function createMetaProviderIdentity(input: CreateMetaProviderIdentityInput): MetaProviderIdentity {
  if (!META_PROVIDER_IDENTITY_ENVIRONMENTS.includes(input.environment)) {
    throw new TypeError('META_PROVIDER_IDENTITY_ENVIRONMENT_INVALID');
  }
  if (!META_PROVIDER_IDENTITY_TYPES.includes(input.assetType)) {
    throw new TypeError('META_PROVIDER_IDENTITY_TYPE_INVALID');
  }

  const connectionKey = normalizeRequired(input.connectionKey, 'META_PROVIDER_IDENTITY_CONNECTION_INVALID', 80);
  if (!CONNECTION_KEY_PATTERN.test(connectionKey)) {
    throw new TypeError('META_PROVIDER_IDENTITY_CONNECTION_INVALID');
  }

  const providerId = normalizeProviderId(input.assetType, input.providerId);
  const graphId = input.assetType === 'AD_ACCOUNT' ? `act_${providerId}` : providerId;
  const appId = normalizeSelfRelationship({
    assetType: input.assetType,
    providerId,
    relationshipType: 'APP',
    relationshipId: normalizeOptional(input.appId, 'META_PROVIDER_IDENTITY_APP_ID_INVALID'),
  });
  const businessId = normalizeSelfRelationship({
    assetType: input.assetType,
    providerId,
    relationshipType: 'BUSINESS',
    relationshipId: normalizeOptional(input.businessId, 'META_PROVIDER_IDENTITY_BUSINESS_ID_INVALID'),
  });
  const pageId = normalizeSelfRelationship({
    assetType: input.assetType,
    providerId,
    relationshipType: 'PAGE',
    relationshipId: normalizeOptional(input.pageId, 'META_PROVIDER_IDENTITY_PAGE_ID_INVALID'),
  });

  return Object.freeze({
    schemaVersion: META_PROVIDER_IDENTITY_SCHEMA_VERSION,
    provider: 'META' as const,
    environment: input.environment,
    connectionKey,
    assetType: input.assetType,
    providerId,
    graphId,
    identityKey: `${input.environment}:${connectionKey}:${input.assetType}:${providerId}`,
    appId,
    businessId,
    pageId,
    displayName: normalizeOptional(input.displayName, 'META_PROVIDER_IDENTITY_DISPLAY_NAME_INVALID', 500),
    username: normalizeOptional(input.username, 'META_PROVIDER_IDENTITY_USERNAME_INVALID', 255),
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function isMetaProviderIdentity(value: unknown): value is MetaProviderIdentity {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== META_PROVIDER_IDENTITY_SCHEMA_VERSION
    || value.provider !== 'META'
    || typeof value.environment !== 'string'
    || !META_PROVIDER_IDENTITY_ENVIRONMENTS.includes(value.environment as MetaPlatformEnvironment)
    || typeof value.connectionKey !== 'string'
    || typeof value.assetType !== 'string'
    || !META_PROVIDER_IDENTITY_TYPES.includes(value.assetType as MetaProviderIdentityType)
    || typeof value.providerId !== 'string'
    || typeof value.graphId !== 'string'
    || typeof value.identityKey !== 'string'
    || !isNullableString(value.appId)
    || !isNullableString(value.businessId)
    || !isNullableString(value.pageId)
    || !isNullableString(value.displayName)
    || !isNullableString(value.username)) {
    return false;
  }

  try {
    const normalized = createMetaProviderIdentity({
      environment: value.environment as MetaPlatformEnvironment,
      connectionKey: value.connectionKey,
      assetType: value.assetType as MetaProviderIdentityType,
      providerId: value.providerId,
      appId: value.appId,
      businessId: value.businessId,
      pageId: value.pageId,
      displayName: value.displayName,
      username: value.username,
    });
    return normalized.graphId === value.graphId && normalized.identityKey === value.identityKey;
  } catch {
    return false;
  }
}

export function isSameMetaProviderIdentity(
  left: Pick<MetaProviderIdentity, 'environment' | 'connectionKey' | 'assetType' | 'providerId'>,
  right: Pick<MetaProviderIdentity, 'environment' | 'connectionKey' | 'assetType' | 'providerId'>,
): boolean {
  return left.environment === right.environment
    && left.connectionKey === right.connectionKey
    && left.assetType === right.assetType
    && left.providerId === right.providerId;
}
