import type { MetaAudienceHashedBatch, MetaAudienceMemberMode } from '@/lib/meta-platform/domains/audiences/types';

export type MetaAudienceMutationOperation =
  | 'CREATE_CUSTOM_AUDIENCE'
  | 'UPDATE_AUDIENCE'
  | 'CREATE_LOOKALIKE_AUDIENCE'
  | 'CREATE_RETARGETING_AUDIENCE'
  | 'UPDATE_RETARGETING_AUDIENCE'
  | 'SYNC_CUSTOM_AUDIENCE';

export type MetaAudienceMutationApprovalPayload = Readonly<{
  operation: MetaAudienceMutationOperation;
  entityType: 'AUDIENCE' | 'AUDIENCE_MEMBERS';
  resourceId: string | null;
  input: Readonly<Record<string, unknown>>;
}>;

export interface MetaAudienceSyncApprovalInput {
  readonly mode: MetaAudienceMemberMode;
  readonly batch: MetaAudienceHashedBatch;
  readonly batchDigest: string;
  readonly segment?: string;
}
