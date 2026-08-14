import type { MetaOperationPriority } from '../reliability/types';

export const META_WORKFLOW_STATUSES = [
  'PENDING',
  'RUNNING',
  'WAITING_RECONCILIATION',
  'COMPENSATING',
  'COMPENSATION_FAILED_RETRYABLE',
  'SUCCEEDED',
  'FAILED',
  'COMPENSATED',
  'CANCELLED',
] as const;
export type MetaWorkflowStatus = (typeof META_WORKFLOW_STATUSES)[number];

export const META_WORKFLOW_STEP_STATUSES = [
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'UNKNOWN',
  'COMPENSATING',
  'COMPENSATION_FAILED_RETRYABLE',
  'COMPENSATED',
  'SKIPPED',
] as const;
export type MetaWorkflowStepStatus = (typeof META_WORKFLOW_STEP_STATUSES)[number];

export const META_PROVIDER_JOB_PURPOSES = ['EXECUTION', 'COMPENSATION'] as const;
export type MetaProviderJobPurpose = (typeof META_PROVIDER_JOB_PURPOSES)[number];

export const META_PROVIDER_JOB_STATUSES = [
  'PENDING',
  'SUBMITTED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'UNKNOWN',
  'CANCELLED',
] as const;
export type MetaProviderJobStatus = (typeof META_PROVIDER_JOB_STATUSES)[number];

export const META_RECONCILIATION_STATUSES = [
  'PENDING',
  'RUNNING',
  'RESOLVED_SUCCEEDED',
  'RESOLVED_FAILED',
  'NEEDS_REVIEW',
  'EXPIRED',
] as const;
export type MetaReconciliationStatus = (typeof META_RECONCILIATION_STATUSES)[number];

export const META_REPLAY_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'CREATED',
  'REJECTED',
] as const;
export type MetaReplayStatus = (typeof META_REPLAY_STATUSES)[number];

