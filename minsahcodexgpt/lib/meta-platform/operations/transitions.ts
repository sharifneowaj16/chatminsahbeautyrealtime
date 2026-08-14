import type { MetaOperationStatus } from './types';

const ALLOWED_TRANSITIONS: Readonly<Record<MetaOperationStatus, readonly MetaOperationStatus[]>> = Object.freeze({
  ACCEPTED: ['DISPATCHING', 'PERMANENT_FAILURE', 'QUARANTINED', 'CANCELLED'],
  DISPATCHING: ['QUEUED', 'ACCEPTED', 'QUARANTINED', 'PERMANENT_FAILURE', 'CANCELLED'],
  QUEUED: ['RUNNING', 'PERMANENT_FAILURE', 'QUARANTINED', 'CANCELLED'],
  RUNNING: ['SUCCEEDED', 'RETRYABLE_FAILURE', 'PERMANENT_FAILURE', 'QUARANTINED'],
  RETRYABLE_FAILURE: ['DISPATCHING', 'RUNNING', 'PERMANENT_FAILURE', 'QUARANTINED', 'CANCELLED'],
  SUCCEEDED: [],
  PERMANENT_FAILURE: [],
  QUARANTINED: [],
  CANCELLED: [],
});

export function canTransitionMetaOperation(from: MetaOperationStatus, to: MetaOperationStatus): boolean {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertMetaOperationTransition(from: MetaOperationStatus, to: MetaOperationStatus): void {
  if (!canTransitionMetaOperation(from, to)) {
    throw new Error(`META_OPERATION_TRANSITION_INVALID:${from}->${to}`);
  }
}

export function isMetaOperationTerminal(status: MetaOperationStatus): boolean {
  return ['SUCCEEDED', 'PERMANENT_FAILURE', 'QUARANTINED', 'CANCELLED'].includes(status);
}
