export type MetaConnectionStatus =
  | 'UNCONFIGURED'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'INVALID_TOKEN'
  | 'MISSING_PERMISSION'
  | 'ASSET_NOT_FOUND'
  | 'VERSION_WARNING'
  | 'ERROR';

export type MetaAssetKey =
  | 'app'
  | 'business'
  | 'catalog'
  | 'dataset'
  | 'pixel'
  | 'page'
  | 'adAccount'
  | 'instagramAccount';

export type MetaAssetHealth = {
  configured: boolean;
  ok: boolean;
  status: 'UNCONFIGURED' | 'HEALTHY' | 'ASSET_NOT_FOUND' | 'ERROR';
  id: string | null;
  name?: string | null;
  error?: { code: string; message: string; subcode?: string | number; traceId?: string };
};

export type MetaTokenHealth = {
  configured: boolean;
  verified: boolean;
  valid: boolean;
  appIdMatches: boolean | null;
  appId: string | null;
  type: string | null;
  expiresAt: string | null;
  dataAccessExpiresAt: string | null;
  scopes: string[];
  error?: { code: string; message: string };
};

export type MetaPermissionHealth = {
  checked: boolean;
  required: string[];
  granted: string[];
  declined: string[];
  missing: string[];
  ok: boolean;
  error?: { code: string; message: string };
};

export type MetaVersionPolicyResult = {
  configuredVersion: string;
  latestOfficialVersion: string;
  minimumSupportedVersion: string;
  targetVersion: string;
  officialExpirationDate: string | null;
  internalWarningDate: string | null;
  internalBlockDate: string | null;
  reviewBy: string | null;
  sdkVersion: string | null;
  regressionStatus: 'PENDING' | 'PASS' | 'FAIL' | 'WAIVED';
  status: 'HEALTHY' | 'VERSION_WARNING' | 'ERROR';
  warnings: string[];
};

export type MetaConnectionReadiness = {
  connectionName: string;
  checkedAt: string;
  status: MetaConnectionStatus;
  graphApiVersion: string;
  sdkVersion: string;
  tokenRef: string | null;
  token: MetaTokenHealth;
  permissions: MetaPermissionHealth;
  assets: Record<MetaAssetKey, MetaAssetHealth>;
  versionPolicy: MetaVersionPolicyResult;
  warnings: string[];
  lastError: { code: string; message: string } | null;
};

export type MetaConnectionCheckScope = 'TOKEN' | 'PERMISSIONS' | 'ASSETS' | 'VERSION';