export interface MetaWorkflowRecord {
  readonly id: string;
  readonly operationId: string;
  readonly definitionId: string;
  readonly definitionVersion: number;
  readonly status: MetaWorkflowStatus;
  readonly currentStepKey?: string;
  readonly priority: MetaOperationPriority;
  readonly context: Readonly<Record<string, unknown>>;
  readonly version: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly lastError?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MetaWorkflowStepRecord {
  readonly id: string;
  readonly workflowId: string;
  readonly stepKey: string;
  readonly ordinal: number;
  readonly status: MetaWorkflowStepStatus;
  readonly attempt: number;
  readonly version: number;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly beforeState?: Readonly<Record<string, unknown>>;
  readonly afterState?: Readonly<Record<string, unknown>>;
  readonly lastError?: Readonly<Record<string, unknown>>;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MetaProviderJobRecord {
  readonly id: string;
  readonly workflowId: string;
  readonly stepId: string;
  readonly purpose: MetaProviderJobPurpose;
  readonly capability: string;
  readonly operationType: string;
  readonly requestFingerprint: string;
  readonly providerJobType?: string;
  readonly providerJobId?: string;
  readonly providerObjectId?: string;
  readonly status: MetaProviderJobStatus;
  readonly requestState?: Readonly<Record<string, unknown>>;
  readonly responseState?: Readonly<Record<string, unknown>>;
  readonly beforeState?: Readonly<Record<string, unknown>>;
  readonly afterState?: Readonly<Record<string, unknown>>;
  readonly unknownSince?: string;
  readonly lastCheckedAt?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MetaReconciliationRecord {
  readonly id: string;
  readonly operationId: string;
  readonly workflowId: string;
  readonly stepId: string;
  readonly providerJobId: string;
  readonly capability: string;
  readonly operationType: string;
  readonly resolverKey: string;
  readonly status: MetaReconciliationStatus;
  readonly attempts: number;
  readonly nextCheckAt: string;
  readonly expiresAt: string;
  readonly evidence?: Readonly<Record<string, unknown>>;
  readonly resolution?: Readonly<Record<string, unknown>>;
  readonly lastError?: Readonly<Record<string, unknown>>;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MetaReplayRecord {
  readonly id: string;
  readonly sourceOperationId: string;
  readonly replayOperationId?: string;
  readonly requestedBy: string;
  readonly approvedBy?: string;
  readonly approvalRole?: string;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly expiresAt: string;
  readonly approvedAt?: string;
  readonly status: MetaReplayStatus;
  readonly rejectionCode?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MetaWorkflowProjection {
  readonly operationId: string;
  readonly workflowId: string;
  readonly workflowStatus: MetaWorkflowStatus;
  readonly currentStepKey?: string;
  readonly version: number;
  readonly completedSteps: number;
  readonly totalSteps: number;
  readonly unknownSteps: number;
  readonly failedSteps: number;
  readonly pendingReconciliations: number;
  readonly providerJobs: Readonly<Record<MetaProviderJobStatus, number>>;
  readonly replayable: boolean;
  readonly updatedAt: string;
}

export interface MetaProviderCommand {
  readonly purpose: MetaProviderJobPurpose;
  readonly capability: string;
  readonly operationType: string;
  readonly requestFingerprint: string;
  readonly providerJobType?: string;
  readonly requestState?: Readonly<Record<string, unknown>>;
  readonly beforeState?: Readonly<Record<string, unknown>>;
  readonly reconciliation: {
    readonly resolverKey: string;
    readonly expiresAt: Date;
    readonly nextCheckAt?: Date;
  };
}

export interface MetaWorkflowStepSucceeded {
  readonly outcome: 'SUCCEEDED';
  readonly output?: Readonly<Record<string, unknown>>;
  readonly beforeState?: Readonly<Record<string, unknown>>;
  readonly afterState?: Readonly<Record<string, unknown>>;
  readonly providerJobId?: string;
  readonly providerObjectId?: string;
  readonly responseState?: Readonly<Record<string, unknown>>;
}

export interface MetaWorkflowStepUnknown {
  readonly outcome: 'UNKNOWN';
  readonly error: Readonly<Record<string, unknown>>;
  readonly providerJobId?: string;
  readonly providerObjectId?: string;
  readonly responseState?: Readonly<Record<string, unknown>>;
  readonly afterState?: Readonly<Record<string, unknown>>;
}

export interface MetaWorkflowStepFailed {
  readonly outcome: 'FAILED';
  readonly error: Readonly<Record<string, unknown>>;
  readonly retryable?: boolean;
  readonly responseState?: Readonly<Record<string, unknown>>;
}

export type MetaWorkflowStepOutcome = MetaWorkflowStepSucceeded | MetaWorkflowStepUnknown | MetaWorkflowStepFailed;
export type MetaWorkflowCompensationOutcome = MetaWorkflowStepOutcome;

export interface MetaWorkflowStepExecutionContext<TContext extends Record<string, unknown> = Record<string, unknown>> {
  readonly workflow: MetaWorkflowRecord;
  readonly step: MetaWorkflowStepRecord;
  readonly context: Readonly<TContext>;
  readonly priorSteps: readonly MetaWorkflowStepRecord[];
  readonly providerJob?: MetaProviderJobRecord;
  readonly signal: AbortSignal;
}

export interface MetaWorkflowStepPreparationContext<TContext extends Record<string, unknown> = Record<string, unknown>> {
  readonly workflow: MetaWorkflowRecord;
  readonly step: MetaWorkflowStepRecord;
  readonly context: Readonly<TContext>;
  readonly priorSteps: readonly MetaWorkflowStepRecord[];
}

export interface MetaWorkflowStepDefinition<TContext extends Record<string, unknown> = Record<string, unknown>> {
  readonly key: string;
  prepareExecution?(input: MetaWorkflowStepPreparationContext<TContext>): Promise<MetaProviderCommand> | MetaProviderCommand;
  execute(input: MetaWorkflowStepExecutionContext<TContext>): Promise<MetaWorkflowStepOutcome>;
  prepareCompensation?(input: MetaWorkflowStepPreparationContext<TContext>): Promise<MetaProviderCommand> | MetaProviderCommand;
  compensate?(input: MetaWorkflowStepExecutionContext<TContext>): Promise<MetaWorkflowCompensationOutcome>;
}

export interface MetaWorkflowDefinition<TContext extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly version: number;
  readonly steps: readonly MetaWorkflowStepDefinition<TContext>[];
}

export interface CreateMetaWorkflowInput {
  readonly operationId: string;
  readonly definitionId: string;
  readonly definitionVersion: number;
  readonly priority: MetaOperationPriority;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly stepKeys: readonly string[];
}

export interface CreateMetaProviderJobInput {
  readonly workflowId: string;
  readonly stepId: string;
  readonly purpose: MetaProviderJobPurpose;
  readonly capability: string;
  readonly operationType: string;
  readonly requestFingerprint: string;
  readonly status: MetaProviderJobStatus;
  readonly providerJobType?: string;
  readonly providerJobId?: string;
  readonly providerObjectId?: string;
  readonly requestState?: Readonly<Record<string, unknown>>;
  readonly responseState?: Readonly<Record<string, unknown>>;
  readonly beforeState?: Readonly<Record<string, unknown>>;
  readonly afterState?: Readonly<Record<string, unknown>>;
  readonly unknownSince?: Date;
}

export interface CreateMetaReconciliationInput {
  readonly operationId: string;
  readonly workflowId: string;
  readonly stepId: string;
  readonly providerJobId: string;
  readonly capability: string;
  readonly operationType: string;
  readonly resolverKey: string;
  readonly nextCheckAt?: Date;
  readonly expiresAt: Date;
}
