import express from 'express'
import path from 'path'
import { getConfig } from './config'
import { getDeadLetterSummary } from './db/repository'
import { getFacebookInboxSyncStatus } from './facebook/inbox-sync'
import { getFacebookMediaRetryQueueDepth } from './facebook/media-retry'
import { getOutgoingRetryQueueDepth } from './facebook/outgoing-retry'
import { getFacebookReplayQueueDepth } from './facebook/replay-queue'
import { replyRouter } from './routes/reply.router'
import { webhookRouter } from './routes/webhook.router'
import { syncRouter } from './routes/sync.router'

async function buildOperationalMetrics() {
  const [replayQueueDepth, mediaRetryQueueDepth, outgoingRetryQueueDepth, deadLetter] =
    await Promise.all([
      getFacebookReplayQueueDepth(),
      getFacebookMediaRetryQueueDepth(),
      getOutgoingRetryQueueDepth(),
      getDeadLetterSummary(),
    ])

  return {
    queues: {
      replay: replayQueueDepth,
      mediaRetry: mediaRetryQueueDepth,
      outgoingRetry: outgoingRetryQueueDepth,
      total: replayQueueDepth + mediaRetryQueueDepth + outgoingRetryQueueDepth,
    },
    deadLetter,
    sync: getFacebookInboxSyncStatus(),
  }
}

export function createApp() {
  const app = express()

  // ⚠️ raw body ONLY for FB webhook
  app.use(
    '/webhook/facebook',
    express.raw({ type: 'application/json', limit: '2mb' })
  )

  // normal json for rest
  app.use(express.json({ limit: '1mb' }))
  app.use(
    '/media/facebook',
    express.static(path.resolve(getConfig().MEDIA_STORAGE_DIR, 'facebook'), {
      fallthrough: true,
      maxAge: '365d',
      immutable: true,
    })
  )

  // ✅ SIMPLE /health — শুধু process alive কিনা check করে
  // DB/Redis call করে না → fail হলেও restart হবে না
  // Dokploy/Docker health check এর জন্য এটাই যথেষ্ট
  app.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'minsah-realtime',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  })

  // ✅ /health/metrics — full operational data, আলাদা endpoint এ রাখা হয়েছে
  // এটা fail হলেও /health এ কোনো effect নেই
  app.get('/health/metrics', async (_req, res) => {
    try {
      const operational = await buildOperationalMetrics()

      res.json({
        ok: true,
        service: 'minsah-realtime',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        storage: {
          backend: getConfig().MEDIA_STORAGE_BACKEND,
        },
        ...operational,
      })
    } catch (error) {
      console.error('[health/metrics] failed', error)
      res.status(500).json({
        ok: false,
        service: 'minsah-realtime',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        error: 'Health metrics failed',
      })
    }
  })

  app.use('/webhook', webhookRouter)
  app.use('/reply', replyRouter)
  app.use('/sync', syncRouter)

  app.use((_req, res) => {
    res.sendStatus(404)
  })

  return app
}
