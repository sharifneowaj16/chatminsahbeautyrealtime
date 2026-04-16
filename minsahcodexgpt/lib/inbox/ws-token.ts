import crypto from 'crypto'

const WS_TOKEN_TTL_MS = 5 * 60 * 1000

interface WsTokenPayload {
  sub: string
  role: string
  aud: 'admin-inbox'
  iat: number
  exp: number
}

function getSecret(): string {
  return process.env.WS_AUTH_SECRET ?? process.env.NEXT_PUBLIC_WS_AUTH_SECRET ?? ''
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function signPayload(encodedPayload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url')
}

export function createInboxWsToken(input: {
  adminId: string
  role: string
  now?: number
}): string | null {
  const secret = getSecret()

  if (!secret) {
    return null
  }

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
