import Redis from 'ioredis'
import {
  SOCIAL_REALTIME_CHANNEL,
  createSocialRealtimeEvent,
  parseSocialRealtimeEvent,
  type SocialRealtimeEvent,
} from '../../../packages/meta-realtime-contract/src'
import type { WsInboxEvent } from '../facebook/types'
import { getConfig } from '../config'

let subscriber: Redis | null = null
let publisher: Redis | null = null

function createRedisClient(role: 'subscriber' | 'publisher'): Redis {
  const client = new Redis(getConfig().REDIS_URL)
  client.on('error', (error) => console.error(`[redis] realtime ${role} error`, error))
  return client
}

function getSubscriber(): Redis {
  subscriber ??= createRedisClient('subscriber')
  return subscriber
}

function getPublisher(): Redis {
  publisher ??= createRedisClient('publisher')
  return publisher
}

export type SocialRealtimeListener = (event: SocialRealtimeEvent) => void | Promise<void>

export async function subscribeToSocialRealtimeEvents(listener: SocialRealtimeListener): Promise<() => Promise<void>> {
  const client = getSubscriber()
  const handler = (_channel: string, raw: string) => {
    try {
      const event = parseSocialRealtimeEvent(JSON.parse(raw))
      if (!event) {
        console.warn('[realtime/pubsub] rejected invalid or unsafe social event')
        return
      }
      void Promise.resolve(listener(event)).catch((error) => {
        console.error('[realtime/pubsub] event listener failed', error)
      })
    } catch {
      console.warn('[realtime/pubsub] rejected malformed social event')
    }
  }
  client.on('message', handler)
  await client.subscribe(SOCIAL_REALTIME_CHANNEL)
  return async () => {
    client.off('message', handler)
    await client.unsubscribe(SOCIAL_REALTIME_CHANNEL)
  }
}

function legacyEventIdentity(event: WsInboxEvent): string {
  if (event.type === 'new_message' || event.type === 'outgoing_message') return event.messageId
  if (event.type === 'outgoing_status') return event.fbMessageId ?? event.messageId ?? event.jobId
  if (event.type === 'post_comment') return event.commentId
  return event.conversationId
}

/**
 * Explicit rollback adapter for the pre-Layer-6 Facebook producers.
 *
 * The old producer objects may contain message text, names and media URLs. None
 * of those fields are copied into the normalized event. This keeps rollback
 * mode operational while preserving the Layer-6 WebSocket privacy contract.
 */
export async function publishInboxEvent(event: WsInboxEvent): Promise<number> {
  const identity = legacyEventIdentity(event)
  const occurredAt = 'timestamp' in event ? event.timestamp : new Date().toISOString()
  const conversationId = 'conversationId' in event ? event.conversationId : null
  const normalized = event.type === 'post_comment'
    ? createSocialRealtimeEvent({
        type: 'FACEBOOK_COMMENT_UPSERTED',
        correlationId: `legacy-facebook:${event.type}:${identity}`,
        platform: 'facebook',
        occurredAt,
        orderingKey: conversationId ?? event.postId,
        conversationId: conversationId ?? event.postId,
        messageId: event.commentId,
        providerEventKey: event.commentId,
        state: 'UPSERTED',
      })
    : event.type === 'conversation_read'
      ? createSocialRealtimeEvent({
          type: 'SOCIAL_CONVERSATION_READ',
          correlationId: `legacy-facebook:${event.type}:${identity}`,
          platform: 'facebook',
          occurredAt,
          orderingKey: conversationId ?? identity,
          conversationId,
          state: 'READ',
        })
      : event.type === 'outgoing_status'
        ? createSocialRealtimeEvent({
            type: 'FACEBOOK_REPLY_STATE_CHANGED',
            correlationId: `legacy-facebook:${event.type}:${identity}`,
            platform: 'facebook',
            occurredAt,
            orderingKey: conversationId ?? event.threadId,
            conversationId: conversationId ?? event.threadId,
            messageId: event.messageId ?? null,
            providerEventKey: event.fbMessageId ?? event.jobId,
            state: event.state.toUpperCase(),
            reasonCode: event.error ? 'LEGACY_PROVIDER_FAILURE' : null,
          })
        : createSocialRealtimeEvent({
            type: 'FACEBOOK_MESSAGE_UPSERTED',
            correlationId: `legacy-facebook:${event.type}:${identity}`,
            platform: 'facebook',
            occurredAt,
            orderingKey: conversationId ?? identity,
            conversationId,
            messageId: event.messageId,
            providerEventKey: event.messageId,
            state: event.type === 'new_message'
              ? (event.isNew ? 'CREATED' : 'UPDATED')
              : 'OUTBOUND',
          })
  return getPublisher().publish(SOCIAL_REALTIME_CHANNEL, JSON.stringify(normalized))
}

export async function disconnectRedis(): Promise<void> {
  const clients = [subscriber, publisher].filter((client): client is Redis => client !== null)
  subscriber = null
  publisher = null
  await Promise.allSettled(clients.map((client) => client.quit()))
}
