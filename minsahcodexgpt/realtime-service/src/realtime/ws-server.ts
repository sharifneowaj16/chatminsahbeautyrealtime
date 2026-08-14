import type { Server } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { z } from 'zod'
import {
  SOCIAL_REALTIME_PROTOCOL,
  SOCIAL_REALTIME_SCHEMA_VERSION,
  type SocialRealtimeEvent,
  type SocialRealtimePlatform,
} from '../../../packages/meta-realtime-contract/src'
import { subscribeToSocialRealtimeEvents } from './pubsub'
import { SocialRealtimeEventStore } from './event-store'
import { verifyWsAccessToken, canSubscribeToInbox } from './ws-auth'

const SubscribeSchema = z.object({
  type: z.literal('subscribe_inbox'),
  platforms: z.array(z.enum(['facebook', 'instagram'])).min(1).max(2).default(['facebook', 'instagram']),
  cursor: z.string().regex(/^\d{1,16}:[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/).nullable().optional(),
}).strict()

const ClientPayloadSchema = z.discriminatedUnion('type', [SubscribeSchema])
type SupportedPlatform = Extract<SocialRealtimePlatform, 'facebook' | 'instagram'>

interface ClientState {
  subscriptions: Set<SupportedPlatform>
  alive: boolean
  subject: string
  role: string
  subscribed: boolean
}

function tokenFromProtocols(header: string | string[] | undefined): string | null {
  if (!header) return null
  const value = Array.isArray(header) ? header.join(',') : header
  const values = value.split(',').map((item) => item.trim())
  const auth = values.find((item) => item.startsWith('auth.'))
  return auth ? auth.slice(5) : null
}

export class InboxWsServer {
  private readonly wss: WebSocketServer
  private readonly clients = new Set<WebSocket>()
  private readonly clientState = new WeakMap<WebSocket, ClientState>()
  private readonly store: SocialRealtimeEventStore
  private unsubscribe: (() => Promise<void>) | null = null

  constructor(server: Server, store = new SocialRealtimeEventStore()) {
    this.store = store
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      maxPayload: 16 * 1024,
      handleProtocols: (protocols) => protocols.has(SOCIAL_REALTIME_PROTOCOL) ? SOCIAL_REALTIME_PROTOCOL : false,
      verifyClient: ({ req }: { req: import('http').IncomingMessage }) => {
        const token = tokenFromProtocols(req.headers['sec-websocket-protocol'])
        const verified = token ? verifyWsAccessToken(token) : null
        return Boolean(verified && canSubscribeToInbox(verified))
      },
    })

    this.wss.on('connection', (socket, request) => {
      const token = tokenFromProtocols(request.headers['sec-websocket-protocol'])
      const verified = token ? verifyWsAccessToken(token) : null
      if (!verified || !canSubscribeToInbox(verified)) {
        socket.close(1008, 'AUTHORIZATION_REQUIRED')
        return
      }
      this.clients.add(socket)
      this.clientState.set(socket, {
        subscriptions: new Set(),
        alive: true,
        subject: verified.sub,
        role: verified.role,
        subscribed: false,
      })
      socket.on('pong', () => {
        const state = this.clientState.get(socket)
        if (state) state.alive = true
      })
      socket.send(JSON.stringify({
        type: 'connected',
        schemaVersion: SOCIAL_REALTIME_SCHEMA_VERSION,
        clientId: generateClientId(),
        reconnect: { cursorSupported: true, maxRecoveryEvents: 250 },
        ts: Date.now(),
      }))

      socket.on('message', (raw) => {
        void this.handleClientMessage(socket, raw.toString()).catch((error) => {
          console.error('[ws] client message failed', error)
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'error', code: 'WS_OPERATION_FAILED', ts: Date.now() }))
          }
        })
      })

      const cleanup = () => {
        this.clients.delete(socket)
        this.clientState.delete(socket)
      }
      socket.on('close', cleanup)
      socket.on('error', cleanup)
    })

    const heartbeat = setInterval(() => {
      for (const client of this.clients) {
        const state = this.clientState.get(client)
        if (!state || !state.alive) {
          client.terminate()
          continue
        }
        state.alive = false
        client.ping()
      }
    }, 25_000)
    heartbeat.unref()
    this.wss.on('close', () => clearInterval(heartbeat))
  }

  private async handleClientMessage(socket: WebSocket, raw: string): Promise<void> {
    let payload: z.infer<typeof ClientPayloadSchema>
    try {
      payload = ClientPayloadSchema.parse(JSON.parse(raw))
    } catch {
      socket.send(JSON.stringify({ type: 'error', code: 'WS_PAYLOAD_INVALID', ts: Date.now() }))
      return
    }
    const state = this.clientState.get(socket)
    if (!state) return
    state.subscriptions = new Set(payload.platforms)
    state.subscribed = true
    const recovery = await this.store.recover(payload.cursor ?? null)
    for (const delivery of recovery.deliveries) this.sendIfMatched(socket, delivery.event, delivery.cursor)
    socket.send(JSON.stringify({
      type: 'subscribed',
      schemaVersion: SOCIAL_REALTIME_SCHEMA_VERSION,
      platforms: Array.from(state.subscriptions),
      recovered: recovery.deliveries.length,
      gapDetected: recovery.gapDetected,
      action: recovery.gapDetected ? 'REFETCH_REQUIRED' : 'NONE',
      ts: Date.now(),
    }))
  }

  async subscribeToRedis(): Promise<void> {
    if (this.unsubscribe) return
    this.unsubscribe = await subscribeToSocialRealtimeEvents(async (event) => {
      const accepted = await this.store.accept(event)
      if (!accepted.accepted) return
      this.broadcast(accepted.delivery.event, accepted.delivery.cursor)
    })
  }

  broadcast(event: SocialRealtimeEvent, cursor: string): void {
    for (const client of this.clients) this.sendIfMatched(client, event, cursor)
  }

  private sendIfMatched(client: WebSocket, event: SocialRealtimeEvent, cursor: string): void {
    if (client.readyState !== WebSocket.OPEN) return
    const state = this.clientState.get(client)
    if (!state?.subscribed) return
    if (event.platform !== 'meta' && !state.subscriptions.has(event.platform as SupportedPlatform)) return
    client.send(JSON.stringify({
      type: 'social_event',
      schemaVersion: SOCIAL_REALTIME_SCHEMA_VERSION,
      cursor,
      event,
    }))
  }

  async close(): Promise<void> {
    if (this.unsubscribe) await this.unsubscribe().catch(() => undefined)
    await this.store.close().catch(() => undefined)
    await new Promise<void>((resolve) => {
      for (const client of this.clients) client.close(1001, 'SERVER_SHUTDOWN')
      this.wss.close(() => resolve())
    })
  }
}

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
