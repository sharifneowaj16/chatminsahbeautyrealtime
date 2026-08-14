import type {
  MetaProviderJobStatus,
  MetaReconciliationStatus,
  MetaWorkflowStatus,
  MetaWorkflowStepStatus,
} from './types';

function assertTransition<T extends string>(input: {
  readonly entity: string;
  readonly current: T;
  readonly next: T;
  readonly allowed: Readonly<Record<T, readonly T[]>>;
}): void {
  if (input.current === input.next) return;
  if (!input.allowed[input.current]?.includes(input.next)) {
    throw new TypeError(`META_${input.entity}_STATUS_TRANSITION_INVALID:${input.current}->${input.next}`);
  }
}

const WORKFLOW: Readonly<Record<MetaWorkflowStatus, readonly MetaWorkflowStatus[]>> = {
  PENDING: ['RUNNING', 'CANCELLED'],
  RUNNING: ['WAITING_RECONCILIATION', 'COMPENSATING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
  WAITING_RECONCILIATION: ['RUNNING', 'COMPENSATING', 'FAILED', 'CANCELLED'],
  COMPENSATING: ['WAITING_RECONCILIATION', 'COMPENSATION_FAILED_RETRYABLE', 'COMPENSATED', 'FAILED', 'CANCELLED'],
  COMPENSATION_FAILED_RETRYABLE: ['COMPENSATING', 'WAITING_RECONCILIATION', 'FAILED', 'CANCELLED'],
  SUCCEEDED: [],
  FAILED: [],
  COMPENSATED: [],
  CANCELLED: [],
};

const STEP: Readonly<Record<MetaWorkflowStepStatus, readonly MetaWorkflowStepStatus[]>> = {
  PENDING: ['RUNNING', 'SKIPPED'],
  RUNNING: ['SUCCEEDED', 'FAILED', 'UNKNOWN'],
  SUCCEEDED: ['COMPENSATING'],
  FAILED: [],
  UNKNOWN: ['SUCCEEDED', 'FAILED', 'COMPENSATED', 'COMPENSATION_FAILED_RETRYABLE'],
  COMPENSATING: ['COMPENSATED', 'UNKNOWN', 'COMPENSATION_FAILED_RETRYABLE', 'FAILED'],
  COMPENSATION_FAILED_RETRYABLE: ['COMPENSATING', 'UNKNOWN', 'COMPENSATED', 'FAILED'],
  COMPENSATED: [],
  SKIPPED: [],
};

const PROVIDER_JOB: Readonly<Record<MetaProviderJobStatus, readonly MetaProviderJobStatus[]>> = {
  PENDING: ['SUBMITTED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'CANCELLED'],
  SUBMITTED: ['RUNNING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'CANCELLED'],
  RUNNING: ['SUCCEEDED', 'FAILED', 'UNKNOWN', 'CANCELLED'],
  SUCCEEDED: [],
  FAILED: [],
  UNKNOWN: ['SUCCEEDED', 'FAILED'],
  CANCELLED: [],
};

const RECONCILIATION: Readonly<Record<MetaReconciliationStatus, readonly MetaReconciliationStatus[]>> = {
  PENDING: ['RUNNING', 'RESOLVED_SUCCEEDED', 'RESOLVED_FAILED', 'NEEDS_REVIEW', 'EXPIRED'],
  RUNNING: ['PENDING', 'RESOLVED_SUCCEEDED', 'RESOLVED_FAILED', 'NEEDS_REVIEW', 'EXPIRED'],
  RESOLVED_SUCCEEDED: [],
  RESOLVED_FAILED: [],
  NEEDS_REVIEW: [],
  EXPIRED: [],
};

export function assertMetaWorkflowStatusTransition(current: MetaWorkflowStatus, next: MetaWorkflowStatus): void {
  assertTransition({ entity: 'WORKFLOW', current, next, allowed: WORKFLOW });
}

export function assertMetaWorkflowStepStatusTransition(current: MetaWorkflowStepStatus, next: MetaWorkflowStepStatus): void {
  assertTransition({ entity: 'WORKFLOW_STEP', current, next, allowed: STEP });
}

export function assertMetaProviderJobStatusTransition(current: MetaProviderJobStatus, next: MetaProviderJobStatus): void {
  assertTransition({ entity: 'PROVIDER_JOB', current, next, allowed: PROVIDER_JOB });
}

export function assertMetaReconciliationStatusTransition(current: MetaReconciliationStatus, next: MetaReconciliationStatus): void {
  assertTransition({ entity: 'RECONCILIATION', current, next, allowed: RECONCILIATION });
}
