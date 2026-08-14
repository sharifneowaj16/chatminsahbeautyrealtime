export const META_ACTOR_TYPES = ['SYSTEM', 'ADMIN', 'CUSTOMER', 'WEBHOOK', 'WORKER'] as const;
export type MetaActorType = (typeof META_ACTOR_TYPES)[number];

export interface MetaInvocationActor {
  readonly type: MetaActorType;
  readonly reference?: string;
}

export interface MetaInvocationContext {
  readonly correlationId: string;
  readonly actor: MetaInvocationActor;
  readonly requestedAt: string;
  readonly deadlineAt?: string;
}

export interface CreateMetaInvocationContextInput {
  readonly correlationId: string;
  readonly actor: MetaInvocationActor;
  readonly requestedAt?: Date | string;
  readonly deadlineAt?: Date | string;
}

function normalizeDate(value: Date | string | undefined, fallback?: Date): string | undefined {
  if (value === undefined) return fallback?.toISOString();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('META_CONTEXT_DATE_INVALID');
  return date.toISOString();
}

export function createMetaInvocationContext(input: CreateMetaInvocationContextInput): MetaInvocationContext {
  const correlationId = input.correlationId.trim();
  if (!correlationId || correlationId.length > 128) throw new TypeError('META_CORRELATION_ID_INVALID');
  if (!META_ACTOR_TYPES.includes(input.actor.type)) throw new TypeError('META_ACTOR_TYPE_INVALID');

  const requestedAt = normalizeDate(input.requestedAt, new Date());
  const deadlineAt = normalizeDate(input.deadlineAt);
  if (!requestedAt) throw new TypeError('META_REQUESTED_AT_REQUIRED');
  if (deadlineAt && new Date(deadlineAt).getTime() <= new Date(requestedAt).getTime()) {
    throw new TypeError('META_DEADLINE_INVALID');
  }

  return Object.freeze({
    correlationId,
    actor: Object.freeze({
      type: input.actor.type,
      ...(input.actor.reference?.trim() ? { reference: input.actor.reference.trim() } : {}),
    }),
    requestedAt,
    ...(deadlineAt ? { deadlineAt } : {}),
  });
}
