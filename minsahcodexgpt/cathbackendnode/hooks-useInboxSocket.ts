import { useCallback, useEffect, useRef, useState } from 'react'

export type InboxWsEvent =
  | {
      type: 'new_message'
      conversationId: string
      messageId: string
      threadId: string
      pageId: string
      text: string
      timestamp: string
      isNew: boolean
    }
  | {
      type: 'outgoing_message'
      conversationId: string
      messageId: string
      threadId: string
      text: string
      timestamp: string
      senderType: 'PAGE'
    }
  | {
      type: 'post_comment'
      commentId: string
      postId: string
      senderId: string
      senderName: string
      pageId: string
      text: string
      timestamp: string
    }
  | { type: 'conversation_read'; threadId: string; conversationId: string }
  | { type: 'connected'; clientId: string; ts: number }
  | { type: 'pong'; ts: number }

type SocketStatus = 'connecting' | 'live' | 'offline'

export function useInboxSocket(onEvent: (event: InboxWsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const onEventRef = useRef(onEvent)
  const [status, setStatus] = useState<SocketStatus>('connecting')

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const connect = useCallback(() => {
    if (!mountedRef.current) {
      return
    }

    const secret = process.env.NEXT_PUBLIC_WS_AUTH_SECRET
    const url = process.env.NEXT_PUBLIC_REALTIME_WS_URL

    if (!secret || !url) {
      console.error(
        '[useInboxSocket] Missing NEXT_PUBLIC_WS_AUTH_SECRET or NEXT_PUBLIC_REALTIME_WS_URL'
      )
      setStatus('offline')
      return
    }

    setStatus('connecting')
    const ws = new WebSocket(`${url}?token=${encodeURIComponent(secret)}`)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('live')
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as InboxWsEvent
        if (payload.type === 'connected') {
          setStatus('live')
        }
        onEventRef.current(payload)
      } catch {
        // Ignore malformed payloads
      }
    }

    ws.onclose = () => {
      setStatus('offline')
      if (mountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [connect])

  const sendMarkRead = useCallback((threadId: string, conversationId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'mark_read',
        threadId,
        conversationId,
      })
    )
  }, [])

  return { sendMarkRead, status }
}
