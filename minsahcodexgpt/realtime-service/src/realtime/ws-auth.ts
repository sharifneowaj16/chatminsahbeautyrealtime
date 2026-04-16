import crypto from 'crypto'
import { getConfig } from '../config'

const WS_TOKEN_TTL_MS = 5 * 60 * 1000

interface WsTokenPayload {
  sub: string
  role: string
  aud: 'admin-inbox'
  iat: number
  exp: number
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getConfig().WS_AUTH_SECRET)
    .update(encodedPayload)
    .digest('base64url')
}

export function createWsAccessToken(input: {
  adminId: string
  role: string
  now?: number
}): string {
  const now = input.now ?? Date.now()
  const payload: WsTokenPayload = {
    sub: input.adminId,
    role: input.role,
    aud: 'admin-inbox',
    iat: now,
    exp: now + WS_TOKEN_TTL_MS,
  }

  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyWsAccessToken(token: string): WsTokenPayload | null {
  const [encodedPayload, signature] = token.split('.')

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload)
  const actual = Buffer.from(signature, 'utf8')
  const expected = Buffer.from(expectedSignature, 'utf8')

  if (actual.length !== expected.length) {
    return null
  }

  if (!crypto.timingSafeEqual(actual, expected)) {
    return null
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as WsTokenPayload

    if (payload.aud !== 'admin-inbox') {
      return null
    }

    if (!payload.sub || !payload.role) {
      return null
    }

    if (payload.exp <= Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
