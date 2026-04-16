export interface FbWebhookBody {
  object: 'page' | string
  entry: FbEntry[]
}

export interface FbEntry {
  id: string
  time: number
  messaging?: FbMessagingEvent[]
  changes?: FbChange[]
}

export interface FbMessagingEvent {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message?: {
    mid: string
    text?: string
    is_echo?: boolean
    attachments?: FbAttachment[]
  }
  postback?: {
    mid: string
    title: string
    payload: string
  }
  read?: { watermark: number }
  delivery?: { watermark: number }
}

export interface FbAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'location' | 'template'
  payload?: {
    url?: string
  }
  file_url?: string
  mime_type?: string
  name?: string
  image_data?: {
    url?: string
  }
  video_data?: {
    url?: string
  }
  audio_data?: {
    url?: string
  }
}

export interface FbChange {
  field: 'feed' | string
  value: FbFeedChangeValue
}

export interface FbFeedChangeValue {
  item: 'comment' | 'status' | 'photo' | string
  verb: 'add' | 'edited' | 'remove' | string
  comment_id?: string
  post_id?: string
  parent_id?: string
  from?: { id: string; name: string }
  message?: string
  created_time?: number
}

export type ParsedFbEvent =
  | ParsedIncomingMessage
  | ParsedOutgoingReceipt
  | ParsedPostComment

export interface ParsedIncomingMessage {
  type: 'incoming_message'
  pageId: string
  senderId: string
  recipientId: string
  messageId: string
  text: string
  attachmentUrl?: string
  attachmentType?: 'image' | 'video' | 'audio' | 'file'
  timestamp: Date
}

export interface ParsedPostComment {
  type: 'post_comment'
  pageId: string
  commentId: string
  postId: string
  senderId: string
  senderName: string
  text: string
  timestamp: Date
}

export interface ParsedOutgoingReceipt {
  type: 'outgoing_receipt'
  pageId: string
  threadId: string
  receiptState: 'delivered' | 'read'
  watermark: Date
  timestamp: Date
}

export type WsInboxEvent =
  | WsNewMessage
  | WsOutgoingMessage
  | WsOutgoingStatus
  | WsPostComment
  | WsConversationRead

export interface WsNewMessage {
  type: 'new_message'
  conversationId: string
  messageId: string
  threadId: string
  pageId: string
  senderName?: string
  text: string
  attachmentUrl?: string
  attachmentType?: 'image' | 'video' | 'audio' | 'file'
  timestamp: string
  isNew: boolean
}

export interface WsOutgoingMessage {
  type: 'outgoing_message'
  conversationId: string
  messageId: string
  threadId: string
  pageId: string
  text: string
  attachmentUrl?: string
  attachmentType?: 'image' | 'video' | 'audio' | 'file'
  senderType: 'PAGE'
  timestamp: string
}

export interface WsOutgoingStatus {
  type: 'outgoing_status'
  jobId: string
  threadId: string
  pageId: string
  state: 'queued' | 'retrying' | 'sent' | 'failed' | 'delivered' | 'read'
  text: string
  attachmentUrl?: string
  attachmentType?: 'image' | 'video' | 'audio' | 'file'
  timestamp: string
  attempt: number
  clientMessageId?: string
  conversationId?: string
  messageId?: string
  fbMessageId?: string
  error?: string
}

export interface WsPostComment {
  type: 'post_comment'
  commentId: string
  postId: string
  senderId: string
  senderName: string
  pageId: string
  text: string
  timestamp: string
}

export interface WsConversationRead {
  type: 'conversation_read'
  threadId: string
  conversationId: string
}
