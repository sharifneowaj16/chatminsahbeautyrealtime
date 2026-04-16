import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getConfig } from '../config'
import {
  GraphApiError,
  replyToComment,
} from '../facebook/graph.client'
import { sendOutgoingNowOrQueue } from '../facebook/outgoing-retry'

export const replyRouter = Router()

interface OutgoingUnit {
  text: string
  attachmentUrl?: string
  attachmentType?: 'image' | 'video' | 'audio' | 'file'
}

const replySchema = z.object({
  type: z.enum(['messenger', 'comment']),
  recipientPsid: z.string().optional(),
  commentId: z.string().optional(),
  pageId: z.string().optional(),
  text: z.string().max(2000).default(''),
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'video', 'audio', 'file']),
        url: z.string().url(),
        fileName: z.string().optional(),
        mimeType: z.string().optional(),
        thumbnail: z.string().optional(),
      })
    )
    .default([]),
  agentId: z.string().min(1),
  clientMessageId: z.string().optional(),
})

replyRouter.post('/', async (req: Request, res: Response) => {
  if (req.headers['x-api-secret'] !== getConfig().REPLY_API_SECRET) {
    res.sendStatus(401)
    return
  }

  const parsed = replySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const pageId = parsed.data.pageId ?? getConfig().FB_PAGE_ID

  try {
    if (parsed.data.type === 'messenger') {
      if (!parsed.data.recipientPsid) {
        res.status(400).json({ error: 'recipientPsid required for messenger reply' })
        return
      }

      if (!parsed.data.text.trim() && parsed.data.attachments.length === 0) {
        res.status(400).json({ error: 'text or attachments required for messenger reply' })
        return
      }

      const outgoingUnits: OutgoingUnit[] = [
        ...(parsed.data.text.trim()
          ? [
              {
                text: parsed.data.text.trim(),
              },
            ]
          : []),
        ...parsed.data.attachments.map((attachment) => ({
          text: `[${attachment.type} attachment]`,
          attachmentUrl: attachment.url,
          attachmentType: attachment.type,
        })),
      ]

      let conversationId = ''
      let lastMessageId = ''
      const deliveries: Array<{
        queued: false
        recipientId: string
        messageId: string
        conversationId: string
        dbMessageId: string
        clientMessageId?: string
      }> = []
      const queuedDeliveries: Array<{
        queued: true
        jobId: string
        text: string
        attachmentType?: 'image' | 'video' | 'audio' | 'file'
        error: string
        clientMessageId?: string
      }> = []

      for (const [index, unit] of outgoingUnits.entries()) {
        const clientMessageId = parsed.data.clientMessageId
          ? `${parsed.data.clientMessageId}:${index}`
          : undefined
        const sendResult = await sendOutgoingNowOrQueue({
          pageId,
          customerPsid: parsed.data.recipientPsid,
          agentId: parsed.data.agentId,
          text: unit.text,
          attachmentUrl: unit.attachmentUrl,
          attachmentType: unit.attachmentType,
          clientMessageId,
        })

        if (sendResult.queued) {
          queuedDeliveries.push({
            queued: true,
            jobId: sendResult.jobId,
            text: unit.text,
            attachmentType: unit.attachmentType,
            error: sendResult.error,
            clientMessageId,
          })
          continue
        }

        conversationId = sendResult.conversationId || conversationId
        lastMessageId = sendResult.fbMessageId
        deliveries.push({
          queued: false,
          recipientId: sendResult.recipientId,
          messageId: sendResult.fbMessageId,
          conversationId: sendResult.conversationId,
          dbMessageId: sendResult.messageId,
          clientMessageId,
        })
      }

      res.status(queuedDeliveries.length > 0 ? 202 : 200).json({
        ok: true,
        queued: queuedDeliveries.length > 0,
        messageId: lastMessageId,
        conversationId,
        deliveries,
        queuedDeliveries,
      })
      return
    }

    if (!parsed.data.commentId) {
      res.status(400).json({ error: 'commentId required for comment reply' })
      return
    }

    if (parsed.data.attachments.length > 0) {
      res.status(400).json({ error: 'attachments are not supported for comment replies' })
      return
    }

    if (!parsed.data.text.trim()) {
      res.status(400).json({ error: 'text required for comment reply' })
      return
    }

    const { id } = await replyToComment(parsed.data.commentId, parsed.data.text.trim())
    res.json({ ok: true, replyId: id })
  } catch (error) {
    if (error instanceof GraphApiError) {
      console.error('[reply] Graph API error', error)
      res.status(502).json({ error: 'Graph API error', detail: error.message })
      return
    }

    console.error('[reply] unexpected error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
