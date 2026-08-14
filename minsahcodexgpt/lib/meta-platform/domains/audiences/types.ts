import type { MetaBusinessSdkCursor } from '../../transports/business-sdk/normalization';

export type MetaAudienceMemberMode = 'add' | 'remove' | 'replace';
export type MetaAudienceSegment = 'all_marketable' | 'newsletter' | 'purchasers_180d';

export interface MetaAudienceCustomerRecord {
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly postalCode?: string | null;
  readonly country?: string | null;
  readonly externalId?: string | null;
  readonly value?: number | null;
  readonly consent?: boolean;
  readonly consentStatus?: string | null;
}

export interface MetaAudienceHashedBatch {
  readonly schema: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
  readonly accepted: number;
  readonly rejected: number;
  readonly valueBased: boolean;
}

export type MetaPlatformAudienceCursor = MetaBusinessSdkCursor<Record<string, unknown>>;
