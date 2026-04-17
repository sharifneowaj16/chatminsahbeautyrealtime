import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils'
import { NextRequest, NextResponse } from 'next/server'

const REALTIME_SERVICE_URL =
  process.env.REALTIME_SERVICE_INTERNAL_URL ?? 'http://realtime-service:3001'
const REPLY_API_SECRET = process.env.REPLY_API_SECRET ?? ''

function getProxyHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-secret': REPLY_API_SECRET,
  }
}

export async function GET(request: NextRequest) {
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

  try {
    const query = request.nextUrl.searchParams.toString()
    const response = await fetch(
      `${REALTIME_SERVICE_URL}/sync/facebook/dead-letter${query ? `?${query}` : ''}`,
      {
        headers: getProxyHeaders(),
      }
    )

    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
    return NextResponse.json(
      data ?? { error: 'Dead-letter proxy failed' },
      { status: response.status }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Dead-letter proxy failed', detail: String(error) },
      { status: 502 }
    )
  }
}

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

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const query = request.nextUrl.searchParams.toString()
    const response = await fetch(
      `${REALTIME_SERVICE_URL}/sync/facebook/dead-letter/replay-open${query ? `?${query}` : ''}`,
      {
        method: 'POST',
        headers: getProxyHeaders(),
        body: JSON.stringify(body),
      }
    )

    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
    return NextResponse.json(
      data ?? { error: 'Dead-letter replay failed' },
      { status: response.status }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Dead-letter replay failed', detail: String(error) },
      { status: 502 }
    )
  }
}
