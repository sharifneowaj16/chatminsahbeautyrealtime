import 'server-only';

import { createMetaPlatformError, type MetaPlatformError } from '../../core/errors';
import { createEnvironmentMetaCredentialProvider } from '../../credentials/environment-provider';
import { MetaCredentialResolutionError } from '../../credentials/provider';
import type { MetaCredentialProvider } from '../../credentials/types';
import { MetaGraphHttpClient } from '../../transports/graph-http/client';
import { debugMetaGraphAccessToken } from '../../transports/graph-http/token-debug';
import { evaluateMetaVersionPolicy, META_BUSINESS_SDK_VERSION } from '../../versioning/registry';
import { getMetaPlatformConnectionConfig, type MetaPlatformConnectionConfig } from './config';
import {
  META_CONNECTION_ASSET_KEYS,
  type MetaConnectionAssetHealth,
  type MetaConnectionAssetKey,
  type MetaConnectionPermissionHealth,
  type MetaConnectionStatus,
  type MetaConnectionTokenHealth,
  type MetaPlatformConnectionReadiness,
} from './types';

interface GraphNode { readonly id?: string; readonly name?: string; readonly username?: string }
interface PermissionRow { readonly permission?: string; readonly status?: string }

function epochToIso(value?: number) {
  return typeof value === 'number' && value > 0 ? new Date(value * 1_000).toISOString() : null;
}

function errorView(error: MetaPlatformError) {
  return { code: error.code, message: error.message };
}

function configuredAssets(config: MetaPlatformConnectionConfig): Record<MetaConnectionAssetKey, string | undefined> {
  return {
    app: config.appId,
    business: config.businessId,
    catalog: config.catalogId,
    dataset: config.datasetId,
    pixel: config.pixelId,
    page: config.pageId,
    adAccount: config.adAccountId,
    instagramAccount: config.instagramAccountId,
  };
}

function emptyAssets(config: MetaPlatformConnectionConfig): Readonly<Record<MetaConnectionAssetKey, MetaConnectionAssetHealth>> {
  const ids = configuredAssets(config);
  return Object.freeze(Object.fromEntries(META_CONNECTION_ASSET_KEYS.map((key) => [key, Object.freeze({
    configured: Boolean(ids[key]), ok: !ids[key], status: ids[key] ? 'ERROR' : 'UNCONFIGURED', id: ids[key] ?? null,
  })])) as Record<MetaConnectionAssetKey, MetaConnectionAssetHealth>);
}

function normalizeId(value: string) {
  return value.startsWith('act_') ? value.slice(4) : value;
}

function aggregateStatus(input: {
  readonly configured: boolean;
  readonly token: MetaConnectionTokenHealth;
  readonly permissions: MetaConnectionPermissionHealth;
  readonly assets: Readonly<Record<MetaConnectionAssetKey, MetaConnectionAssetHealth>>;
  readonly version: ReturnType<typeof evaluateMetaVersionPolicy>;
}): MetaConnectionStatus {
  if (!input.configured) return 'UNCONFIGURED';
  if (input.token.verified && !input.token.valid) return 'INVALID_TOKEN';
  if (!input.token.verified) return 'DEGRADED';
  if (input.permissions.missing.length > 0) return 'MISSING_PERMISSION';
  const configured = Object.values(input.assets).filter((asset) => asset.configured);
  if (configured.some((asset) => asset.status === 'ASSET_NOT_FOUND')) return 'ASSET_NOT_FOUND';
  if (configured.some((asset) => !asset.ok)) return 'ERROR';
  if (input.version.status === 'ERROR') return 'ERROR';
  if (input.version.status === 'VERSION_WARNING') return 'VERSION_WARNING';
  if (!input.permissions.checked) return 'DEGRADED';
  return 'HEALTHY';
}

function daysUntil(value: string | null, now: Date) {
  if (!value) return null;
  return Math.ceil((Date.parse(value) - now.getTime()) / 86_400_000);
}

