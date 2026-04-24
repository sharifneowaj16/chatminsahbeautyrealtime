import type { FbAttachment, FbWebhookBody, ParsedFbEvent } from './types'
import { buildIncomingMessageParts } from './attachments'

export function parseWebhookPayload(body: FbWebhookBody): ParsedFbEvent[] {
  if (body.object !== 'page') {
    return []
  }

  const events: ParsedFbEvent[] = []

  for (const entry of body.entry) {
    if (Array.isArray(entry.messaging)) {
      for (const event of entry.messaging) {
        if (event.message?.is_echo) continue

        if (event.delivery?.watermark) {
          events.push({
            type: 'outgoing_receipt',
            pageId: entry.id,
            threadId: event.sender.id,
            receiptState: 'delivered',
            watermark: new Date(event.delivery.watermark),
            timestamp: new Date(event.timestamp),
          })
          continue
        }

        if (event.read?.watermark) {
          events.push({
            type: 'outgoing_receipt',
            pageId: entry.id,
            threadId: event.sender.id,
            receiptState: 'read',
            watermark: new Date(event.read.watermark),
            timestamp: new Date(event.timestamp),
          })
          continue
        }

        if (event.message?.mid) {
          const parts = buildIncomingMessageParts(
            event.message.mid,
            event.message.text,
            event.message.attachments as FbAttachment[] | undefined
          )

          for (const part of parts) {
            events.push({
              type: 'incoming_message',
              pageId: entry.id,
              senderId: event.sender.id,
              recipientId: event.recipient.id,
              messageId: part.messageId,
              text: part.text,
              attachmentUrl: part.attachmentUrl,
              attachmentType: part.attachmentType,
              attachmentMimeType: part.attachmentMimeType,
              attachmentName: part.attachmentName,
              rawPayload: event.message as unknown,
              timestamp: new Date(event.timestamp),
            })
          }
        }

        if (event.postback?.mid) {
          const title = event.postback.title?.trim()
          const payload = event.postback.payload?.trim()
          const text =
            title && payload
              ? `[postback] ${title} (${payload})`
              : title
                ? `[postback] ${title}`
                : payload
                  ? `[postback] ${payload}`
                  : '[postback]'

          events.push({
            type: 'incoming_message',
            pageId: entry.id,
            senderId: event.sender.id,
            recipientId: event.recipient.id,
            messageId: `${event.postback.mid}::postback`,
            text,
            rawPayload: event.postback as unknown,
            timestamp: new Date(event.timestamp),
          })
        }
      }
    }

    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (
          change.field === 'feed' &&
          change.value.item === 'comment' &&
          change.value.verb === 'add' &&
          change.value.comment_id &&
          change.value.post_id &&
          change.value.from &&
          change.value.message &&
          change.value.created_time
        ) {
          events.push({
            type: 'post_comment',
            pageId: entry.id,
            commentId: change.value.comment_id,
            postId: change.value.post_id,
            senderId: change.value.from.id,
            senderName: change.value.from.name,
            text: change.value.message,
            timestamp: new Date(change.value.created_time * 1000),
          })
        }
      }
    }
  }

  return events
}
