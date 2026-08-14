import { useCallback, useEffect, useRef, useState } from 'react'

export type InboxWsEvent =
  | {
      type: 'refresh_required'
      platform: 'facebook' | 'instagram'
      conversationId: string | null
      messageId: string | null
      reason: string
      outOfOrder: boolean
    }
  | { type: 'conversation_read'; threadId: string; conversationId: string }
  | { type: 'connection_health_changed'; state: string | null; reasonCode: string | null }
  | { type: 'subscribed'; platforms: Array<'facebook' | 'instagram'>; gapDetected?: boolean; ts: number }
  | { type: 'connected'; clientId: string; ts: number }
  | { type: 'pong'; ts: number }
  // Explicit rollback compatibility only. The normalized bridge never emits these content-bearing events.
  | { type: 'new_message'; conversationId: string; messageId: string; threadId: string; pageId: string; senderName?: string; text: string; attachmentUrl?: string; attachmentType?: 'image' | 'video' | 'audio' | 'file'; timestamp: string; isNew: boolean }
  | { type: 'outgoing_message'; conversationId: string; messageId: string; threadId: string; pageId: string; text: string; attachmentUrl?: string; attachmentType?: 'image' | 'video' | 'audio' | 'file'; timestamp: string; senderType: 'PAGE' }
  | { type: 'outgoing_status'; jobId: string; threadId: string; pageId: string; state: 'queued' | 'retrying' | 'sent' | 'failed' | 'delivered' | 'read'; text: string; attachmentUrl?: string; attachmentType?: 'image' | 'video' | 'audio' | 'file'; timestamp: string; attempt: number; clientMessageId?: string; conversationId?: string; messageId?: string; fbMessageId?: string; error?: string }
  | { type: 'post_comment'; commentId: string; postId: string; senderId: string; senderName: string; pageId: string; text: string; timestamp: string }

type SocketStatus = 'connecting' | 'live' | 'offline'
const CURSOR_KEY = 'minsah:admin-inbox:realtime-cursor:v1'

function reconnectDelay(attempt: number): number {
  const capped = Math.min(attempt, 7)
  const base = Math.min(30_000, 750 * 2 ** capped)
  return Math.round(base * (0.75 + Math.random() * 0.5))
}

function normalizeServerEvent(value: unknown): InboxWsEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (row.type === 'connected' && typeof row.clientId === 'string' && typeof row.ts === 'number') {
    return { type: 'connected', clientId: row.clientId, ts: row.ts }
  }
  if (row.type === 'subscribed' && Array.isArray(row.platforms) && typeof row.ts === 'number') {
    return {
      type: 'subscribed',
      platforms: row.platforms.filter((item): item is 'facebook' | 'instagram' => item === 'facebook' || item === 'instagram'),
      gapDetected: row.gapDetected === true,
      ts: row.ts,
    }
  }
  if (row.type !== 'social_event' || typeof row.cursor !== 'string' || !row.event || typeof row.event !== 'object') return null
  const event = row.event as Record<string, unknown>
  if (typeof event.type !== 'string' || !['facebook', 'instagram', 'meta'].includes(String(event.platform))) return null
  if (event.type === 'META_CONNECTION_HEALTH_CHANGED' && event.platform === 'meta') {
    window.sessionStorage.setItem(CURSOR_KEY, row.cursor)
    return {
      type: 'connection_health_changed',
      state: typeof event.state === 'string' ? event.state : null,
      reasonCode: typeof event.reasonCode === 'string' ? event.reasonCode : null,
    }
  }
  if (event.platform !== 'facebook' && event.platform !== 'instagram') return null
  const conversationId = typeof event.conversationId === 'string' ? event.conversationId : null
  const messageId = typeof event.messageId === 'string' ? event.messageId : null
  window.sessionStorage.setItem(CURSOR_KEY, row.cursor)
  if (event.type === 'SOCIAL_CONVERSATION_READ' && conversationId) {
    return { type: 'conversation_read', threadId: conversationId, conversationId }
  }
  return {
    type: 'refresh_required',
    platform: event.platform,
    conversationId,
    messageId,
    reason: event.type,
    outOfOrder: event.outOfOrder === true,
  }
}

export function useInboxSocket(onEvent: (event: InboxWsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const onEventRef = useRef(onEvent)
  const connectAttemptRef = useRef(0)
  const reconnectCountRef = useRef(0)
  const [status, setStatus] = useState<SocketStatus>('connecting')

  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    const url = process.env.NEXT_PUBLIC_REALTIME_WS_URL
    if (!url) {
      console.error('[useInboxSocket] Missing NEXT_PUBLIC_REALTIME_WS_URL')
      setStatus('offline')
      return
    }
    setStatus('connecting')
    const attempt = ++connectAttemptRef.current

    void (async () => {
      try {
        const tokenResponse = await fetch('/api/admin/inbox/ws-token', { cache: 'no-store', credentials: 'include' })
        if (!tokenResponse.ok) throw new Error(`WS token request failed with status ${tokenResponse.status}`)
        const tokenData = (await tokenResponse.json()) as { token?: string }
        if (!tokenData.token || !mountedRef.current || attempt !== connectAttemptRef.current) return

        const ws = new WebSocket(url, ['minsah-inbox-v1', `auth.${tokenData.token}`])
        wsRef.current = ws
        ws.onopen = () => {
          reconnectCountRef.current = 0
          setStatus('live')
          ws.send(JSON.stringify({
            type: 'subscribe_inbox',
            platforms: ['facebook', 'instagram'],
            cursor: window.sessionStorage.getItem(CURSOR_KEY),
          }))
        }
        ws.onmessage = (message) => {
          try {
            const normalized = normalizeServerEvent(JSON.parse(String(message.data)))
            if (!normalized) return
            if (normalized.type === 'connected' || normalized.type === 'subscribed') setStatus('live')
            onEventRef.current(normalized)
            if (normalized.type === 'subscribed' && normalized.gapDetected) {
              onEventRef.current({ type: 'refresh_required', platform: 'facebook', conversationId: null, messageId: null, reason: 'REALTIME_GAP_DETECTED', outOfOrder: false })
            }
          } catch {
            // Invalid server data is ignored; the authenticated API remains authoritative.
          }
        }
        ws.onclose = () => {
          setStatus('offline')
          if (!mountedRef.current) return
          reconnectCountRef.current += 1
          reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay(reconnectCountRef.current))
        }
        ws.onerror = () => ws.close()
      } catch {
        setStatus('offline')
        if (!mountedRef.current) return
        reconnectCountRef.current += 1
        reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay(reconnectCountRef.current))
      }
    })()
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendMarkRead = useCallback((threadId: string, conversationId: string) => {
    if (!conversationId) return false
    void fetch('/api/social/messages', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId, platform: 'facebook', threadId }),
    }).catch(() => undefined)
    return true
  }, [])

  return { sendMarkRead, status }
}
