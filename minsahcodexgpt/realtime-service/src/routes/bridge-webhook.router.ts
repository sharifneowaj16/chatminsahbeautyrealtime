import { Router, type Request, type Response } from 'express'
import { getConfig } from '../config'
import {
  forwardFacebookWebhookToMainApp,
  type MetaMainAppWebhookTarget,
} from '../realtime/main-app-facebook-handoff'

export const bridgeWebhookRouter = Router()
const EXTERNAL_PATHS = ['/meta', '/facebook'] as const
const FACEBOOK_MAIN_APP_PATH = '/api/webhook/facebook'

function targetUrl(req: Request): URL {
  const base = getConfig().NEXTJS_INTERNAL_URL.replace(/\/$/, '')
  const url = new URL(FACEBOOK_MAIN_APP_PATH, base)
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') url.searchParams.set(key, value)
  }
  return url
}

async function challenge(req: Request, res: Response) {
  try {
    const response = await fetch(targetUrl(req), {
      method: 'GET',
      signal: AbortSignal.timeout(getConfig().REALTIME_INTERNAL_TIMEOUT_MS),
    })
    res.status(response.status).type(response.headers.get('content-type') ?? 'text/plain').send(await response.text())
  } catch (error) {
    console.error('[bridge/webhook] challenge proxy failed', error)
    res.status(503).json({ error: 'WEBHOOK_BRIDGE_UNAVAILABLE' })
  }
}

async function handoff(req: Request, res: Response) {
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
  try {
    const providerSignature = typeof req.headers['x-hub-signature-256'] === 'string'
      ? req.headers['x-hub-signature-256']
      : undefined
    const targets = selectMainAppWebhookTargets(body)
    const responses = await Promise.all(targets.map((target) => (
      forwardFacebookWebhookToMainApp({ body, providerSignature, target })
    )))
    const failed = responses.find((response) => response.status < 200 || response.status >= 300)
    if (failed) {
      res.status(failed.status).type(failed.contentType).send(failed.body)
      return
    }
    if (responses.length === 1) {
      const [response] = responses
      res.status(response.status).type(response.contentType).send(response.body)
      return
    }
    res.status(200).json({ accepted: true, routedTargets: targets })
  } catch (error) {
    console.error('[bridge/webhook] handoff failed', error)
    res.status(503).json({ error: 'WEBHOOK_BRIDGE_UNAVAILABLE' })
  }
}

export function selectMainAppWebhookTargets(body: Buffer): readonly MetaMainAppWebhookTarget[] {
  let envelope: unknown
  try {
    envelope = JSON.parse(body.toString('utf8'))
  } catch {
    return Object.freeze(['FACEBOOK_PAGE'])
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return Object.freeze(['FACEBOOK_PAGE'])
  }
  const root = envelope as Record<string, unknown>
  const entries = Array.isArray(root.entry) ? root.entry : []
  let hasLeadAds = false
  let hasFacebookPage = false
  for (const candidate of entries) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
    const entry = candidate as Record<string, unknown>
    if ((Array.isArray(entry.messaging) && entry.messaging.length > 0)
      || (Array.isArray(entry.standby) && entry.standby.length > 0)) {
      hasFacebookPage = true
    }
    if (!Array.isArray(entry.changes)) continue
    for (const change of entry.changes) {
      if (!change || typeof change !== 'object' || Array.isArray(change)) continue
      const field = String((change as Record<string, unknown>).field ?? '').trim().toLowerCase()
      if (field === 'leadgen') hasLeadAds = true
      else hasFacebookPage = true
    }
  }
  const targets: MetaMainAppWebhookTarget[] = []
  if (hasLeadAds) targets.push('LEAD_ADS')
  if (hasFacebookPage || !hasLeadAds) targets.push('FACEBOOK_PAGE')
  return Object.freeze(targets)
}

for (const path of EXTERNAL_PATHS) {
  bridgeWebhookRouter.get(path, challenge)
  bridgeWebhookRouter.post(path, handoff)
}
