import { createRealtimeBridgeSignature } from '../../../packages/meta-realtime-contract/src'
import { getConfig } from '../config'

export function signInternalBridgeRequest(input: {
  timestamp?: number
  method: string
  path: string
  body: Buffer
}): Readonly<{ timestamp: string; signature: string }> {
  const secret = getConfig().REALTIME_BRIDGE_SECRET
  if (!secret) throw new Error('REALTIME_BRIDGE_SECRET_MISSING')
  const timestamp = String(input.timestamp ?? Date.now())
  return Object.freeze({
    timestamp,
    signature: createRealtimeBridgeSignature({ secret, timestamp, method: input.method, path: input.path, body: input.body }),
  })
}
