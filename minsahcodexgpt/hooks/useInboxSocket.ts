import { useCallback, useEffect, useRef, useState } from 'react'

export type InboxWsEvent =
  | {
      type: 'new_message'
      conversationId: string
      messageId: string
      threadId: string
      pageId: string
      senderName?: string
      text: string
      attachmentUrl?: string
      attachmentType?: 'image' | 'video' | 'audio' | 'file'
      timestamp: string
      isNew: boolean
    }
  | {
      type: 'outgoing_message'
      conversationId: string
      messageId: string
      threadId: string
      pageId: string
      text: string
      attachmentUrl?: string
      attachmentType?: 'image' | 'video' | 'audio' | 'file'
      timestamp: string
      senderType: 'PAGE'
    }
  | {
      type: 'outgoing_status'
      jobId: string
      threadId: string
      pageId: string
      state: 'queued' | 'retrying' | 'sent' | 'failed' | 'delivered' | 'read'
      text: string
      attachmentUrl?: string
      attachmentType?: 'image' | 'video' | 'audio' | 'file'
      timestamp: string
      attempt: number
      clientMessageId?: string
      conversationId?: string
      messageId?: string
      fbMessageId?: string
      error?: string
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
  | { type: 'subscribed'; platforms: Array<'facebook'>; ts: number }
  | { type: 'connected'; clientId: string; ts: number }
  | { type: 'pong'; ts: number }

type SocketStatus = 'connecting' | 'live' | 'offline'

export function useInboxSocket(onEvent: (event: InboxWsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const onEventRef = useRef(onEvent)
  const connectAttemptRef = useRef(0)
  const [status, setStatus] = useState<SocketStatus>('connecting')

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const connect = useCallback(() => {
    if (!mountedRef.current) {
      return
    }

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
        const tokenResponse = await fetch('/api/admin/inbox/ws-token', {
          cache: 'no-store',
          credentials: 'include',
        })

        if (!tokenResponse.ok) {
          throw new Error(`WS token request failed with status ${tokenResponse.status}`)
        }

        const tokenData = (await tokenResponse.json()) as { token?: string }
        if (!tokenData.token || !mountedRef.current || attempt !== connectAttemptRef.current) {
          return
        }

        const ws = new WebSocket(`${url}?token=${encodeURIComponent(tokenData.token)}`)
        wsRef.current = ws

        ws.onopen = () => {
          setStatus('live')
          ws.send(
            JSON.stringify({
              type: 'subscribe_inbox',
              platforms: ['facebook'],
            })
          )
        }

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as InboxWsEvent
            if (payload.type === 'connected' || payload.type === 'subscribed') {
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
      } catch {
        setStatus('offline')
        if (mountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000)
        }
      }
    })()
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
      return false
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'mark_read',
        threadId,
        conversationId,
      })
    )
    return true
  }, [])

  return { sendMarkRead, status }
}
