import type {
  CreateMetaProviderJobInput,
  CreateMetaReconciliationInput,
  CreateMetaWorkflowInput,
  MetaProviderJobRecord,
  MetaProviderJobStatus,
  MetaReconciliationRecord,
  MetaReconciliationStatus,
  MetaReplayRecord,
  MetaWorkflowRecord,
  MetaWorkflowStatus,
  MetaWorkflowStepRecord,
  MetaWorkflowStepStatus,
} from './types';

export class MetaOptimisticConcurrencyError extends Error {
  readonly code = 'META_OPTIMISTIC_CONCURRENCY_CONFLICT';
  readonly safeDetails: Readonly<{ entity: string; id: string; expectedVersion: number; actualVersion: number }>;

  constructor(input: { readonly entity: string; readonly id: string; readonly expectedVersion: number; readonly actualVersion: number }) {
    super(`${input.entity} was changed by another worker.`);
    this.name = 'MetaOptimisticConcurrencyError';
    this.safeDetails = Object.freeze({ ...input });
  }
}

export class MetaFencingTokenRejectedError extends Error {
  readonly code = 'META_FENCING_TOKEN_REJECTED';
  readonly safeDetails: Readonly<{ scopeKey: string; suppliedToken: number; currentToken: number }>;

  constructor(input: { readonly scopeKey: string; readonly suppliedToken: number; readonly currentToken: number }) {
    super('A stale workflow fencing token was rejected.');
    this.name = 'MetaFencingTokenRejectedError';
    this.safeDetails = Object.freeze({ ...input });
  }
}

export type MetaWorkflowMutationGuard =
  | {
    readonly mode: 'FENCED';
    readonly scopeKey: string;
    readonly fencingToken: number;
  }
  | {
    readonly mode: 'ADMINISTRATIVE';
    readonly actorId: string;
    readonly reason: string;
  };

export interface CommitMetaWorkflowProviderOutcomeInput {
  readonly guard: Extract<MetaWorkflowMutationGuard, { readonly mode: 'FENCED' }>;
  readonly workflow: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly status: MetaWorkflowStatus;
    readonly currentStepKey?: string | null;
    readonly lastError?: Readonly<Record<string, unknown>> | null;
    readonly markCompleted?: boolean;
  };
  readonly step: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly status: MetaWorkflowStepStatus;
    readonly output?: Readonly<Record<string, unknown>> | null;
    readonly beforeState?: Readonly<Record<string, unknown>> | null;
    readonly afterState?: Readonly<Record<string, unknown>> | null;
    readonly lastError?: Readonly<Record<string, unknown>> | null;
    readonly markCompleted?: boolean;
  };
  readonly providerJob: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly status: MetaProviderJobStatus;
    readonly providerJobId?: string | null;
    readonly providerObjectId?: string | null;
    readonly responseState?: Readonly<Record<string, unknown>> | null;
    readonly afterState?: Readonly<Record<string, unknown>> | null;
    readonly unknownSince?: Date | null;
    readonly lastCheckedAt?: Date;
  };
  readonly reconciliation: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly status: MetaReconciliationStatus;
    readonly nextCheckAt?: Date;
    readonly evidence?: Readonly<Record<string, unknown>> | null;
    readonly resolution?: Readonly<Record<string, unknown>> | null;
    readonly lastError?: Readonly<Record<string, unknown>> | null;
  };
}

