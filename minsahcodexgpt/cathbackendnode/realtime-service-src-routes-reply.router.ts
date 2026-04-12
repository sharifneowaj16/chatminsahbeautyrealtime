import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getConfig } from '../config'
import {
  GraphApiError,
  replyToComment,
  sendMessengerReply,
} from '../facebook/graph.client'
import { saveOutgoingMessage } from '../db/repository'
import { publishInboxEvent } from '../realtime/pubsub'

export const replyRouter = Router()

const replySchema = z.object({
  type: z.enum(['messenger', 'comment']),
  recipientPsid: z.string().optional(),
  commentId: z.string().optional(),
  pageId: z.string().optional(),
  text: z.string().min(1).max(2000),
  agentId: z.string().min(1),
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

      const { messageId, recipientId } = await sendMessengerReply(
        parsed.data.recipientPsid,
        parsed.data.text
      )

      const { conversationId } = await saveOutgoingMessage(
        {
          fbMessageId: messageId,
          pageId,
          customerPsid: recipientId,
          text: parsed.data.text,
          timestamp: new Date(),
        },
        parsed.data.agentId
      )

      await publishInboxEvent({
        type: 'outgoing_message',
        conversationId,
        messageId,
        threadId: parsed.data.recipientPsid,
        text: parsed.data.text,
        senderType: 'PAGE',
        timestamp: new Date().toISOString(),
      })

      res.json({ ok: true, messageId, conversationId })
      return
    }

    if (!parsed.data.commentId) {
      res.status(400).json({ error: 'commentId required for comment reply' })
      return
    }

    const { id } = await replyToComment(parsed.data.commentId, parsed.data.text)
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
