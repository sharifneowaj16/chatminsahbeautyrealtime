import type { SocialRealtimeEvent } from '../../../packages/meta-realtime-contract/src'

export type SocialRealtimeDelivery = Readonly<{
  event: SocialRealtimeEvent
  cursor: string
}>

export type SocialRealtimeAcceptResult =
  | Readonly<{ accepted: true; delivery: SocialRealtimeDelivery }>
  | Readonly<{ accepted: false; reason: 'DUPLICATE_EVENT' }>

export type SocialRealtimeRecovery = Readonly<{
  deliveries: readonly SocialRealtimeDelivery[]
  gapDetected: boolean
}>

export function createRealtimeCursor(event: SocialRealtimeEvent): string {
  return `${new Date(event.emittedAt).getTime()}:${event.eventId}`
}

export function parseRealtimeCursor(cursor: string | null | undefined): Readonly<{ emittedMs: number; eventId: string }> | null {
  if (!cursor) return null
  const separator = cursor.indexOf(':')
  if (separator < 1) return null
  const emittedMs = Number(cursor.slice(0, separator))
  const eventId = cursor.slice(separator + 1)
  if (!Number.isSafeInteger(emittedMs) || emittedMs < 0 || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(eventId)) return null
  return Object.freeze({ emittedMs, eventId })
}

function compareDeliveries(left: SocialRealtimeDelivery, right: SocialRealtimeDelivery): number {
  const leftCursor = parseRealtimeCursor(left.cursor)!
  const rightCursor = parseRealtimeCursor(right.cursor)!
  return leftCursor.emittedMs - rightCursor.emittedMs || leftCursor.eventId.localeCompare(rightCursor.eventId)
}

function isAfter(delivery: SocialRealtimeDelivery, cursor: Readonly<{ emittedMs: number; eventId: string }>): boolean {
  const candidate = parseRealtimeCursor(delivery.cursor)!
  return candidate.emittedMs > cursor.emittedMs
    || (candidate.emittedMs === cursor.emittedMs && candidate.eventId.localeCompare(cursor.eventId) > 0)
}

export class InMemorySocialRealtimeEventWindow {
  private readonly maxEntries: number
  private readonly eventIds = new Set<string>()
  private readonly latestOccurredAt = new Map<string, number>()
  private readonly deliveries: SocialRealtimeDelivery[] = []

  constructor(maxEntries = 500) { this.maxEntries = maxEntries }

  accept(event: SocialRealtimeEvent): SocialRealtimeAcceptResult {
    if (this.eventIds.has(event.eventId)) return Object.freeze({ accepted: false, reason: 'DUPLICATE_EVENT' })
    this.eventIds.add(event.eventId)
    const occurredMs = new Date(event.occurredAt).getTime()
    const latest = this.latestOccurredAt.get(event.orderingKey)
    const outOfOrder = latest !== undefined && occurredMs < latest
    if (latest === undefined || occurredMs >= latest) this.latestOccurredAt.set(event.orderingKey, occurredMs)
    const normalized = Object.freeze({ ...event, outOfOrder })
    const delivery = Object.freeze({ event: normalized, cursor: createRealtimeCursor(normalized) })
    this.deliveries.push(delivery)
    this.deliveries.sort(compareDeliveries)
    while (this.deliveries.length > this.maxEntries) {
      const removed = this.deliveries.shift()
      if (removed) this.eventIds.delete(removed.event.eventId)
    }
    return Object.freeze({ accepted: true, delivery })
  }

  recover(cursor: string | null, limit = 250): SocialRealtimeRecovery {
    const parsed = parseRealtimeCursor(cursor)
    const bounded = Math.max(1, Math.min(limit, 500))
    const gapDetected = Boolean(parsed && this.deliveries.length > 0 && isAfter(this.deliveries[0]!, parsed))
    const deliveries = (parsed ? this.deliveries.filter((delivery) => isAfter(delivery, parsed)) : this.deliveries)
      .slice(0, bounded)
    return Object.freeze({ deliveries: Object.freeze(deliveries), gapDetected })
  }
}
