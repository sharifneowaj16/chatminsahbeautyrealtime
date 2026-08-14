import type { MetaCapabilityId } from '../../types';
import type { MetaCredentialMaterial, MetaCredentialProvider } from '../../credentials/types';
import type { MetaCredentialRole } from '../../credentials/roles';
import type { MetaPlatformError } from '../../core/errors';

export interface MetaSdkExportable {
  exportAllData?: () => Record<string, unknown>;
  exportData?: () => Record<string, unknown>;
  paging?: unknown;
  summary?: unknown;
}

export interface MetaSdkEntity {
  get?: (fields?: readonly string[] | string[], params?: Record<string, unknown>) => Promise<unknown>;
  update?: (fields?: readonly string[] | string[], params?: Record<string, unknown>) => Promise<unknown>;
  delete?: (params?: Record<string, unknown>) => Promise<unknown>;
  [key: string]: unknown;
}

export interface MetaSdkApiClient {
  accessToken?: string;
  call?: (
    method: string,
    path: readonly string[] | string[],
    params?: Record<string, unknown>,
    files?: Record<string, unknown>,
    useMultipartFormData?: boolean,
    urlOverride?: string,
  ) => Promise<unknown>;
  setAppSecret?: (appSecret: string) => unknown;
  setDebug?: (enabled: boolean) => unknown;
  [key: string]: unknown;
}

export type MetaSdkConstructor<T = unknown> = new (...args: never[]) => T;

export interface MetaBusinessSdkRuntime {
  readonly FacebookAdsApi: {
    readonly SDK_VERSION?: string;
    readonly VERSION?: string;
    readonly GRAPH?: string;
    new (accessToken: string, locale?: string, crashLogging?: boolean): MetaSdkApiClient;
  };
  readonly Business: MetaSdkConstructor<MetaSdkEntity>;
  readonly AdAccount: MetaSdkConstructor<MetaSdkEntity>;
  readonly Campaign: MetaSdkConstructor<MetaSdkEntity>;
  readonly AdSet: MetaSdkConstructor<MetaSdkEntity>;
  readonly AdCreative: MetaSdkConstructor<MetaSdkEntity>;
  readonly Ad: MetaSdkConstructor<MetaSdkEntity>;
  readonly CustomAudience: MetaSdkConstructor<MetaSdkEntity>;
  readonly ProductCatalog: MetaSdkConstructor<MetaSdkEntity>;
  readonly ProductFeed: MetaSdkConstructor<MetaSdkEntity>;
  readonly ProductSet: MetaSdkConstructor<MetaSdkEntity>;
  readonly AdsPixel: MetaSdkConstructor<MetaSdkEntity>;
  readonly Page: MetaSdkConstructor<MetaSdkEntity>;
  readonly LeadgenForm: MetaSdkConstructor<MetaSdkEntity>;
  readonly Content: MetaSdkConstructor;
  readonly CustomData: MetaSdkConstructor;
  readonly EventRequest: MetaSdkConstructor;
  readonly ServerEvent: MetaSdkConstructor;
  readonly UserData: MetaSdkConstructor;
  readonly [key: string]: unknown;
}

export interface MetaBusinessSdkRuntimeContract {
  readonly packageVersion: string;
  readonly runtimeVersion: string;
  readonly graphVersion: string | null;
  readonly patchMetadataDrift: boolean;
  readonly requiredExports: readonly string[];
  readonly availableExports: readonly string[];
}

export interface MetaBusinessSdkClient {
  readonly api: MetaSdkApiClient;
  readonly runtime: MetaBusinessSdkRuntime;
  readonly credential: MetaCredentialMaterial;
  readonly sdkVersion: string;
  readonly graphApiVersion: string;
  readonly appSecretProofEnabled: boolean;
}

export interface MetaBusinessSdkClientFactoryOptions {
  readonly credentialProvider: MetaCredentialProvider;
  readonly appCredentialProvider?: MetaCredentialProvider;
  readonly locale?: string;
  readonly debug?: boolean;
}

export interface MetaBusinessSdkClientRequest {
  readonly capability: MetaCapabilityId;
  readonly connectionKey: string;
  readonly credentialRole: Exclude<MetaCredentialRole, 'APP'>;
  readonly graphApiVersion?: string;
  readonly correlationId?: string;
}

export interface MetaBusinessSdkOperationContext extends MetaBusinessSdkClientRequest {
  readonly operation: string;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface MetaBusinessSdkRequestLog {
  readonly phase: 'START' | 'SUCCESS' | 'FAILURE';
  readonly capability: MetaCapabilityId;
  readonly operation: string;
  readonly connectionKey: string;
  readonly credentialRole: Exclude<MetaCredentialRole, 'APP'>;
  readonly credentialVersion?: string;
  readonly graphApiVersion?: string;
  readonly sdkVersion?: string;
  readonly durationMs?: number;
  readonly error?: MetaPlatformError;
  readonly correlationId?: string;
}

export type MetaBusinessSdkLogger = (entry: MetaBusinessSdkRequestLog) => void;
