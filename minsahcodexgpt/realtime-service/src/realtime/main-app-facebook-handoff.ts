import { getConfig } from '../config'
import { signInternalBridgeRequest } from './internal-auth'

export const META_MAIN_APP_WEBHOOK_PATHS = Object.freeze({
  FACEBOOK_PAGE: '/api/webhook/facebook',
  LEAD_ADS: '/api/webhooks/meta',
} as const)

export type MetaMainAppWebhookTarget = keyof typeof META_MAIN_APP_WEBHOOK_PATHS

export async function forwardFacebookWebhookToMainApp(input: Readonly<{
  body: Buffer
  providerSignature?: string
  target?: MetaMainAppWebhookTarget
}>): Promise<Readonly<{ status: number; body: string; contentType: string }>> {
  const config = getConfig()
  const mainAppPath = META_MAIN_APP_WEBHOOK_PATHS[input.target ?? 'FACEBOOK_PAGE']
  const auth = signInternalBridgeRequest({ method: 'POST', path: mainAppPath, body: input.body })
  const response = await fetch(new URL(mainAppPath, config.NEXTJS_INTERNAL_URL.replace(/\/$/, '')), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(input.body.byteLength),
      ...(input.providerSignature ? { 'x-hub-signature-256': input.providerSignature } : {}),
      'x-realtime-bridge-timestamp': auth.timestamp,
      'x-realtime-bridge-signature': auth.signature,
    },
    body: new Uint8Array(input.body),
    signal: AbortSignal.timeout(config.REALTIME_INTERNAL_TIMEOUT_MS),
  })
  return Object.freeze({
    status: response.status,
    body: await response.text(),
    contentType: response.headers.get('content-type') ?? 'application/json',
  })
}
