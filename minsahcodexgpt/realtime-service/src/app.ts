import express from 'express'
import { replyRouter } from './routes/reply.router'
import { webhookRouter } from './routes/webhook.router'

export function createApp() {
  const app = express()

  app.use(
    '/webhook/facebook',
    express.raw({ type: 'application/json', limit: '2mb' })
  )

  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'minsah-realtime',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  })

  app.use('/webhook', webhookRouter)
  app.use('/reply', replyRouter)

  app.use((_req, res) => {
    res.sendStatus(404)
  })

  return app
}
