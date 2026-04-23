import { getConfig } from '../config'
import {
  saveOutgoingMessage,
  updateConversationCustomerName,
  upsertConversationAndSaveMessage,
} from '../db/repository'
import { publishInboxEvent } from '../realtime/pubsub'
import type { MessengerAttachmentType } from './attachments'
import { getMessengerProfile } from './graph.client'
import { scheduleFacebookMediaRetry } from './media-retry'

export interface ProcessIncomingInboxMessageInput {
  pageId: string
  senderId: string
  messageId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  timestamp: Date
  customerName?: string
  publishEvent?: boolean
}

export interface ProcessOutgoingInboxMessageInput {
  pageId: string
  customerPsid: string
  messageId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  timestamp: Date
  publishEvent?: boolean
}

export async function processIncomingInboxMessage(
  input: ProcessIncomingInboxMessageInput
): Promise<{
  conversationId: string
  messageId: string
  isNew: boolean
  isNewMessage: boolean
  customerName?: string
  attachmentUrl?: string
}> {
  const customerName = input.customerName
  const storedAttachmentUrl = input.attachmentUrl

  // Keep webhook path hot: queue media persistence instead of blocking ingest.
  if (input.attachmentUrl && input.attachmentType) {
    void scheduleFacebookMediaRetry({
      fbMessageId: input.messageId,
      sourceUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      threadId: input.senderId,
      pageId: input.pageId,
      text: input.text,
      senderName: customerName,
      isIncoming: true,
    }).catch((error) => {
      console.warn('[inbox-processor] media retry enqueue failed', {
        messageId: input.messageId,
        error,
      })
    })
  }

  const saved = await upsertConversationAndSaveMessage({
    fbMessageId: input.messageId,
    pageId: input.pageId,
    customerPsid: input.senderId,
    customerName,
    text: input.text,
    attachmentUrl: storedAttachmentUrl,
    timestamp: input.timestamp,
  })

  if (!customerName) {
    void hydrateCustomerName({
      senderId: input.senderId,
    })
  }

  if (input.publishEvent && saved.isNewMessage) {
    await publishInboxEvent({
      type: 'new_message',
      conversationId: saved.conversationId,
      messageId: saved.messageId,
      threadId: input.senderId,
      pageId: input.pageId,
      senderName: customerName,
      text: input.text,
      attachmentUrl: storedAttachmentUrl,
      attachmentType: input.attachmentType,
      timestamp: input.timestamp.toISOString(),
      isNew: saved.isNew,
    })
  }

  return {
    conversationId: saved.conversationId,
    messageId: saved.messageId,
    isNew: saved.isNew,
    isNewMessage: saved.isNewMessage,
    customerName,
    attachmentUrl: storedAttachmentUrl,
  }
}

async function hydrateCustomerName(input: { senderId: string }): Promise<void> {
  try {
    const profile = await getMessengerProfile(input.senderId)
    if (!profile.name) {
      return
    }

    await updateConversationCustomerName({
      threadId: input.senderId,
      customerName: profile.name,
    })
  } catch (error) {
    console.warn('[inbox-processor] async profile hydration failed', {
      senderId: input.senderId,
      error,
    })
  }
}

export async function processOutgoingInboxMessage(
  input: ProcessOutgoingInboxMessageInput
): Promise<{
  conversationId: string
  messageId: string
  isNewMessage: boolean
}> {
  const saved = await saveOutgoingMessage(
    {
      fbMessageId: input.messageId,
      pageId: input.pageId,
      customerPsid: input.customerPsid,
      text: input.text,
      attachmentUrl: input.attachmentUrl,
      timestamp: input.timestamp,
    },
    getConfig().FB_PAGE_ID
  )

  if (input.publishEvent && saved.isNewMessage) {
    await publishInboxEvent({
      type: 'outgoing_message',
      conversationId: saved.conversationId,
      messageId: saved.messageId,
      threadId: input.customerPsid,
      pageId: input.pageId,
      text: input.text,
      attachmentUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      senderType: 'PAGE',
      timestamp: input.timestamp.toISOString(),
    })
  }

  return saved
}
