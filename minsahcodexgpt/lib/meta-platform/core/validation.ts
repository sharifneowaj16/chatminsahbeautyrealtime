import { META_ACTOR_TYPES } from './context';
import { META_CAPABILITY_IDS, type MetaPlatformRequest } from '../types';

export interface MetaValidationIssue {
  readonly code: string;
  readonly field: string;
  readonly message: string;
}

const OPERATION_PATTERN = /^[a-z][a-z0-9._-]{1,79}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readMetaCorrelationId(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.context)) return undefined;
  const correlationId = value.context.correlationId;
  return typeof correlationId === 'string' && correlationId.trim() ? correlationId.trim() : undefined;
}

export function validateMetaPlatformRequest(value: unknown): MetaValidationIssue | null {
  if (!isRecord(value)) {
    return { code: 'META_REQUEST_INVALID', field: 'request', message: 'Meta request must be an object.' };
  }
  if (typeof value.capability !== 'string' || !META_CAPABILITY_IDS.includes(value.capability as MetaPlatformRequest['capability'])) {
    return { code: 'META_CAPABILITY_INVALID', field: 'capability', message: 'Meta capability is not registered.' };
  }
  if (typeof value.operation !== 'string' || !OPERATION_PATTERN.test(value.operation)) {
    return { code: 'META_OPERATION_INVALID', field: 'operation', message: 'Meta operation name is invalid.' };
  }
  if (value.mode !== 'READ' && value.mode !== 'WRITE') {
    return { code: 'META_OPERATION_MODE_INVALID', field: 'mode', message: 'Meta operation mode is invalid.' };
  }
  if (!isRecord(value.context) || typeof value.context.correlationId !== 'string' || !value.context.correlationId.trim()) {
    return { code: 'META_CORRELATION_ID_REQUIRED', field: 'context.correlationId', message: 'Correlation ID is required.' };
  }
  if (!isRecord(value.context.actor) || !META_ACTOR_TYPES.includes(value.context.actor.type as MetaPlatformRequest['context']['actor']['type'])) {
    return { code: 'META_ACTOR_TYPE_INVALID', field: 'context.actor.type', message: 'Meta actor type is invalid.' };
  }
  return null;
}
