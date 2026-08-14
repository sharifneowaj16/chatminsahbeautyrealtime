import type { MetaPlatformError } from '../core/errors';
import type { MetaRetryDecision } from './types';

export class MetaReliabilityDecisionError extends Error {
  readonly code: string;
  readonly decision: MetaRetryDecision;
  readonly platformError: MetaPlatformError;

  constructor(decision: MetaRetryDecision) {
    super(decision.error.message);
    this.name = 'MetaReliabilityDecisionError';
    this.code = decision.error.code;
    this.decision = decision;
    this.platformError = decision.error;
  }
}

export function isMetaReliabilityDecisionError(error: unknown): error is MetaReliabilityDecisionError {
  return error instanceof MetaReliabilityDecisionError;
}
