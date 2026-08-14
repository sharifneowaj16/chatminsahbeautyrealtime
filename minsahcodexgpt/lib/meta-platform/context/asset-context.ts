export const META_PLATFORM_ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const;
export type MetaPlatformEnvironment = (typeof META_PLATFORM_ENVIRONMENTS)[number];

export const META_ASSET_TYPES = [
  'APP',
  'BUSINESS',
  'AD_ACCOUNT',
  'CATALOG',
  'DATASET',
  'PIXEL',
  'PAGE',
  'INSTAGRAM_ACCOUNT',
  'LEAD_FORM',
] as const;
export type MetaAssetType = (typeof META_ASSET_TYPES)[number];

export interface MetaAssetBinding {
  readonly type: MetaAssetType;
  readonly id: string;
}

export interface MetaAssetContext {
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly assets: Readonly<Partial<Record<MetaAssetType, string>>>;
}

export interface CreateMetaAssetContextInput {
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly assets?: readonly MetaAssetBinding[];
}

export interface MetaReferenceScope {
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly assetType: MetaAssetType;
  readonly assetId: string;
}

export class MetaAssetContextError extends Error {
  readonly code: string;
  readonly safeDetails: Readonly<Record<string, string>>;

  constructor(code: string, safeDetails: Readonly<Record<string, string>>) {
    super(code);
    this.name = 'MetaAssetContextError';
    this.code = code;
    this.safeDetails = Object.freeze({ ...safeDetails });
  }
}

const CONNECTION_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/i;

function normalizeIdentifier(value: string, code: string, maxLength = 255): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

export function createMetaAssetContext(input: CreateMetaAssetContextInput): MetaAssetContext {
  if (!META_PLATFORM_ENVIRONMENTS.includes(input.environment)) throw new TypeError('META_ENVIRONMENT_INVALID');
  const connectionKey = normalizeIdentifier(input.connectionKey, 'META_CONNECTION_KEY_INVALID', 80);
  if (!CONNECTION_KEY_PATTERN.test(connectionKey)) throw new TypeError('META_CONNECTION_KEY_INVALID');

  const assets: Partial<Record<MetaAssetType, string>> = {};
  for (const asset of input.assets ?? []) {
    if (!META_ASSET_TYPES.includes(asset.type)) throw new TypeError('META_ASSET_TYPE_INVALID');
    if (assets[asset.type]) throw new TypeError('META_ASSET_TYPE_DUPLICATE');
    assets[asset.type] = normalizeIdentifier(asset.id, 'META_ASSET_ID_INVALID');
  }

  return Object.freeze({
    environment: input.environment,
    connectionKey,
    assets: Object.freeze(assets),
  });
}

export function getMetaAssetId(context: MetaAssetContext, assetType: MetaAssetType): string | undefined {
  return context.assets[assetType];
}

export function assertMetaReferenceScope(context: MetaAssetContext, scope: MetaReferenceScope): void {
  if (context.environment !== scope.environment) {
    throw new MetaAssetContextError('META_ASSET_ENVIRONMENT_MISMATCH', {
      expectedEnvironment: context.environment,
      actualEnvironment: scope.environment,
    });
  }
  if (context.connectionKey !== scope.connectionKey) {
    throw new MetaAssetContextError('META_CONNECTION_CONTEXT_MISMATCH', {
      environment: context.environment,
      assetType: scope.assetType,
    });
  }
  const expectedAssetId = context.assets[scope.assetType];
  if (!expectedAssetId || expectedAssetId !== scope.assetId) {
    throw new MetaAssetContextError('META_ASSET_CONTEXT_MISMATCH', {
      environment: context.environment,
      assetType: scope.assetType,
    });
  }
}
