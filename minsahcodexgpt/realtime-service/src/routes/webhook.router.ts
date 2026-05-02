import { Router, type Request, type Response } from 'express'
import type { Prisma } from '../../prisma/generated/prisma/client'
import { getConfig } from '../config'
import {
  createWebhookAudit,
  finalizeWebhookAudit,
  findLatestOutgoingMessageForReceipt,
  recordOutboxReceipt,
} from '../db/repository'
import { getAttachmentTypeHint } from '../facebook/attachments'
import { parseWebhookPayload } from '../facebook/events'
import { processIncomingInboxMessage } from '../facebook/inbox-processor'
import { scheduleInboxReplayJob } from '../facebook/replay-queue'
import { verifyFacebookSignature } from '../facebook/signature'
import type { FbWebhookBody, ParsedFbEvent } from '../facebook/types'
import { publishInboxEvent } from '../realtime/pubsub'

export const webhookRouter = Router()

webhookRouter.get('/meta', (req: Request, res: Response) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const { FB_VERIFY_TOKEN } = getConfig()

  if (mode === 'subscribe' && token === FB_VERIFY_TOKEN && typeof challenge === 'string') {
    res.status(200).send(challenge)
    return
  }

  res.sendStatus(403)
})

webhookRouter.post('/meta', async (req: Request, res: Response) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([])
  const signatureHeader = req.headers['x-hub-signature-256']

  if (!verifyFacebookSignature(rawBody, signatureHeader, getConfig().FB_APP_SECRET)) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  let body: FbWebhookBody
  try {
    body = JSON.parse(rawBody.toString('utf8')) as FbWebhookBody
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' })
    return
  }

  const events = parseWebhookPayload(body)
  const audit = await createWebhookAudit({
    pageId: body.entry[0]?.id,
    rawBody: rawBody.toString('utf8'),
    payload: body as unknown as Prisma.InputJsonValue,
    signatureValid: true,
    eventCount: events.length,
  })

  // Meta should get a fast ACK to avoid retries and duplicate pressure.
  res.status(200).json({ ok: true, accepted: events.length })

  void processWebhookBatch({
    events,
    auditId: audit.id,
  })
})

async function processWebhookBatch(input: {
  events: ParsedFbEvent[]
  auditId: string
}): Promise<void> {
  let processedEvents = 0
  let failedEvents = 0
  let lastError: string | undefined

  const settledEvents = await Promise.allSettled(
    input.events.map(async (event) => {
      await processEvent(event)
      return event
    })
  )

  for (const settled of settledEvents) {
    if (settled.status === 'fulfilled') {
      processedEvents += 1
      continue
    }

    failedEvents += 1
    const reason = settled.reason
    lastError =
      reason instanceof Error ? reason.message : 'Webhook event processing failed'
    console.error('[webhook] event processing error', {
      error: reason,
    })
  }

  if (failedEvents > 0) {
    await Promise.allSettled(
      input.events.map(async (event, index) => {
        if (settledEvents[index]?.status === 'rejected') {
          await scheduleReplayForEvent(event)
        }
      })
    )
  }

  try {
    await finalizeWebhookAudit({
      id: input.auditId,
      processingStatus:
        failedEvents === 0
          ? 'PROCESSED'
          : processedEvents > 0
            ? 'PARTIAL_ERROR'
            : 'FAILED',
      processedEvents,
      failedEvents,
      error: lastError,
    })
  } catch (error) {
    console.error('[webhook] audit finalize failed', {
      auditId: input.auditId,
      error,
    })
  }
}

async function processEvent(event: ParsedFbEvent): Promise<void> {
  if (event.type === 'incoming_message') {
    await processIncomingInboxMessage({
      pageId: event.pageId,
      senderId: event.senderId,
      messageId: event.messageId,
      text: event.text,
      attachmentUrl: event.attachmentUrl,
      attachmentType: event.attachmentType,
      attachmentMimeType: event.attachmentMimeType,
      attachmentName: event.attachmentName,
      rawPayload: event.rawPayload,
      timestamp: event.timestamp,
      publishEvent: true,
    })
    return
  }

  if (event.type === 'outgoing_receipt') {
    const message = await findLatestOutgoingMessageForReceipt({
      threadId: event.threadId,
      watermark: event.watermark,
    })

    if (!message) {
      return
    }

    const outbox = await recordOutboxReceipt({
      fbMessageId: message.fbMessageId,
      state: event.receiptState === 'delivered' ? 'DELIVERED' : 'READ',
    })

    await publishInboxEvent({
      type: 'outgoing_status',
      jobId: outbox?.jobId ?? message.jobId ?? `receipt:${event.receiptState}:${message.fbMessageId}`,
      threadId: event.threadId,
      pageId: event.pageId,
      state: event.receiptState,
      text: message.text,
      attachmentUrl: message.attachmentUrl,
      attachmentType: getAttachmentTypeHint(message.attachmentUrl) ?? undefined,
      timestamp: event.timestamp.toISOString(),
      attempt: 0,
      clientMessageId: outbox?.clientMessageId ?? message.clientMessageId,
      conversationId: outbox?.conversationId ?? message.conversationId,
      messageId: outbox?.localMessageId ?? message.messageId,
      fbMessageId: message.fbMessageId,
    })
    return
  }

  await publishInboxEvent({
    type: 'post_comment',
    commentId: event.commentId,
    postId: event.postId,
    senderId: event.senderId,
    senderName: event.senderName,
    pageId: event.pageId,
    text: event.text,
    timestamp: event.timestamp.toISOString(),
  })
}

async function scheduleReplayForEvent(event: ParsedFbEvent): Promise<void> {
  if (event.type !== 'incoming_message') {
    return
  }

  try {
    await scheduleInboxReplayJob({
      type: 'incoming_message',
      pageId: event.pageId,
      senderId: event.senderId,
      fbMessageId: event.messageId,
      text: event.text,
      attachmentUrl: event.attachmentUrl,
      attachmentType: event.attachmentType,
      timestamp: event.timestamp.toISOString(),
    })
  } catch (error) {
    console.error('[webhook] replay enqueue failed', { event, error })
  }
}
