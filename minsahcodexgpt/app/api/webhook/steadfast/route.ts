/**
 * Steadfast webhook: POST JSON, Content-Type application/json,
 * Authorization: Bearer {api_key} when auth is enabled.
 * Payload shapes: delivery_status | tracking_update (notification_type).
 * Success: HTTP 200 + { status: "success", message: "Webhook received successfully." }
 */
import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { mapSteadfastStatusToOrderStatus } from '@/lib/steadfast/client'
import { recordProductLifecycleTransitionInTransaction } from '@/lib/analytics/product-metrics'
import { extractBearerToken, secureCompareText } from '@/lib/security/request-secret'
import { isPrismaUniqueConstraintError } from '@/lib/prisma-errors'
import { calculateCourierSendAccounting, toJsonInput } from '@/lib/courier-send-accounting'

export const dynamic = 'force-dynamic'

type SteadfastWebhookPayload = {
  notification_type?: string
  status?: string
  invoice?: string
  consignment_id?: string | number
  tracking_code?: string
  tracking_message?: string
  cod_amount?: number | string
  delivery_charge?: number | string
  updated_at?: string
}

type WebhookAuthResult = { ok: true } | { ok: false; reason?: 'not_configured' }

/**
 * Steadfast portal typically sends `Authorization: Bearer <webhook token>`.
 * We also accept a shared secret via `x-steadfast-webhook-secret` or raw
 * `Authorization: <token>`, plus optional Customer / Api-Key headers.
 *
 * If multiple env vars are set, **any one** matching request headers is enough
 * (OR). Requiring all (AND) broke real callbacks when extra keys were left in .env.
 */
function authorizationHeaderMatchesExpected(
  request: NextRequest,
  expected: string
): boolean {
  const raw = request.headers.get('authorization')?.trim() ?? ''
  const exp = expected.trim()
  if (!raw || !exp) return false
  if (secureCompareText(raw, exp)) return true
  const rawToken = extractBearerToken(raw)
  const expToken = extractBearerToken(exp)
  if (rawToken && expToken && secureCompareText(rawToken, expToken)) return true
  return false
}

function isWebhookAuthorized(request: NextRequest): WebhookAuthResult {
  const secret = process.env.STEADFAST_WEBHOOK_SECRET?.trim()
  const customerKey = process.env.STEADFAST_WEBHOOK_CUSTOMER_KEY?.trim()
  const authorization =
    process.env.STEADFAST_WEBHOOK_AUTH_TOKEN?.trim()
      ? `Bearer ${process.env.STEADFAST_WEBHOOK_AUTH_TOKEN?.trim()}`
      : process.env.STEADFAST_WEBHOOK_AUTHORIZATION?.trim()

  if (!secret && !customerKey && !authorization) {
    return { ok: false, reason: 'not_configured' }
  }

  const checks: boolean[] = []

  if (secret) {
    const headerSecret = request.headers.get('x-steadfast-webhook-secret')?.trim()
    const authHeader = request.headers.get('authorization')?.trim()
    const secretOk =
      secureCompareText(headerSecret, secret) ||
      secureCompareText(authHeader, `Bearer ${secret}`) ||
      secureCompareText(authHeader, secret) ||
      authorizationHeaderMatchesExpected(request, secret)
    checks.push(secretOk)
  }

  if (customerKey) {
    const provided =
      request.headers.get('customer-key')?.trim() ||
      request.headers.get('x-api-key')?.trim() ||
      request.headers.get('api-key')?.trim()
    checks.push(secureCompareText(provided, customerKey))
  }

  if (authorization) {
    checks.push(authorizationHeaderMatchesExpected(request, authorization))
  }

  if (checks.length === 0) {
    return { ok: false, reason: 'not_configured' }
  }

  return checks.some(Boolean) ? { ok: true } : { ok: false }
}

function normalizePayload(raw: unknown): SteadfastWebhookPayload {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  return raw as SteadfastWebhookPayload
}

function detectEventType(payload: SteadfastWebhookPayload): 'delivery_status' | 'tracking_update' {
  const t = payload.notification_type?.trim().toLowerCase()
  if (t === 'tracking_update') return 'tracking_update'
  if (t === 'delivery_status') return 'delivery_status'
  return payload.tracking_message && !payload.status ? 'tracking_update' : 'delivery_status'
}

function buildEventKey(payload: SteadfastWebhookPayload, rawBody: string): string {
  const digestInput = JSON.stringify({
    notificationType: payload.notification_type ?? null,
    invoice: payload.invoice ?? null,
    consignmentId: payload.consignment_id ?? null,
    trackingCode: payload.tracking_code ?? null,
    status: payload.status ?? null,
    trackingMessage: payload.tracking_message ?? null,
    codAmount: payload.cod_amount ?? null,
    deliveryCharge: payload.delivery_charge ?? null,
    updatedAt: payload.updated_at ?? null,
    rawBody,
  })

  return createHash('sha256').update(digestInput).digest('hex')
}

