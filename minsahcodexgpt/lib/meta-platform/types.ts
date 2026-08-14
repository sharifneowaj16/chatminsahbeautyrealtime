import type { MetaInvocationContext } from './core/context';
import type { MetaResult } from './core/result';

export const META_CAPABILITY_IDS = [
  'sdk-transport',
  'credentials-versioning',
  'graph-media-boundary',
  'meta-webhooks',
  'meta-operations',
  'meta-reliability',
  'meta-workflows',
  'connection-health',
  'capi-delivery',
  'ads-marketing',
  'catalog-commerce',
  'lead-ads-crm',
  'instagram-crm',
  'social-realtime',
  'legacy-facebook',
  'browser-measurement',
  'measurement-attribution',
  'privacy-governance',
  'admin-observability',
  'release-governance',
  'facebook-oauth',
  'meta-data-model',
  'shared-meta-support',
] as const;

export type MetaCapabilityId = (typeof META_CAPABILITY_IDS)[number];
export type MetaOperationMode = 'READ' | 'WRITE';

export interface MetaPlatformRequest<TPayload = unknown> {
  readonly capability: MetaCapabilityId;
  readonly operation: string;
  readonly mode: MetaOperationMode;
  readonly payload: TPayload;
  readonly context: MetaInvocationContext;
}

export interface MetaCapabilityAdapter {
  readonly capability: MetaCapabilityId;
  invoke(request: MetaPlatformRequest): Promise<MetaResult<unknown>>;
}

export interface MetaPlatformCapabilityStatus {
  readonly capability: MetaCapabilityId;
  readonly targetPhase: number;
  readonly cutoverFlag: string;
  readonly registered: boolean;
}

export interface MetaPlatformInvoker {
  invoke<TPayload, TValue>(request: MetaPlatformRequest<TPayload>): Promise<MetaResult<TValue>>;
}