async function inspectPermissions(input: {
  readonly client: MetaGraphHttpClient;
  readonly config: MetaPlatformConnectionConfig;
  readonly tokenScopes: readonly string[];
  readonly correlationId?: string;
}): Promise<MetaConnectionPermissionHealth> {
  const required = [...input.config.requiredPermissions];
  const result = await input.client.request<{ data?: PermissionRow[] }>({
    capability: 'connection-health', operation: 'CHECK_PERMISSIONS', method: 'GET', path: 'me/permissions',
    connectionKey: input.config.connectionName, credentialRole: 'BUSINESS_SYSTEM_USER',
    graphApiVersion: input.config.graphApiVersion, query: { limit: 200 }, correlationId: input.correlationId,
  });
  if (!result.ok) {
    const granted = [...new Set(input.tokenScopes)].sort();
    return Object.freeze({ checked: false, required, granted, declined: [], missing: required.filter((item) => !granted.includes(item)), ok: false, error: errorView(result.error) });
  }
  const rows = Array.isArray(result.value.data.data) ? result.value.data.data : [];
  const granted = [...new Set([
    ...input.tokenScopes,
    ...rows.filter((row) => row.status === 'granted' && row.permission).map((row) => String(row.permission)),
  ])].sort();
  const declined = [...new Set(rows.filter((row) => row.status !== 'granted' && row.permission).map((row) => String(row.permission)))].sort();
  const missing = required.filter((item) => !granted.includes(item));
  return Object.freeze({ checked: true, required, granted, declined, missing, ok: missing.length === 0 });
}

async function inspectAsset(input: {
  readonly client: MetaGraphHttpClient;
  readonly config: MetaPlatformConnectionConfig;
  readonly key: MetaConnectionAssetKey;
  readonly id?: string;
  readonly fields: string;
  readonly correlationId?: string;
}): Promise<MetaConnectionAssetHealth> {
  if (!input.id) return Object.freeze({ configured: false, ok: true, status: 'UNCONFIGURED', id: null });
  const result = await input.client.request<GraphNode>({
    capability: 'connection-health', operation: `CHECK_ASSET_${input.key.toUpperCase()}`, method: 'GET', path: input.id,
    connectionKey: input.config.connectionName, credentialRole: 'BUSINESS_SYSTEM_USER',
    graphApiVersion: input.config.graphApiVersion, query: { fields: input.fields }, correlationId: input.correlationId,
  });
  if (!result.ok) {
    const status = result.error.category === 'NOT_FOUND' || result.error.code.includes('NOT_FOUND') ? 'ASSET_NOT_FOUND' : 'ERROR';
    return Object.freeze({ configured: true, ok: false, status, id: input.id, error: { ...errorView(result.error), ...(result.error.safeDetails?.providerSubcode !== undefined ? { subcode: result.error.safeDetails.providerSubcode as string | number } : {}), ...(typeof result.error.safeDetails?.traceId === 'string' ? { traceId: result.error.safeDetails.traceId } : {}) } });
  }
  const node = result.value.data;
  if (!node.id || normalizeId(node.id) !== normalizeId(input.id)) {
    return Object.freeze({ configured: true, ok: false, status: 'ASSET_NOT_FOUND', id: input.id, error: { code: 'META_ASSET_ID_MISMATCH', message: 'Meta returned a different asset identifier.' } });
  }
  return Object.freeze({ configured: true, ok: true, status: 'HEALTHY', id: input.id, name: node.name ?? node.username ?? null });
}

async function inspectAssets(input: {
  readonly client: MetaGraphHttpClient;
  readonly config: MetaPlatformConnectionConfig;
  readonly correlationId?: string;
}) {
  const c = input.config;
  const descriptors = [
    ['app', c.appId, 'id,name'], ['business', c.businessId, 'id,name,verification_status'],
    ['catalog', c.catalogId, 'id,name,vertical,business'], ['dataset', c.datasetId, 'id,name'],
    ['pixel', c.pixelId, 'id,name'], ['page', c.pageId, 'id,name,tasks'],
    ['adAccount', c.adAccountId, 'id,name,account_status,currency'], ['instagramAccount', c.instagramAccountId, 'id,username'],
  ] as const;
  const entries = await Promise.all(descriptors.map(async ([key, id, fields]) => [key, await inspectAsset({ client: input.client, config: c, key, id, fields, correlationId: input.correlationId })] as const));
  return Object.freeze(Object.fromEntries(entries) as Record<MetaConnectionAssetKey, MetaConnectionAssetHealth>);
}

export class MetaPlatformConnectionHealthService {
  readonly #credentialProvider: MetaCredentialProvider;
  readonly #fetchImpl?: typeof fetch;

  constructor(input: { readonly credentialProvider?: MetaCredentialProvider; readonly fetchImpl?: typeof fetch } = {}) {
    this.#credentialProvider = input.credentialProvider ?? createEnvironmentMetaCredentialProvider();
    this.#fetchImpl = input.fetchImpl;
  }

