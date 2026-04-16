import type { Prisma } from '../../prisma/generated/prisma/client'
import type { QueueOutgoingRetryInput } from './outgoing-retry'
import type { ReplayJobInput } from './replay-queue'
import type { ScheduleFacebookMediaRetryInput } from './media-retry'

export type DeadLetterPayload =
  | {
      kind: 'replay_queue'
      job: ReplayJobInput
    }
  | {
      kind: 'media_retry'
      job: ScheduleFacebookMediaRetryInput
    }
  | {
      kind: 'outgoing_retry'
      job: QueueOutgoingRetryInput
    }

export function buildReplayDeadLetterKey(job: ReplayJobInput): string {
  return job.type === 'incoming_message'
    ? `replay:incoming:${job.fbMessageId}`
    : `replay:outgoing:${job.fbMessageId}`
}

export function buildMediaDeadLetterKey(job: ScheduleFacebookMediaRetryInput): string {
  return `media:${job.fbMessageId}`
}

export function buildOutgoingDeadLetterKey(outboxMessageId: string): string {
  return `outgoing:${outboxMessageId}`
}

export function toDeadLetterPayloadValue(payload: DeadLetterPayload): Prisma.InputJsonValue {
  return payload as unknown as Prisma.InputJsonValue
}

function isObject(value: Prisma.JsonValue | null): value is Record<string, Prisma.JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseDeadLetterPayload(payload: Prisma.JsonValue): DeadLetterPayload {
  if (!isObject(payload)) {
    throw new Error('Dead-letter payload must be an object')
  }

  const kind = payload.kind
  if (kind === 'replay_queue' || kind === 'media_retry' || kind === 'outgoing_retry') {
    return payload as unknown as DeadLetterPayload
  }

  throw new Error('Unsupported dead-letter payload kind')
}
