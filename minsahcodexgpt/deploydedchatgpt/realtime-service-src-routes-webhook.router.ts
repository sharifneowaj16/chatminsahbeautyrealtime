import { Router, type Request, type Response } from 'express'
import { getConfig } from '../config'
import { upsertConversationAndSaveMessage } from '../db/repository'
import { parseWebhookPayload } from '../facebook/events'
import { getMessengerProfile } from '../facebook/graph.client'
import { verifyFacebookSignature } from '../facebook/signature'
import type { FbWebhookBody, ParsedFbEvent } from '../facebook/types'
import { publishInboxEvent } from '../realtime/pubsub'

export const webhookRouter = Router()

webhookRouter.get('/facebook', (req: Request, res: Response) => {
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

webhookRouter.post('/facebook', async (req: Request, res: Response) => {
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

  for (const event of events) {
    try {
      await processEvent(event)
    } catch (error) {
      console.error('[webhook] event processing error', { event, error })
    }
  }

  res.status(200).json({ ok: true, processed: events.length })
})

async function processEvent(event: ParsedFbEvent): Promise<void> {
  if (event.type === 'incoming_message') {
    let customerName: string | undefined

    try {
      const profile = await getMessengerProfile(event.senderId)
      customerName = profile.name ?? undefined
    } catch (error) {
      console.warn('[webhook] profile lookup failed', error)
    }

    const result = await upsertConversationAndSaveMessage({
      fbMessageId: event.messageId,
      pageId: event.pageId,
      customerPsid: event.senderId,
      customerName,
      text: event.text,
      timestamp: event.timestamp,
    })

    await publishInboxEvent({
      type: 'new_message',
      conversationId: result.conversationId,
      messageId: result.messageId,
      threadId: event.senderId,
      pageId: event.pageId,
      text: event.text,
      timestamp: event.timestamp.toISOString(),
      isNew: result.isNew,
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