  bootstrap(input: { readonly config?: MetaPlatformConnectionConfig; readonly now?: Date } = {}): MetaPlatformConnectionReadiness {
    const config = input.config ?? getMetaPlatformConnectionConfig();
    const now = input.now ?? new Date();
    const versionPolicy = evaluateMetaVersionPolicy({ configuredVersion: config.graphApiVersion, sdkVersion: META_BUSINESS_SDK_VERSION, now });
    return Object.freeze({
      connectionName: config.connectionName, checkedAt: now.toISOString(), status: 'UNCONFIGURED', graphApiVersion: config.graphApiVersion,
      sdkVersion: META_BUSINESS_SDK_VERSION, tokenRef: null,
      token: Object.freeze({ configured: false, verified: false, valid: false, appIdMatches: null, appId: null, type: null, expiresAt: null, dataAccessExpiresAt: null, scopes: [] }),
      permissions: Object.freeze({ checked: false, required: [...config.requiredPermissions], granted: [], declined: [], missing: [...config.requiredPermissions], ok: false }),
      assets: emptyAssets(config), versionPolicy, warnings: Object.freeze(['RUNTIME_API_VERIFICATION_REQUIRED', ...versionPolicy.warnings]), lastError: null,
      platform: Object.freeze({ capability: 'connection-health', transport: 'GRAPH_HTTP', credentialRole: 'BUSINESS_SYSTEM_USER' }),
    });
  }

