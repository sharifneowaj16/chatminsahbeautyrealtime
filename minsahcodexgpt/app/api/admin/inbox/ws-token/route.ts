import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils'
import { createInboxWsToken } from '@/lib/inbox/ws-token'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const admin = await getVerifiedAdmin(request)

  if (!admin) {
    return adminUnauthorizedResponse()
  }

  const token = createInboxWsToken({
    adminId: admin.adminId,
    role: admin.role,
  })

  if (!token) {
    return NextResponse.json(
      { error: 'WS_AUTH_SECRET is not configured' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    token,
    expiresInMs: 5 * 60 * 1000,
  })
}
