import type { MetaBusinessSdkCursor } from '../../transports/business-sdk/normalization';

export type MetaPlatformInsightLevel = 'account' | 'campaign' | 'adset' | 'ad';
export interface MetaPlatformInsightInput {
  readonly level?: MetaPlatformInsightLevel;
  readonly since?: string;
  readonly until?: string;
  readonly datePreset?: string;
  readonly breakdowns?: readonly string[];
  readonly filtering?: readonly unknown[];
  readonly limit?: number;
}
export type MetaPlatformInsightCursor = MetaBusinessSdkCursor<Record<string, unknown>>;
