import http from 'http'
import { createApp } from './app'
import { getConfig } from './config'
import { prisma } from './db/client'
import {
  disconnectFacebookMediaRetry,
  startFacebookMediaRetryWorker,
} from './facebook/media-retry'
import { startFacebookInboxSyncScheduler } from './facebook/inbox-sync'
import {
  disconnectOutgoingRetryQueue,
  startOutgoingRetryWorker,
} from './facebook/outgoing-retry'
import {
  disconnectFacebookReplayQueue,
  startFacebookReplayWorker,
} from './facebook/replay-queue'
import { disconnectRedis } from './realtime/pubsub'
import { disconnectDistributedLockRedis } from './realtime/distributed-lock'
import { InboxWsServer } from './realtime/ws-server'

async function main() {
  const config = getConfig()
  const app = createApp()
  const httpServer = http.createServer(app)
  const wsServer = new InboxWsServer(httpServer)

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(config.PORT, () => {
      console.log(`[server] listening on port ${config.PORT}`)
      resolve()
    })

    httpServer.on('error', reject)
  })

  await wsServer.subscribeToRedis()
  console.log('[server] realtime service ready')
  const stopFacebookSync = startFacebookInboxSyncScheduler()
  const stopFacebookMediaRetry = startFacebookMediaRetryWorker()
  const stopOutgoingRetry = startOutgoingRetryWorker()
  const stopFacebookReplay = startFacebookReplayWorker()

  let isShuttingDown = false

  async function shutdown(signal: string) {
    if (isShuttingDown) {
      return
    }

    isShuttingDown = true
    console.log(`[server] ${signal} received, shutting down`)
    stopFacebookSync()
    stopFacebookMediaRetry()
    stopOutgoingRetry()
    stopFacebookReplay()

    httpServer.close(async () => {
      try {
        await wsServer.close()
        await disconnectFacebookMediaRetry()
        await disconnectOutgoingRetryQueue()
        await disconnectFacebookReplayQueue()
        await disconnectDistributedLockRedis()
        await disconnectRedis()
        await prisma.$disconnect()
        console.log('[server] shutdown complete')
        process.exit(0)
      } catch (error) {
        console.error('[server] shutdown error', error)
        process.exit(1)
      }
    })

    setTimeout(() => {
      console.error('[server] forced shutdown after 15s timeout')
      process.exit(1)
    }, 15_000).unref()
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('uncaughtException', (error) => {
    console.error('[server] uncaughtException', error)
    void shutdown('uncaughtException')
  })
  process.on('unhandledRejection', (reason) => {
    console.error('[server] unhandledRejection', reason)
    void shutdown('unhandledRejection')
  })
}

void main().catch((error) => {
  console.error('[server] failed to start', error)
  process.exit(1)
})
