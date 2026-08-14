export type InstagramMessageType =
  | 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'STORY_REPLY'
  | 'COMMENT_PRIVATE_REPLY' | 'POSTBACK' | 'UNKNOWN';

export type InstagramAttachmentInput = {
  externalId?: string | null;
  type: InstagramMessageType;
  url?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  thumbnailUrl?: string | null;
};

export type NormalizedInstagramEvent = {
  eventKey: string;
  eventType: 'MESSAGE' | 'COMMENT';
  objectType: string;
  accountId: string;
  senderId: string;
  recipientId: string;
  conversationKey: string;
  platformMessageId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  messageType: InstagramMessageType;
  text: string | null;
  sentAt: string;
  replyToMessageId?: string | null;
  storyMediaId?: string | null;
  commentId?: string | null;
  postId?: string | null;
  participantUsername?: string | null;
  participantName?: string | null;
  attachments: InstagramAttachmentInput[];
  correlationId: string;
  payloadDigest: string;
};

export type InstagramReplyPolicyInput = {
  now: Date;
  accountMatches: boolean;
  permissionGranted: boolean;
  conversationStatus: string;
  lastInboundAt: Date | null;
  replyWindowExpiresAt?: Date | null;
  mode: 'MESSAGE' | 'PRIVATE_REPLY';
  privateReplyExpiresAt?: Date | null;
  privateReplySentAt?: Date | null;
};

export type InstagramReplyPolicyResult = {
  eligible: boolean;
  code:
    | 'ELIGIBLE' | 'WINDOW_EXPIRED' | 'PERMISSION_MISSING' | 'ACCOUNT_MISMATCH'
    | 'UNSUPPORTED' | 'CONVERSATION_CLOSED' | 'PRIVATE_REPLY_ALREADY_SENT';
  expiresAt: Date | null;
};
