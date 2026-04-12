import type { FbWebhookBody, ParsedFbEvent } from './types'

export function parseWebhookPayload(body: FbWebhookBody): ParsedFbEvent[] {
  if (body.object !== 'page') {
    return []
  }

  const events: ParsedFbEvent[] = []

  for (const entry of body.entry) {
    if (Array.isArray(entry.messaging)) {
      for (const event of entry.messaging) {
        if (event.message?.is_echo) continue
        if (event.delivery || event.read) continue

        if (event.message?.text) {
          events.push({
            type: 'incoming_message',
            pageId: entry.id,
            senderId: event.sender.id,
            recipientId: event.recipient.id,
            messageId: event.message.mid,
            text: event.message.text,
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
