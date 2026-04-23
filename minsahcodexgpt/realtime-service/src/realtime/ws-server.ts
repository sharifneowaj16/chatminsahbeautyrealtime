import type http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { markConversationRead } from '../db/repository'
import type { WsInboxEvent } from '../facebook/types'
import {
  getRedisSubscriber,
  INBOX_EVENTS_CHANNEL,
  publishInboxEvent,
  registerLocalInboxListener,
} from './pubsub'
import { verifyWsAccessToken } from './ws-auth'

interface MarkReadPayload {
  type: 'mark_read'
  threadId?: string
  conversationId?: string
}

interface SubscribeInboxPayload {
  type: 'subscribe_inbox'
  platforms?: Array<'facebook'>
}

type InboxClientPayload = MarkReadPayload | SubscribeInboxPayload

interface ClientState {
  subscriptions: Set<'facebook'>
}

export class InboxWsServer {
  private readonly wss: WebSocketServer
  private readonly clients = new Set<WebSocket>()
  private readonly clientState = new WeakMap<WebSocket, ClientState>()
  private readonly unregisterLocalListener: () => void
  private subscribed = false

  constructor(server: http.Server) {
    this.unregisterLocalListener = registerLocalInboxListener((event) => {
      this.broadcast(event)
    })

    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: ({ req }: { req: import('http').IncomingMessage }) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const token = url.searchParams.get('token')
        return token ? Boolean(verifyWsAccessToken(token)) : false
      },
    })

    this.wss.on('connection', (socket) => {
      this.clients.add(socket)
      this.clientState.set(socket, {
        subscriptions: new Set(),
      })

      socket.send(
        JSON.stringify({
          type: 'connected',
          clientId: generateClientId(),
          ts: Date.now(),
        })
      )

      socket.on('message', async (raw) => {
        try {
          const payload = JSON.parse(raw.toString()) as InboxClientPayload

          if (payload.type === 'subscribe_inbox') {
            const state = this.clientState.get(socket)
            if (!state) {
              return
            }

            state.subscriptions = new Set(
              (payload.platforms ?? ['facebook']).filter(
                (platform): platform is 'facebook' => platform === 'facebook'
              )
            )

            socket.send(
              JSON.stringify({
                type: 'subscribed',
                platforms: Array.from(state.subscriptions),
                ts: Date.now(),
              })
            )
            return
          }

          if (payload.type !== 'mark_read') {
            return
          }

          const conversation = await markConversationRead({
            conversationId: payload.conversationId,
            threadId: payload.threadId,
          })

          if (!conversation) {
            return
          }

          await publishInboxEvent({
            type: 'conversation_read',
            conversationId: conversation.conversationId,
            threadId: conversation.threadId,
          })
        } catch (error) {
          console.error('[ws] message handling failed', error)
        }
      })

      socket.on('close', () => {
        this.clients.delete(socket)
        this.clientState.delete(socket)
      })

      socket.on('error', () => {
        this.clients.delete(socket)
        this.clientState.delete(socket)
      })
    })

    const heartbeat = setInterval(() => {
      const payload = JSON.stringify({ type: 'pong', ts: Date.now() })
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload)
        }
      }
    }, 25_000)

    this.wss.on('close', () => {
      clearInterval(heartbeat)
    })
  }

  async subscribeToRedis(): Promise<void> {
    if (this.subscribed) {
      return
    }

    const subscriber = getRedisSubscriber()
    subscriber.on('message', (_channel, raw) => {
      try {
        const event = JSON.parse(raw) as WsInboxEvent
        this.broadcast(event)
      } catch (error) {
        console.error('[ws] failed to parse redis message', error)
      }
    })

    await subscriber.subscribe(INBOX_EVENTS_CHANNEL)
    this.subscribed = true
  }

  broadcast(event: WsInboxEvent): void {
    const payload = JSON.stringify(event)
    for (const client of this.clients) {
      if (client.readyState !== WebSocket.OPEN) {
        continue
      }

      const state = this.clientState.get(client)
      if (!state || !this.matchesSubscription(event, state)) {
        continue
      }

      client.send(payload)
    }
  }

  private matchesSubscription(event: WsInboxEvent, state: ClientState): boolean {
    if (event.type === 'conversation_read') {
      return true
    }

    return state.subscriptions.has('facebook')
  }

  async close(): Promise<void> {
    this.unregisterLocalListener()
    await new Promise<void>((resolve) => {
      for (const client of this.clients) {
        this.clientState.delete(client)
        client.close()
      }
      this.wss.close(() => resolve())
    })
  }
}

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