/** Steadfast expects HTTP 200 and a documented JSON shape on success. */
function jsonSuccess(extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      status: 'success',
      message: 'Webhook received successfully.',
      ...extra,
    },
    { status: 200 }
  )
}

function jsonError(message: string, httpStatus: number) {
  return NextResponse.json({ status: 'error', message }, { status: httpStatus })
}

function parseOptionalMoney(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null

  let parsed: number | null = null
  if (typeof value === 'number') {
    parsed = value
  } else if (typeof value === 'string') {
    parsed = Number.parseFloat(value.trim())
  } else if (value && typeof value === 'object') {
    const maybeDecimal = value as { toNumber?: () => number; toString?: () => string }
    if (typeof maybeDecimal.toNumber === 'function') {
      parsed = maybeDecimal.toNumber()
    } else if (typeof maybeDecimal.toString === 'function') {
      parsed = Number.parseFloat(maybeDecimal.toString())
    }
  }

  return parsed !== null && Number.isFinite(parsed) && parsed >= 0
    ? Math.round((parsed + Number.EPSILON) * 100) / 100
    : null
}

export async function POST(request: NextRequest) {
  const auth = isWebhookAuthorized(request)
  if (!auth.ok) {
    if (auth.reason === 'not_configured') {
      return jsonError(
        'Webhook is disabled until STEADFAST_WEBHOOK_SECRET, STEADFAST_WEBHOOK_CUSTOMER_KEY, STEADFAST_WEBHOOK_AUTH_TOKEN, or STEADFAST_WEBHOOK_AUTHORIZATION is set.',
        503
      )
    }
    return jsonError('Unauthorized webhook request.', 401)
  }

  const rawBody = await request.text()
  let body: unknown
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return jsonError('Invalid JSON payload.', 400)
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
    return jsonSuccess({
      duplicate: true,
      eventId: existing.id,
      processingStatus: existing.processingStatus,
    })
  }

  let event: { id: string }
  try {
    event = await prisma.steadfastWebhookEvent.create({
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
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return jsonSuccess({ duplicate: true })
    }
    throw error
  }

  const matchConditions = [
    ...(consignmentId ? [{ steadfastConsignmentId: consignmentId }] : []),
    ...(trackingCode ? [{ steadfastTrackingCode: trackingCode }] : []),
    ...(invoice ? [{ orderNumber: invoice }] : []),
  ]

  if (matchConditions.length === 0) {
    await prisma.steadfastWebhookEvent.update({
      where: { id: event.id },
      data: {
        processingStatus: 'NO_ORDER_FOUND',
        processedAt: new Date(),
        error: 'Missing invoice and consignment_id.',
      },
    })
    return jsonError('Invalid consignment ID.', 400)
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: matchConditions,
    },
    select: {
      id: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      isTest: true,
      phoneConfirmedAt: true,
      paymentPaidAt: true,
      paidAt: true,
      deliveredAt: true,
      cancelledAt: true,
      returnedAt: true,
      refundedAt: true,
      courierDeliveredAt: true,
      courierReturnedAt: true,
      shippingCost: true,
      courierDeliveryCharge: true,
      deliveryDiscountAmount: true,
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

    return jsonSuccess({
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
  const webhookCourierCharge = parseOptionalMoney(payload.delivery_charge)
  if (webhookCourierCharge !== null) {
    const courierAccounting = calculateCourierSendAccounting({
      customerShippingCost: order.shippingCost,
      currentCourierDeliveryCharge: order.courierDeliveryCharge,
      currentDeliveryDiscountAmount: order.deliveryDiscountAmount,
      courierResponseCharge: webhookCourierCharge,
    })
    updateData.courierDeliveryCharge = courierAccounting.courierDeliveryCharge
    updateData.deliveryDiscountAmount = courierAccounting.deliveryDiscountAmount
  }
  if (trackingMessage) {
    updateData.adminNote = trackingMessage
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

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: updateData,
      })

      await recordProductLifecycleTransitionInTransaction(tx, order, updatedOrder)
    }

    await tx.steadfastWebhookEvent.update({
      where: { id: event.id },
      data: {
        orderId: order.id,
        processingStatus: 'PROCESSED',
        processedAt: now,
      },
    })
  })

  return jsonSuccess({
    eventId: event.id,
    processingStatus: 'PROCESSED',
    orderId: order.id,
  })
}
