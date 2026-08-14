import type { MetaVersionPolicyResult } from '../../versioning/types';

export type MetaConnectionStatus =
  | 'UNCONFIGURED'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'INVALID_TOKEN'
  | 'MISSING_PERMISSION'
  | 'ASSET_NOT_FOUND'
  | 'VERSION_WARNING'
  | 'ERROR';

export const META_CONNECTION_ASSET_KEYS = [
  'app', 'business', 'catalog', 'dataset', 'pixel', 'page', 'adAccount', 'instagramAccount',
] as const;
export type MetaConnectionAssetKey = (typeof META_CONNECTION_ASSET_KEYS)[number];

export interface MetaConnectionAssetHealth {
  readonly configured: boolean;
  readonly ok: boolean;
  readonly status: 'UNCONFIGURED' | 'HEALTHY' | 'ASSET_NOT_FOUND' | 'ERROR';
  readonly id: string | null;
  readonly name?: string | null;
  readonly error?: { readonly code: string; readonly message: string; readonly subcode?: string | number; readonly traceId?: string };
}

export interface MetaConnectionTokenHealth {
  readonly configured: boolean;
  readonly verified: boolean;
  readonly valid: boolean;
  readonly appIdMatches: boolean | null;
  readonly appId: string | null;
  readonly type: string | null;
  readonly expiresAt: string | null;
  readonly dataAccessExpiresAt: string | null;
  readonly scopes: readonly string[];
  readonly credentialVersion?: string;
  readonly error?: { readonly code: string; readonly message: string };
}

export interface MetaConnectionPermissionHealth {
  readonly checked: boolean;
  readonly required: readonly string[];
  readonly granted: readonly string[];
  readonly declined: readonly string[];
  readonly missing: readonly string[];
  readonly ok: boolean;
  readonly error?: { readonly code: string; readonly message: string };
}

export interface MetaPlatformConnectionReadiness {
  readonly connectionName: string;
  readonly checkedAt: string;
  readonly status: MetaConnectionStatus;
  readonly graphApiVersion: string;
  readonly sdkVersion: string;
  readonly tokenRef: string | null;
  readonly token: MetaConnectionTokenHealth;
  readonly permissions: MetaConnectionPermissionHealth;
  readonly assets: Readonly<Record<MetaConnectionAssetKey, MetaConnectionAssetHealth>>;
  readonly versionPolicy: MetaVersionPolicyResult;
  readonly warnings: readonly string[];
  readonly lastError: { readonly code: string; readonly message: string } | null;
  readonly platform: {
    readonly capability: 'connection-health';
    readonly transport: 'GRAPH_HTTP';
    readonly credentialRole: 'BUSINESS_SYSTEM_USER';
  };
}
