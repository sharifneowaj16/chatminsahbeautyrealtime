import crypto from 'node:crypto'
import express from 'express'
import { getConfig } from './config'
import { getRealtimeFacebookCutoverStatus } from './facebook/cutover'
import { bridgeWebhookRouter } from './routes/bridge-webhook.router'

function safeSecretEqual(left: string | undefined, right: string): boolean {
  if (!left) return false
  const actual = Buffer.from(left, 'utf8')
  const expected = Buffer.from(right, 'utf8')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

export async function createApp() {
  const config = getConfig()
  const app = express()
  const cutover = getRealtimeFacebookCutoverStatus()
  const legacyEnabled = cutover.legacyDirectClientEnabled
  const bridgeEnabled = cutover.realtimeBridgeEnabled

  app.use(['/webhook/meta', '/webhook/facebook'], express.raw({ type: 'application/json', limit: '2mb' }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'minsah-realtime',
      mode: cutover.mode.toLowerCase(),
      active: cutover.active,
      reasonCode: cutover.reasonCode,
      schemaVersion: 1,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  })

  app.get('/health/metrics', (req, res) => {
    const supplied = typeof req.headers['x-metrics-secret'] === 'string' ? req.headers['x-metrics-secret'] : undefined
    if (!safeSecretEqual(supplied, config.REALTIME_METRICS_SECRET)) {
      res.status(401).json({ error: 'METRICS_AUTH_REQUIRED' })
      return
    }
    res.status(200).json({
      ok: true,
      service: 'minsah-realtime',
      mode: cutover.mode.toLowerCase(),
      active: cutover.active,
      reasonCode: cutover.reasonCode,
      realtimeChannel: 'social-updates',
      websocketContract: 'minsah-inbox-v1',
      legacyGraphEnabled: cutover.legacyDirectClientEnabled,
      platformSyncEnabled: cutover.platformSyncEnabled,
      realtimeBridgeEnabled: cutover.realtimeBridgeEnabled,
      shadowPlatformEvaluationEnabled: cutover.shadowPlatformEvaluationEnabled,
      legacyRetryWorkersEnabled: cutover.retryOwner === 'REALTIME_LEGACY',
      mediaServingEnabled: false,
      providerTransportOwner: cutover.providerIngressOwner,
      retryOwner: cutover.retryOwner,
      deadLetterOwner: cutover.retryOwner === 'REALTIME_LEGACY' ? 'realtime-legacy-rollback' : cutover.retryOwner === 'MAIN_APP_BULLMQ' ? 'main-app-meta-job-audit' : 'none',
      mediaValidationOwner: cutover.authority === 'LEGACY' ? 'realtime-legacy-rollback' : cutover.authority === 'PLATFORM' ? 'main-app-shared-validation' : 'none',
      tokenHealthOwner: cutover.authority === 'LEGACY' ? 'realtime-legacy-rollback' : cutover.authority === 'PLATFORM' ? 'main-app-meta-connection' : 'none',
      permissionHealthOwner: cutover.authority === 'LEGACY' ? 'realtime-legacy-rollback' : cutover.authority === 'PLATFORM' ? 'main-app-page-health' : 'none',
      duplicateEventBoundary: cutover.duplicateEventBoundary,
      timestamp: new Date().toISOString(),
    })
  })

  if (legacyEnabled) {
    const load = <T>(specifier: string): Promise<T> => import(specifier) as Promise<T>
    const [{ webhookRouter }, { replyRouter }, { syncRouter }] = await Promise.all([
      load<{ webhookRouter: express.Router }>('./routes/webhook.router'),
      load<{ replyRouter: express.Router }>('./routes/reply.router'),
      load<{ syncRouter: express.Router }>('./routes/sync.router'),
    ])
    app.use('/webhook', webhookRouter)
    app.use('/reply', replyRouter)
    app.use('/sync', syncRouter)
  } else if (bridgeEnabled) {
    app.use('/webhook', bridgeWebhookRouter)
    app.all(['/reply', '/sync', '/dead-letter', '/media/facebook/*'], (_req, res) => {
      res.status(410).json({ error: 'LEGACY_REALTIME_OPERATION_DISABLED', owner: 'main-app-meta-social' })
    })
  } else {
    app.all(['/webhook/*', '/reply', '/sync', '/dead-letter', '/media/facebook/*'], (_req, res) => {
      res.status(503).json({ error: 'FACEBOOK_CUTOVER_BLOCKED', code: cutover.reasonCode })
    })
  }

  app.use((_req, res) => res.sendStatus(404))
  return app
}
