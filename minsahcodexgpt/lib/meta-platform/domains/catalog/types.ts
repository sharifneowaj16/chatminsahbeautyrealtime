import type { MetaItemsBatchRequest } from '@/lib/meta/catalog/adapters/items-batch';

export type MetaCatalogBatchTerminalStatus = 'SUBMITTED' | 'SUCCESS' | 'FAILED';
export type MetaCatalogBatchItemOutcome = Readonly<{
  retailerId?: string;
  index?: number;
  status: 'SUCCESS' | 'FAILED';
  retryable: boolean;
  error: unknown | null;
}>;

export type MetaCatalogBatchStatusResult = Readonly<{
  handle: string;
  catalogId: string;
  status: MetaCatalogBatchTerminalStatus;
  rawStatus: string | null;
  errors: unknown | null;
  itemOutcomes: readonly MetaCatalogBatchItemOutcome[];
  response: unknown;
}>;

export type MetaCatalogDeletePlanPayload = Readonly<{
  catalogId: string;
  retailerIds: readonly string[];
  digest: string;
  itemCount: number;
  sourceSnapshotHash: string;
  managedItemCount: number;
  deleteRatio: number;
  requiresEmergencyOverride: boolean;
}>;

export type MetaCatalogPreparedSubmission = Readonly<{
  request: MetaItemsBatchRequest;
  retailerId: string;
  sourceType: string;
  sourceId: string;
  payloadHash?: string;
  state: 'SUBMITTED' | 'DELETE_SUBMITTED';
  attempt: number;
  retryOfBatchItemId?: string;
}>;
