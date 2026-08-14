export const META_FEATURE_IDS = [
  'NONE',
  'GRAPH_CORE',
  'CONNECTION_HEALTH',
  'WEBHOOK_SECURITY',
  'OAUTH',
  'CAPI',
  'ADS_MARKETING',
  'CATALOG_COMMERCE',
  'LEAD_ADS',
  'INSTAGRAM_MESSAGING',
  'PAGE_MESSAGING',
  'MEASUREMENT',
  'BUSINESS_SDK',
] as const;

export type MetaFeatureId = (typeof META_FEATURE_IDS)[number];
export type MetaVersionRegressionStatus = 'PENDING' | 'PASS' | 'FAIL' | 'WAIVED';

export interface MetaVersionEntry {
  readonly releaseDate: string | null;
  readonly officialExpirationDate: string | null;
  readonly internalWarningDate: string | null;
  readonly internalBlockDate: string | null;
  readonly reviewBy: string | null;
  readonly sdkVersion: string | null;
  readonly regressionStatus: MetaVersionRegressionStatus;
  readonly notes?: string;
}

export interface MetaFeatureCompatibilityDefinition {
  readonly minimumGraphVersion: string | null;
  readonly approvedGraphVersions: readonly string[];
  readonly requiresBusinessSdk: boolean;
}

export interface MetaApiVersionPolicy {
  readonly schemaVersion: number;
  readonly verifiedAt: string;
  readonly officialVersionsUrl: string;
  readonly latestOfficialVersion: string;
  readonly minimumSupportedVersion: string;
  readonly targetVersion: string;
  readonly defaultVersion: string;
  readonly businessSdkVersion: string;
  readonly versions: Readonly<Record<string, MetaVersionEntry>>;
  readonly features: Readonly<Record<MetaFeatureId, MetaFeatureCompatibilityDefinition>>;
}

export interface MetaVersionPolicyResult {
  readonly configuredVersion: string;
  readonly latestOfficialVersion: string;
  readonly minimumSupportedVersion: string;
  readonly targetVersion: string;
  readonly officialExpirationDate: string | null;
  readonly internalWarningDate: string | null;
  readonly internalBlockDate: string | null;
  readonly reviewBy: string | null;
  readonly sdkVersion: string | null;
  readonly regressionStatus: MetaVersionRegressionStatus;
  readonly status: 'HEALTHY' | 'VERSION_WARNING' | 'ERROR';
  readonly warnings: readonly string[];
}

export interface MetaFeatureCompatibilityResult {
  readonly featureId: MetaFeatureId;
  readonly graphApiVersion: string;
  readonly sdkVersion: string;
  readonly compatible: boolean;
  readonly reasons: readonly string[];
}

export function isMetaFeatureId(value: unknown): value is MetaFeatureId {
  return typeof value === 'string' && META_FEATURE_IDS.includes(value as MetaFeatureId);
}