export interface MetaWorkflowStore {
  createWorkflow(input: CreateMetaWorkflowInput): Promise<{
    readonly created: boolean;
    readonly workflow: MetaWorkflowRecord;
    readonly steps: readonly MetaWorkflowStepRecord[];
  }>;
  getWorkflow(workflowId: string): Promise<MetaWorkflowRecord | null>;
  getWorkflowByOperation(operationId: string): Promise<MetaWorkflowRecord | null>;
  listWorkflowSteps(workflowId: string): Promise<readonly MetaWorkflowStepRecord[]>;
  updateWorkflow(input: {
    readonly workflowId: string;
    readonly expectedVersion: number;
    readonly guard: MetaWorkflowMutationGuard;
    readonly status?: MetaWorkflowStatus;
    readonly currentStepKey?: string | null;
    readonly context?: Readonly<Record<string, unknown>>;
    readonly lastError?: Readonly<Record<string, unknown>> | null;
    readonly markStarted?: boolean;
    readonly markCompleted?: boolean;
  }): Promise<MetaWorkflowRecord>;
  updateStep(input: {
    readonly stepId: string;
    readonly expectedVersion: number;
    readonly guard: MetaWorkflowMutationGuard;
    readonly status?: MetaWorkflowStepStatus;
    readonly input?: Readonly<Record<string, unknown>> | null;
    readonly output?: Readonly<Record<string, unknown>> | null;
    readonly beforeState?: Readonly<Record<string, unknown>> | null;
    readonly afterState?: Readonly<Record<string, unknown>> | null;
    readonly lastError?: Readonly<Record<string, unknown>> | null;
    readonly incrementAttempt?: boolean;
    readonly markStarted?: boolean;
    readonly markCompleted?: boolean;
  }): Promise<MetaWorkflowStepRecord>;
  createProviderJob(input: CreateMetaProviderJobInput & { readonly guard: MetaWorkflowMutationGuard }): Promise<MetaProviderJobRecord>;
  prepareProviderCommand(input: {
    readonly guard: MetaWorkflowMutationGuard;
    readonly job: CreateMetaProviderJobInput;
    readonly reconciliation: Omit<CreateMetaReconciliationInput, 'providerJobId'>;
  }): Promise<{ readonly job: MetaProviderJobRecord; readonly reconciliation: MetaReconciliationRecord }>;
  getProviderJob(providerJobId: string): Promise<MetaProviderJobRecord | null>;
  listProviderJobs(workflowId: string): Promise<readonly MetaProviderJobRecord[]>;
  updateProviderJob(input: {
    readonly providerJobId: string;
    readonly expectedVersion: number;
    readonly guard: MetaWorkflowMutationGuard;
    readonly status?: MetaProviderJobStatus;
    readonly providerJobIdValue?: string | null;
    readonly providerObjectId?: string | null;
    readonly responseState?: Readonly<Record<string, unknown>> | null;
    readonly afterState?: Readonly<Record<string, unknown>> | null;
    readonly unknownSince?: Date | null;
    readonly lastCheckedAt?: Date;
  }): Promise<MetaProviderJobRecord>;
  createReconciliation(input: CreateMetaReconciliationInput & { readonly guard: MetaWorkflowMutationGuard }): Promise<MetaReconciliationRecord>;
  getReconciliation(reconciliationId: string): Promise<MetaReconciliationRecord | null>;
  listReconciliations(workflowId: string): Promise<readonly MetaReconciliationRecord[]>;
  listDueReconciliations(input?: { readonly now?: Date; readonly limit?: number }): Promise<readonly MetaReconciliationRecord[]>;
  updateReconciliation(input: {
    readonly reconciliationId: string;
    readonly expectedVersion: number;
    readonly guard: MetaWorkflowMutationGuard;
    readonly status?: MetaReconciliationStatus;
    readonly nextCheckAt?: Date;
    readonly evidence?: Readonly<Record<string, unknown>> | null;
    readonly resolution?: Readonly<Record<string, unknown>> | null;
    readonly lastError?: Readonly<Record<string, unknown>> | null;
    readonly incrementAttempts?: boolean;
  }): Promise<MetaReconciliationRecord>;
  commitProviderOutcome(input: CommitMetaWorkflowProviderOutcomeInput): Promise<{
    readonly workflow: MetaWorkflowRecord;
    readonly step: MetaWorkflowStepRecord;
    readonly providerJob: MetaProviderJobRecord;
    readonly reconciliation: MetaReconciliationRecord;
  }>;
  createReplay(input: {
    readonly sourceOperationId: string;
    readonly requestedBy: string;
    readonly reason: string;
    readonly idempotencyKey: string;
    readonly requestDigest: string;
    readonly expiresAt: Date;
  }): Promise<MetaReplayRecord>;
  approveReplay(input: {
    readonly replayId: string;
    readonly approvedBy: string;
    readonly approvalRole: string;
    readonly approvedAt: Date;
  }): Promise<MetaReplayRecord>;
  completeReplay(input: {
    readonly replayId: string;
    readonly replayOperationId?: string;
    readonly rejectionCode?: string;
  }): Promise<MetaReplayRecord>;
  getReplayByIdempotencyKey(idempotencyKey: string): Promise<MetaReplayRecord | null>;
  listReplays(sourceOperationId: string): Promise<readonly MetaReplayRecord[]>;
  assertFencingToken(scopeKey: string, fencingToken: number): Promise<void>;
  observeFencingToken(scopeKey: string, fencingToken: number): Promise<void>;
}
