/**
 * GET /api/admin/shipping/steadfast/webhook-events
 *
 * Lists recent Steadfast webhook deliveries (no raw payload — audit fields only).
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 100

export async function GET(request: NextRequest) {
  const admin = await getVerifiedAdmin(request)
  if (!admin) {
    return adminUnauthorizedResponse()
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number.parseInt(searchParams.get('limit') ?? '30', 10)
  const limit = Number.isNaN(limitRaw)
    ? 30
    : Math.min(MAX_LIMIT, Math.max(1, limitRaw))
  const cursor = searchParams.get('cursor')?.trim() || undefined
  const processingStatus = searchParams.get('status')?.trim() || undefined

  const where = processingStatus ? { processingStatus } : {}

  const rows = await prisma.steadfastWebhookEvent.findMany({
    where,
    take: limit + 1,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      eventType: true,
      invoice: true,
      consignmentId: true,
      trackingCode: true,
      status: true,
      trackingMessage: true,
      processingStatus: true,
      receivedAt: true,
      processedAt: true,
      orderId: true,
      error: true,
      order: { select: { orderNumber: true } },
    },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null

  return NextResponse.json({
    events: page.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      invoice: e.invoice,
      consignmentId: e.consignmentId,
      trackingCode: e.trackingCode,
      status: e.status,
      trackingMessage: e.trackingMessage,
      processingStatus: e.processingStatus,
      receivedAt: e.receivedAt.toISOString(),
      processedAt: e.processedAt?.toISOString() ?? null,
      orderId: e.orderId,
      orderNumber: e.order?.orderNumber ?? null,
      error: e.error,
    })),
    nextCursor,
  })
}