  async check(input: {
    readonly config?: MetaPlatformConnectionConfig;
    readonly now?: Date;
    readonly correlationId?: string;
  } = {}): Promise<MetaPlatformConnectionReadiness> {
    const config = input.config ?? getMetaPlatformConnectionConfig();
    const now = input.now ?? new Date();
    const versionPolicy = evaluateMetaVersionPolicy({ configuredVersion: config.graphApiVersion, sdkVersion: META_BUSINESS_SDK_VERSION, now });
    let businessCredential;
    let appCredential;
    try {
      businessCredential = await this.#credentialProvider.resolve({ connectionKey: config.connectionName, role: 'BUSINESS_SYSTEM_USER' });
    } catch (error) {
      const code = error instanceof MetaCredentialResolutionError ? error.code : 'META_CREDENTIAL_RESOLUTION_FAILED';
      const bootstrap = this.bootstrap({ config, now });
      return Object.freeze({ ...bootstrap, lastError: { code, message: 'The Meta business credential is not configured.' }, warnings: Object.freeze([...bootstrap.warnings, code]) });
    }
    try {
      appCredential = await this.#credentialProvider.resolve({ connectionKey: config.connectionName, role: 'APP' });
    } catch (error) {
      const code = error instanceof MetaCredentialResolutionError ? error.code : 'META_APP_CREDENTIAL_RESOLUTION_FAILED';
      const token: MetaConnectionTokenHealth = Object.freeze({
        configured: true, verified: false, valid: false, appIdMatches: null, appId: null, type: null, expiresAt: null, dataAccessExpiresAt: null,
        scopes: [...businessCredential.metadata.permissions], credentialVersion: businessCredential.metadata.credentialVersion,
        error: { code, message: 'The Meta app credential is required for token verification.' },
      });
      const permissions: MetaConnectionPermissionHealth = Object.freeze({ checked: false, required: [...config.requiredPermissions], granted: [...businessCredential.metadata.permissions], declined: [], missing: config.requiredPermissions.filter((item) => !businessCredential.metadata.permissions.includes(item)), ok: false });
      return Object.freeze({
        connectionName: config.connectionName, checkedAt: now.toISOString(), status: 'DEGRADED', graphApiVersion: config.graphApiVersion,
        sdkVersion: META_BUSINESS_SDK_VERSION, tokenRef: businessCredential.metadata.secretRef, token, permissions,
        assets: emptyAssets(config), versionPolicy, warnings: Object.freeze([code, ...versionPolicy.warnings]), lastError: token.error ?? null,
        platform: Object.freeze({ capability: 'connection-health', transport: 'GRAPH_HTTP', credentialRole: 'BUSINESS_SYSTEM_USER' }),
      });
    }

    const appId = config.appId ?? businessCredential.metadata.appId ?? appCredential.metadata.appId;
    if (!appId) {
      const error = createMetaPlatformError({ code: 'META_APP_ID_NOT_CONFIGURED', category: 'CONFIGURATION', message: 'META_APP_ID is required for token verification.', retryable: false, correlationId: input.correlationId });
      const bootstrap = this.bootstrap({ config, now });
      return Object.freeze({ ...bootstrap, status: 'DEGRADED', tokenRef: businessCredential.metadata.secretRef, lastError: errorView(error), warnings: Object.freeze([...bootstrap.warnings, error.code]) });
    }

    const debug = await debugMetaGraphAccessToken({
      accessToken: businessCredential.readAccessToken(), appId, appSecret: appCredential.readAppSecret(),
      graphApiVersion: config.graphApiVersion, fetchImpl: this.#fetchImpl, correlationId: input.correlationId,
    });
    const token: MetaConnectionTokenHealth = debug.ok
      ? Object.freeze({
          configured: true, verified: true, valid: debug.value.is_valid === true && debug.value.app_id === appId,
          appIdMatches: debug.value.app_id === appId, appId: debug.value.app_id ?? null, type: debug.value.type ?? null,
          expiresAt: epochToIso(debug.value.expires_at), dataAccessExpiresAt: epochToIso(debug.value.data_access_expires_at),
          scopes: Object.freeze([...new Set(debug.value.scopes ?? [])].sort()), credentialVersion: businessCredential.metadata.credentialVersion,
          ...(debug.value.app_id === appId ? {} : { error: { code: 'META_TOKEN_APP_MISMATCH', message: 'The configured token belongs to a different Meta app.' } }),
        })
      : Object.freeze({
          configured: true, verified: debug.error.category !== 'TIMEOUT' && debug.error.code !== 'META_GRAPH_TOKEN_DEBUG_NETWORK_ERROR', valid: false,
          appIdMatches: null, appId: null, type: null, expiresAt: null, dataAccessExpiresAt: null, scopes: Object.freeze([]),
          credentialVersion: businessCredential.metadata.credentialVersion, error: errorView(debug.error),
        });

    let permissions: MetaConnectionPermissionHealth = Object.freeze({ checked: false, required: [...config.requiredPermissions], granted: [...token.scopes], declined: [], missing: config.requiredPermissions.filter((item) => !token.scopes.includes(item)), ok: false });
    let assets = emptyAssets(config);
    if (token.valid) {
      const client = new MetaGraphHttpClient({ credentialProvider: this.#credentialProvider, appCredentialProvider: this.#credentialProvider, fetchImpl: this.#fetchImpl });
      [permissions, assets] = await Promise.all([
        inspectPermissions({ client, config, tokenScopes: token.scopes, correlationId: input.correlationId }),
        inspectAssets({ client, config, correlationId: input.correlationId }),
      ]);
    }

    const warnings = [...versionPolicy.warnings];
    if (!config.appId) warnings.push('META_APP_ID_NOT_CONFIGURED');
    if (token.error) warnings.push(token.error.code);
    if (permissions.missing.length) warnings.push('META_REQUIRED_PERMISSION_MISSING');
    for (const [key, asset] of Object.entries(assets)) if (asset.configured && !asset.ok) warnings.push(`META_${key.toUpperCase()}_UNHEALTHY`);
    const tokenDays = daysUntil(token.expiresAt, now);
    const dataDays = daysUntil(token.dataAccessExpiresAt, now);
    if (tokenDays !== null && tokenDays <= 30) warnings.push(tokenDays <= 7 ? 'META_TOKEN_EXPIRES_WITHIN_7_DAYS' : 'META_TOKEN_EXPIRES_WITHIN_30_DAYS');
    if (dataDays !== null && dataDays <= 30) warnings.push(dataDays <= 7 ? 'META_DATA_ACCESS_EXPIRES_WITHIN_7_DAYS' : 'META_DATA_ACCESS_EXPIRES_WITHIN_30_DAYS');
    const status = aggregateStatus({ configured: true, token, permissions, assets, version: versionPolicy });
    const firstAssetError = Object.values(assets).find((asset) => asset.error)?.error;
    return Object.freeze({
      connectionName: config.connectionName, checkedAt: now.toISOString(), status, graphApiVersion: config.graphApiVersion,
      sdkVersion: META_BUSINESS_SDK_VERSION, tokenRef: businessCredential.metadata.secretRef, token, permissions, assets, versionPolicy,
      warnings: Object.freeze([...new Set(warnings)]), lastError: token.error ?? permissions.error ?? (firstAssetError ? { code: firstAssetError.code, message: firstAssetError.message } : null),
      platform: Object.freeze({ capability: 'connection-health', transport: 'GRAPH_HTTP', credentialRole: 'BUSINESS_SYSTEM_USER' }),
    });
  }
}
