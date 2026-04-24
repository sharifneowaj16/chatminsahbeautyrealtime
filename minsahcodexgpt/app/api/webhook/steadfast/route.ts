import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { mapSteadfastStatusToOrderStatus } from '@/lib/steadfast/client'

export const dynamic = 'force-dynamic'

type SteadfastWebhookPayload = {
  status?: string
  invoice?: string
  consignment_id?: string | number
  tracking_code?: string
  tracking_message?: string
  cod_amount?: number | string
  updated_at?: string
}

function getConfiguredWebhookSecret() {
  return {
    customerKey:
      process.env.STEADFAST_WEBHOOK_CUSTOMER_KEY ??
      process.env.STEADFAST_API_KEY ??
      '',
    authorization: process.env.STEADFAST_WEBHOOK_AUTHORIZATION ?? '',
  }
}

function isWebhookAuthorized(request: NextRequest): boolean {
  const configured = getConfiguredWebhookSecret()
  const headerCustomerKey =
    request.headers.get('customer-key') ?? request.headers.get('x-api-key') ?? ''
  const headerAuthorization = request.headers.get('authorization') ?? ''

  if (configured.customerKey && headerCustomerKey !== configured.customerKey) {
    return false
  }

  if (configured.authorization && headerAuthorization !== configured.authorization) {
    return false
  }

  return true
}

function normalizePayload(raw: unknown): SteadfastWebhookPayload {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  return raw as SteadfastWebhookPayload
}

function detectEventType(payload: SteadfastWebhookPayload): 'delivery_status' | 'tracking_update' {
  return payload.tracking_message ? 'tracking_update' : 'delivery_status'
}

function buildEventKey(payload: SteadfastWebhookPayload, rawBody: string): string {
  const digestInput = JSON.stringify({
    invoice: payload.invoice ?? null,
    consignmentId: payload.consignment_id ?? null,
    trackingCode: payload.tracking_code ?? null,
    status: payload.status ?? null,
    trackingMessage: payload.tracking_message ?? null,
    codAmount: payload.cod_amount ?? null,
    updatedAt: payload.updated_at ?? null,
    rawBody,
  })

  return createHash('sha256').update(digestInput).digest('hex')
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue
}

export async function POST(request: NextRequest) {
  if (!isWebhookAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 })
  }

  const rawBody = await request.text()
  let body: unknown
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const payload = normalizePayload(body)
  const invoice = payload.invoice?.trim() || undefined
  const consignmentId =
    payload.consignment_id !== undefined && payload.consignment_id !== null
      ? String(payload.consignment_id)
      : undefined
  const trackingCode = payload.tracking_code?.trim() || undefined
  const status = payload.status?.trim() || undefined
  const trackingMessage = payload.tracking_message?.trim() || undefined
  const eventType = detectEventType(payload)
  const eventKey = buildEventKey(payload, rawBody)
  const receivedAt = new Date()

  const existing = await prisma.steadfastWebhookEvent.findUnique({
    where: { eventKey },
    select: { id: true, processingStatus: true },
  })

  if (existing) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      eventId: existing.id,
      processingStatus: existing.processingStatus,
    })
  }

  const event = await prisma.steadfastWebhookEvent.create({
    data: {
      eventKey,
      eventType,
      invoice: invoice ?? null,
      consignmentId: consignmentId ?? null,
      trackingCode: trackingCode ?? null,
      status: status ?? null,
      trackingMessage: trackingMessage ?? null,
      payload: toJsonInput(body),
      processingStatus: 'RECEIVED',
      receivedAt,
    },
    select: { id: true },
  })

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        ...(consignmentId ? [{ steadfastConsignmentId: consignmentId }] : []),
        ...(trackingCode ? [{ steadfastTrackingCode: trackingCode }] : []),
        ...(invoice ? [{ orderNumber: invoice }] : []),
      ],
    },
    select: {
      id: true,
      status: true,
      steadfastStatus: true,
      trackingNumber: true,
    },
  })

  if (!order) {
    await prisma.steadfastWebhookEvent.update({
      where: { id: event.id },
      data: {
        processingStatus: 'NO_ORDER_FOUND',
        processedAt: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
      eventId: event.id,
      processingStatus: 'NO_ORDER_FOUND',
    })
  }

  const mappedStatus = status ? mapSteadfastStatusToOrderStatus(status) : null
  const now = new Date()
  const updateData: Record<string, unknown> = {}

  if (status && status !== order.steadfastStatus) {
    updateData.steadfastStatus = status
  }
  if (trackingCode && trackingCode !== order.trackingNumber) {
    updateData.trackingNumber = trackingCode
    updateData.steadfastTrackingCode = trackingCode
  }
  if (mappedStatus && mappedStatus !== order.status) {
    updateData.status = mappedStatus
    if (mappedStatus === 'SHIPPED') {
      updateData.shippedAt = now
    }
    if (mappedStatus === 'DELIVERED') {
      updateData.deliveredAt = now
    }
    if (mappedStatus === 'CANCELLED') {
      updateData.cancelledAt = now
    }
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: updateData,
    }),
    prisma.steadfastWebhookEvent.update({
      where: { id: event.id },
      data: {
        orderId: order.id,
        processingStatus: 'PROCESSED',
        processedAt: now,
      },
    }),
  ])

  return NextResponse.json({
    ok: true,
    eventId: event.id,
    processingStatus: 'PROCESSED',
    orderId: order.id,
  })
}
