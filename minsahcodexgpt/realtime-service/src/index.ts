import http from 'http'
import { createApp } from './app'
import { getConfig } from './config'
import { getRealtimeFacebookCutoverStatus } from './facebook/cutover'
import { disconnectRedis } from './realtime/pubsub'
import { InboxWsServer } from './realtime/ws-server'

type Stop = () => void

async function startLegacyRollbackWorkers(): Promise<Readonly<{ stops: readonly Stop[]; disconnect: () => Promise<void> }>> {
  getConfig()
  const cutover = getRealtimeFacebookCutoverStatus()
  if (cutover.retryOwner !== 'REALTIME_LEGACY') {
    return Object.freeze({ stops: Object.freeze([]), disconnect: async () => undefined })
  }
  const load = <T>(specifier: string): Promise<T> => import(specifier) as Promise<T>
  const [token, sync, media, outgoing, replay, lock, db] = await Promise.all([
    load<{ startTokenHealthCheck(): Stop }>('./facebook/token-health'),
    load<{ startFacebookInboxSyncScheduler(): Stop }>('./facebook/inbox-sync'),
    load<{ startFacebookMediaRetryWorker(): Stop; disconnectFacebookMediaRetry(): Promise<void> }>('./facebook/media-retry'),
    load<{ startOutgoingRetryWorker(): Stop; disconnectOutgoingRetryQueue(): Promise<void> }>('./facebook/outgoing-retry'),
    load<{ startFacebookReplayWorker(): Stop; disconnectFacebookReplayQueue(): Promise<void> }>('./facebook/replay-queue'),
    load<{ disconnectDistributedLockRedis(): Promise<void> }>('./realtime/distributed-lock'),
    load<{ prisma: { $disconnect(): Promise<void> } }>('./db/client'),
  ])
  const stops = Object.freeze([
    token.startTokenHealthCheck(),
    sync.startFacebookInboxSyncScheduler(),
    media.startFacebookMediaRetryWorker(),
    outgoing.startOutgoingRetryWorker(),
    replay.startFacebookReplayWorker(),
  ])
  return Object.freeze({
    stops,
    disconnect: async () => {
      await Promise.allSettled([
        media.disconnectFacebookMediaRetry(),
        outgoing.disconnectOutgoingRetryQueue(),
        replay.disconnectFacebookReplayQueue(),
        lock.disconnectDistributedLockRedis(),
        db.prisma.$disconnect(),
      ])
    },
  })
}

async function main() {
  const config = getConfig()
  const app = await createApp()
  const httpServer = http.createServer(app)
  const wsServer = new InboxWsServer(httpServer)

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(config.PORT, () => resolve())
    httpServer.on('error', reject)
  })

  await wsServer.subscribeToRedis()
  const legacy = await startLegacyRollbackWorkers()
  const cutover = getRealtimeFacebookCutoverStatus()
  console.log(`[server] ready on ${config.PORT} (${cutover.mode}:${cutover.reasonCode})`)

  let isShuttingDown = false
  async function shutdown(signal: string) {
    if (isShuttingDown) return
    isShuttingDown = true
    console.log(`[server] ${signal} received, shutting down`)
    legacy.stops.forEach((stop) => stop())
    httpServer.close(async () => {
      await Promise.allSettled([wsServer.close(), legacy.disconnect(), disconnectRedis()])
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 15_000).unref()
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('uncaughtException', (error) => { console.error(error); void shutdown('uncaughtException') })
  process.on('unhandledRejection', (reason) => { console.error(reason); void shutdown('unhandledRejection') })
}

void main().catch((error) => {
  console.error('[server] failed to start', error)
  process.exit(1)
})
