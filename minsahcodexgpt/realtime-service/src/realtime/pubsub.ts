import Redis from 'ioredis'
import { getConfig } from '../config'
import type { WsInboxEvent } from '../facebook/types'

export const INBOX_EVENTS_CHANNEL = 'fb:inbox:events'

const publisher = new Redis(getConfig().REDIS_URL)
const subscriber = new Redis(getConfig().REDIS_URL)
publisher.on('error', (err) => console.error('[redis] publisher error', err))
subscriber.on('error', (err) => console.error('[redis] subscriber error', err))
const localListeners = new Set<(event: WsInboxEvent) => void>()

export async function publishInboxEvent(event: WsInboxEvent): Promise<void> {
  for (const listener of localListeners) {
    try {
      listener(event)
    } catch (error) {
      console.error('[pubsub] local listener failed', error)
    }
  }

  void publisher.publish(INBOX_EVENTS_CHANNEL, JSON.stringify(event)).catch((error) => {
    console.error('[pubsub] redis publish failed', error)
  })
}

export function getRedisSubscriber(): Redis {
  return subscriber
}

export function registerLocalInboxListener(listener: (event: WsInboxEvent) => void): () => void {
  localListeners.add(listener)
  return () => {
    localListeners.delete(listener)
  }
}

export async function disconnectRedis(): Promise<void> {
  await Promise.allSettled([publisher.quit(), subscriber.quit()])
}
