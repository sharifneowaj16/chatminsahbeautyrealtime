import { evaluateMetaPagePermissions, type MetaPageOperation } from './permissions.ts';

function cleanId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return /^[A-Za-z0-9._:-]{1,255}$/.test(clean) ? clean : null;
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : {};
}

function asset(assets: unknown, key: string): Readonly<Record<string, unknown>> {
  return record(record(assets)[key]);
}

export type MetaPageHealthReason =
  | 'HEALTHY'
  | 'META_PAGE_NOT_CONFIGURED'
  | 'META_PAGE_TOKEN_NOT_CONFIGURED'
  | 'META_PAGE_TOKEN_UNVERIFIED'
  | 'META_PAGE_TOKEN_EXPIRED'
  | 'META_PAGE_DATA_ACCESS_EXPIRED'
  | 'META_PAGE_ASSET_UNHEALTHY'
  | 'META_PAGE_IDENTITY_MISMATCH'
  | 'META_APP_IDENTITY_MISMATCH'
  | 'META_BUSINESS_IDENTITY_MISMATCH'
  | 'META_INSTAGRAM_PAGE_BINDING_MISMATCH'
  | 'META_PAGE_PERMISSIONS_UNCHECKED'
  | 'META_PAGE_PERMISSION_MISSING';

export type MetaPageHealthProjection = Readonly<{
  operation: MetaPageOperation;
  ready: boolean;
  reasonCode: MetaPageHealthReason;
  pageId: string | null;
  appId: string | null;
  businessId: string | null;
  instagramAccountId: string | null;
  token: Readonly<{
    configured: boolean;
    verified: boolean;
    expired: boolean;
    dataAccessExpired: boolean;
  }>;
  permissions: Readonly<{
    checked: boolean;
    required: readonly string[];
    missing: readonly string[];
    declined: readonly string[];
  }>;
  checkedAt: string | null;
}>;

export function evaluateMetaPageHealth(input: Readonly<{
  operation: MetaPageOperation;
  expectedPageId: unknown;
  expectedAppId?: unknown;
  expectedBusinessId?: unknown;
  expectedInstagramAccountId?: unknown;
  readiness: unknown;
  now: Date;
}>): MetaPageHealthProjection {
  const readiness = record(input.readiness);
  const assets = readiness.assets;
  const pageAsset = asset(assets, 'page');
  const appAsset = asset(assets, 'app');
  const businessAsset = asset(assets, 'business');
  const instagramAsset = asset(assets, 'instagramAccount');
  const expectedPageId = cleanId(input.expectedPageId);
  const expectedAppId = cleanId(input.expectedAppId);
  const expectedBusinessId = cleanId(input.expectedBusinessId);
  const expectedInstagramAccountId = cleanId(input.expectedInstagramAccountId);
  const pageId = cleanId(pageAsset.id);
  const appId = cleanId(appAsset.id);
  const businessId = cleanId(businessAsset.id);
  const instagramAccountId = cleanId(instagramAsset.id);
  const token = record(readiness.token);
  const tokenConfigured = token.configured === true || Boolean(cleanId(readiness.tokenRef));
  const tokenVerified = token.valid === true || readiness.status === 'HEALTHY' || readiness.status === 'DEGRADED';
  const expiresAt = dateValue(token.expiresAt ?? readiness.tokenExpiresAt);
  const dataAccessExpiresAt = dateValue(token.dataAccessExpiresAt ?? readiness.dataAccessExpiresAt);
  const tokenExpired = Boolean(expiresAt && expiresAt.getTime() <= input.now.getTime());
  const dataAccessExpired = Boolean(dataAccessExpiresAt && dataAccessExpiresAt.getTime() <= input.now.getTime());
  const permissions = evaluateMetaPagePermissions({ operation: input.operation, permissions: readiness.permissions });
  let reasonCode: MetaPageHealthReason = 'HEALTHY';
  if (!expectedPageId) reasonCode = 'META_PAGE_NOT_CONFIGURED';
  else if (!tokenConfigured) reasonCode = 'META_PAGE_TOKEN_NOT_CONFIGURED';
  else if (!tokenVerified) reasonCode = 'META_PAGE_TOKEN_UNVERIFIED';
  else if (tokenExpired) reasonCode = 'META_PAGE_TOKEN_EXPIRED';
  else if (dataAccessExpired) reasonCode = 'META_PAGE_DATA_ACCESS_EXPIRED';
  else if (pageAsset.ok !== true || pageAsset.status !== 'HEALTHY') reasonCode = 'META_PAGE_ASSET_UNHEALTHY';
  else if (pageId !== expectedPageId) reasonCode = 'META_PAGE_IDENTITY_MISMATCH';
  else if (expectedAppId && appId !== expectedAppId) reasonCode = 'META_APP_IDENTITY_MISMATCH';
  else if (expectedBusinessId && businessId !== expectedBusinessId) reasonCode = 'META_BUSINESS_IDENTITY_MISMATCH';
  else if (expectedInstagramAccountId && instagramAccountId !== expectedInstagramAccountId) reasonCode = 'META_INSTAGRAM_PAGE_BINDING_MISMATCH';
  else if (!permissions.allowed) reasonCode = permissions.checked ? 'META_PAGE_PERMISSION_MISSING' : 'META_PAGE_PERMISSIONS_UNCHECKED';
  return Object.freeze({
    operation: input.operation,
    ready: reasonCode === 'HEALTHY',
    reasonCode,
    pageId,
    appId,
    businessId,
    instagramAccountId,
    token: Object.freeze({ configured: tokenConfigured, verified: tokenVerified, expired: tokenExpired, dataAccessExpired }),
    permissions: Object.freeze({ checked: permissions.checked, required: permissions.required, missing: permissions.missing, declined: permissions.declined }),
    checkedAt: dateValue(readiness.lastCheckedAt ?? readiness.checkedAt)?.toISOString() ?? null,
  });
}

export function assertMetaPageHealthReady(projection: MetaPageHealthProjection): void {
  if (!projection.ready) {
    throw Object.assign(new Error(projection.reasonCode), { code: projection.reasonCode, status: 409, retryable: false });
  }
}
