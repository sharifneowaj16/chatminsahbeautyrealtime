import Redis from 'ioredis'
import { getConfig } from '../config'
import type { WsInboxEvent } from '../facebook/types'

export const INBOX_EVENTS_CHANNEL = 'fb:inbox:events'

const publisher = new Redis(getConfig().REDIS_URL)
const subscriber = new Redis(getConfig().REDIS_URL)
publisher.on('error', (err) => console.error('[redis] publisher error', err))
subscriber.on('error', (err) => console.error('[redis] subscriber error', err))

export async function publishInboxEvent(event: WsInboxEvent): Promise<void> {
  await publisher.publish(INBOX_EVENTS_CHANNEL, JSON.stringify(event))
}

export function getRedisSubscriber(): Redis {
  return subscriber
}

export async function disconnectRedis(): Promise<void> {
  await Promise.allSettled([publisher.quit(), subscriber.quit()])
}
