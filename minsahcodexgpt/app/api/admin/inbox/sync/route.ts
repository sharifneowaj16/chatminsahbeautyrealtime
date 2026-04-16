import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils'
import { NextRequest, NextResponse } from 'next/server'

const REALTIME_SERVICE_URL =
  process.env.REALTIME_SERVICE_INTERNAL_URL ?? 'http://realtime-service:3001'
const REPLY_API_SECRET = process.env.REPLY_API_SECRET ?? ''

export async function POST(request: NextRequest) {
  const admin = await getVerifiedAdmin(request)
  if (!admin) {
    return adminUnauthorizedResponse()
  }

  if (!REPLY_API_SECRET) {
    return NextResponse.json(
      { error: 'REPLY_API_SECRET is not configured' },
      { status: 500 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

  const response = await fetch(`${REALTIME_SERVICE_URL}/sync/facebook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': REPLY_API_SECRET,
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok) {
    return NextResponse.json(
      data ?? { error: 'Facebook inbox sync failed' },
      { status: response.status }
    )
  }

  return NextResponse.json(data ?? { ok: true })
}
