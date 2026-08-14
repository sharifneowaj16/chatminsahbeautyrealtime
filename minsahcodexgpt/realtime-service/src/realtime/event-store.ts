import Redis from 'ioredis'
import { parseSocialRealtimeEvent, type SocialRealtimeEvent } from '../../../packages/meta-realtime-contract/src'
import { getConfig } from '../config'
import {
  createRealtimeCursor,
  parseRealtimeCursor,
  type SocialRealtimeAcceptResult,
  type SocialRealtimeDelivery,
  type SocialRealtimeRecovery,
} from './event-window'

const HISTORY_KEY = 'social:realtime:history:v1'
const DEDUPE_PREFIX = 'social:realtime:dedupe:v1:'
const ORDER_PREFIX = 'social:realtime:order:v1:'

const ORDER_SCRIPT = `
local previous = redis.call('GET', KEYS[1])
local current = tonumber(ARGV[1])
local outOfOrder = 0
if previous and current < tonumber(previous) then
  outOfOrder = 1
else
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
end
return outOfOrder
`

function memberFor(event: SocialRealtimeEvent): string {
  return `${event.eventId}\0${JSON.stringify(event)}`
}

function eventFromMember(value: string): SocialRealtimeEvent | null {
  const separator = value.indexOf('\0')
  if (separator < 1) return null
  try {
    return parseSocialRealtimeEvent(JSON.parse(value.slice(separator + 1)))
  } catch {
    return null
  }
}

function afterCursor(delivery: SocialRealtimeDelivery, cursor: Readonly<{ emittedMs: number; eventId: string }>): boolean {
  const emittedMs = new Date(delivery.event.emittedAt).getTime()
  return emittedMs > cursor.emittedMs
    || (emittedMs === cursor.emittedMs && delivery.event.eventId.localeCompare(cursor.eventId) > 0)
}

export class SocialRealtimeEventStore {
  private readonly redis: Redis

  constructor(redis?: Redis) {
    this.redis = redis ?? new Redis(getConfig().REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    })
    this.redis.on('error', (error) => console.error('[realtime/store] redis error', error))
  }

  async accept(event: SocialRealtimeEvent): Promise<SocialRealtimeAcceptResult> {
    const config = getConfig()
    const dedupe = await this.redis.set(
      `${DEDUPE_PREFIX}${event.eventId}`,
      event.emittedAt,
      'EX',
      config.REALTIME_EVENT_DEDUPE_TTL_SECONDS,
      'NX'
    )
    if (dedupe !== 'OK') return Object.freeze({ accepted: false, reason: 'DUPLICATE_EVENT' })

    const occurredMs = new Date(event.occurredAt).getTime()
    const outOfOrder = Number(await this.redis.eval(
      ORDER_SCRIPT,
      1,
      `${ORDER_PREFIX}${event.orderingKey}`,
      occurredMs,
      config.REALTIME_EVENT_DEDUPE_TTL_SECONDS
    )) === 1
    const normalized = Object.freeze({ ...event, outOfOrder })
    const emittedMs = new Date(normalized.emittedAt).getTime()
    const minimum = Date.now() - config.REALTIME_EVENT_HISTORY_TTL_SECONDS * 1000
    await this.redis.multi()
      .zadd(HISTORY_KEY, emittedMs, memberFor(normalized))
      .zremrangebyscore(HISTORY_KEY, 0, minimum)
      .exec()
    return Object.freeze({
      accepted: true,
      delivery: Object.freeze({ event: normalized, cursor: createRealtimeCursor(normalized) }),
    })
  }

  async recover(cursor: string | null, limit = 250): Promise<SocialRealtimeRecovery> {
    const parsed = parseRealtimeCursor(cursor)
    const minimumScore = parsed?.emittedMs ?? 0
    const rows = await this.redis.zrangebyscore(
      HISTORY_KEY,
      minimumScore,
      '+inf',
      'LIMIT',
      0,
      Math.max(1, Math.min(limit + 20, 520))
    )
    const deliveries = rows.flatMap((row) => {
      const event = eventFromMember(row)
      if (!event) return []
      return [Object.freeze({ event, cursor: createRealtimeCursor(event) })]
    }).filter((delivery) => !parsed || afterCursor(delivery, parsed)).slice(0, Math.max(1, Math.min(limit, 500)))

    let gapDetected = false
    if (parsed) {
      const oldest = await this.redis.zrange(HISTORY_KEY, 0, 0, 'WITHSCORES')
      const oldestScore = oldest.length === 2 ? Number(oldest[1]) : null
      gapDetected = Number.isFinite(oldestScore) && parsed.emittedMs < Number(oldestScore)
    }
    return Object.freeze({ deliveries: Object.freeze(deliveries), gapDetected })
  }

  async close(): Promise<void> {
    await this.redis.quit()
  }
}
