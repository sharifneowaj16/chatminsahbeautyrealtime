import { NextRequest, NextResponse } from 'next/server'
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils'
import prisma from '@/lib/prisma'

type InboxMessageRecord = {
  id: string
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'youtube'
  type: 'comment' | 'message' | 'dm' | 'mention'
  externalId?: string | null
  conversationId?: string | null
  senderId?: string | null
  senderName?: string | null
  senderAvatar?: string | null
  content: string
  isRead: boolean
  timestamp: string
  isIncoming: boolean
  attachments?: Array<{
    id: string
    type: string
    mimeType?: string | null
    fileName?: string | null
    storageUrl?: string | null
    externalUrl?: string | null
    thumbnailUrl?: string | null
  }>
}

type InboxConversationRecord = {
  conversationId: string
  platform: 'facebook'
  participant: {
    id: string
    name: string
    avatar?: string | null
  }
  latestMessage: InboxMessageRecord
  unreadCount: number
  searchText: string
}

type ConversationCursor = {
  id: string
  lastMessageAt: string
}

type MessageCursor = {
  id: string
  timestamp: string
}

function getFacebookPageId() {
  return process.env.FACEBOOK_PAGE_ID ?? process.env.FB_PAGE_ID
}

function clampLimit(value: string | null, fallback = 300) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(parsed, 500)
}

function encodeConversationCursor(cursor: ConversationCursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeConversationCursor(value: string | null): ConversationCursor | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8')
    ) as Partial<ConversationCursor>

    if (!parsed.id || !parsed.lastMessageAt) {
      return null
    }

    const timestamp = new Date(parsed.lastMessageAt)
    if (Number.isNaN(timestamp.getTime())) {
      return null
    }

    return {
      id: parsed.id,
      lastMessageAt: timestamp.toISOString(),
    }
  } catch {
    return null
  }
}

function encodeMessageCursor(cursor: MessageCursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeMessageCursor(value: string | null): MessageCursor | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8')
    ) as Partial<MessageCursor>

    if (!parsed.id || !parsed.timestamp) {
      return null
    }

    const timestamp = new Date(parsed.timestamp)
    if (Number.isNaN(timestamp.getTime())) {
      return null
    }

    return {
      id: parsed.id,
      timestamp: timestamp.toISOString(),
    }
  } catch {
    return null
  }
}

function inferFacebookAttachmentType(
  text: string,
  attachmentUrl: string | null
): 'image' | 'video' | 'audio' | 'file' {
  const normalizedText = text.toLowerCase()
  const normalizedUrl = (attachmentUrl ?? '').toLowerCase()
  const hash = normalizedUrl.split('#')[1] ?? ''

  if (hash.includes('minsah-fb-type=image')) return 'image'
  if (hash.includes('minsah-fb-type=video')) return 'video'
  if (hash.includes('minsah-fb-type=audio')) return 'audio'
  if (hash.includes('minsah-fb-type=file')) return 'file'

  if (normalizedText.includes('image') && normalizedText.includes('attachment')) return 'image'
  if (normalizedText.includes('video') && normalizedText.includes('attachment')) return 'video'
  if (normalizedText.includes('audio') && normalizedText.includes('attachment')) return 'audio'

  if (
    normalizedUrl.includes('.jpg') ||
    normalizedUrl.includes('.jpeg') ||
    normalizedUrl.includes('.png') ||
    normalizedUrl.includes('.gif') ||
    normalizedUrl.includes('.webp')
  ) {
    return 'image'
  }

  if (
    normalizedUrl.includes('.mp4') ||
    normalizedUrl.includes('.mov') ||
    normalizedUrl.includes('.webm') ||
    normalizedUrl.includes('.mkv')
  ) {
    return 'video'
  }

  if (
    normalizedUrl.includes('.mp3') ||
    normalizedUrl.includes('.wav') ||
    normalizedUrl.includes('.ogg') ||
    normalizedUrl.includes('.m4a') ||
    normalizedUrl.includes('.aac')
  ) {
    return 'audio'
  }

  return 'file'
}

function mapFacebookMessageRecord(
  message: {
    id: string
    fbMessageId: string
    conversationId: string
    senderId: string
    senderType: 'PAGE' | 'CUSTOMER'
    text: string
    attachmentUrl: string | null
    attachmentType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | null
    attachmentMimeType: string | null
    attachmentName: string | null
    timestamp: Date
  },
  conversation: {
    customerName: string | null
    customerAvatar: string | null
    customerPsid: string
    unreadCount: number
  }
): InboxMessageRecord {
  const attachmentType =
    message.attachmentType
      ? message.attachmentType.toLowerCase()
      : inferFacebookAttachmentType(message.text, message.attachmentUrl)

  return {
    id: message.id,
    platform: 'facebook',
    type: 'message',
    externalId: message.fbMessageId,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName:
      message.senderType === 'PAGE'
        ? 'Minsah Beauty'
        : conversation.customerName ?? conversation.customerPsid,
    senderAvatar: message.senderType === 'PAGE' ? null : conversation.customerAvatar ?? null,
    content: message.text,
    isRead: message.senderType === 'PAGE' || conversation.unreadCount === 0,
    timestamp: message.timestamp.toISOString(),
    isIncoming: message.senderType === 'CUSTOMER',
    attachments: message.attachmentUrl
      ? [
          {
            id: `${message.id}-attachment`,
            type: attachmentType,
            mimeType: message.attachmentMimeType,
            fileName: message.attachmentName,
            storageUrl: message.attachmentUrl,
            externalUrl: message.attachmentUrl,
            thumbnailUrl: attachmentType === 'image' ? message.attachmentUrl : null,
          },
        ]
      : [],
  }
}

function mapFacebookConversationRecord(conversation: {
  id: string
  customerPsid: string
  customerName: string | null
  customerAvatar: string | null
  unreadCount: number
  messages: Array<{
    id: string
    fbMessageId: string
    conversationId: string
    senderId: string
    senderType: 'PAGE' | 'CUSTOMER'
    text: string
    attachmentUrl: string | null
    attachmentType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | null
    attachmentMimeType: string | null
    attachmentName: string | null
    timestamp: Date
  }>
}): InboxConversationRecord | null {
  const latest = conversation.messages[0]
  if (!latest) {
    return null
  }

  const latestMessage = mapFacebookMessageRecord(latest, conversation)

  return {
    conversationId: conversation.id,
    platform: 'facebook',
    participant: {
      id: conversation.customerPsid,
      name: conversation.customerName ?? conversation.customerPsid,
      avatar: conversation.customerAvatar ?? null,
    },
    latestMessage,
    unreadCount: conversation.unreadCount,
    searchText: [
      conversation.customerName ?? conversation.customerPsid,
      latestMessage.content,
      ...(latestMessage.attachments?.map(
        (attachment) =>
          attachment.fileName ?? attachment.mimeType ?? attachment.type
      ) ?? []),
    ]
      .join(' ')
      .toLowerCase(),
  }
}

async function getFacebookConversationThread(
  conversationId: string,
  unreadOnly: boolean,
  messageLimit: number,
  cursor: MessageCursor | null,
  includeUnreadSummary: boolean
) {
  const pageId = getFacebookPageId()

  const conversation = await prisma.fbConversation.findFirst({
    where: {
      id: conversationId,
      ...(pageId ? { pageId } : {}),
    },
    include: {
      messages: {
        where: cursor
          ? {
              OR: [
                {
                  timestamp: {
                    lt: new Date(cursor.timestamp),
                  },
                },
                {
                  timestamp: new Date(cursor.timestamp),
                  id: {
                    lt: cursor.id,
                  },
                },
              ],
            }
          : undefined,
        orderBy: [
          {
            timestamp: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        take: messageLimit,
      },
    },
  })

  const unreadCountResult = includeUnreadSummary
    ? await prisma.fbConversation.aggregate({
        where: {
          ...(pageId ? { pageId } : {}),
        },
        _sum: {
          unreadCount: true,
        },
      })
    : null

  if (!conversation) {
    return {
      messages: [],
      unreadCount: includeUnreadSummary ? (unreadCountResult?._sum.unreadCount ?? 0) : 0,
      conversation: null,
      pageInfo: {
        nextMessageCursor: null,
        hasMoreMessages: false,
      },
    }
  }

  const sortedMessages = [...conversation.messages].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime() ||
      right.id.localeCompare(left.id)
  )
  const hasMoreMessages = sortedMessages.length === messageLimit
  const oldestMessage = hasMoreMessages
    ? sortedMessages[sortedMessages.length - 1]
    : null

  const messages = [...sortedMessages]
    .reverse()
    .map((message) => mapFacebookMessageRecord(message, conversation))
    .filter((message) => !unreadOnly || (message.isIncoming && !message.isRead))

  return {
    messages,
    unreadCount: includeUnreadSummary ? (unreadCountResult?._sum.unreadCount ?? 0) : 0,
    conversation: mapFacebookConversationRecord({
      ...conversation,
      messages:
        conversation.messages.length > 0
          ? [conversation.messages[0]]
          : [],
    }),
    pageInfo: {
      nextMessageCursor: oldestMessage
        ? encodeMessageCursor({
            id: oldestMessage.id,
            timestamp: oldestMessage.timestamp.toISOString(),
          })
        : null,
      hasMoreMessages,
    },
  }
}

async function getFacebookMessages(limit: number, unreadOnly: boolean) {
  const pageId = getFacebookPageId()

  const conversations = await prisma.fbConversation.findMany({
    where: {
      ...(pageId ? { pageId } : {}),
      ...(unreadOnly ? { unreadCount: { gt: 0 } } : {}),
    },
    include: {
      messages: {
        orderBy: {
          timestamp: 'asc',
        },
      },
    },
    orderBy: {
      lastMessageAt: 'desc',
    },
    take: limit,
  })

  const unreadCountResult = await prisma.fbConversation.aggregate({
    where: {
      ...(pageId ? { pageId } : {}),
    },
    _sum: {
      unreadCount: true,
    },
  })

  const messages = conversations
    .flatMap((conversation) =>
      conversation.messages.map((message) =>
        mapFacebookMessageRecord(message, conversation)
      )
    )
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )
    .filter((message) => !unreadOnly || (message.isIncoming && !message.isRead))

  return {
    messages,
    unreadCount: unreadCountResult._sum.unreadCount ?? 0,
  }
}

async function getFacebookConversations(
  conversationLimit: number,
  unreadOnly: boolean,
  cursor: ConversationCursor | null
) {
  const pageId = getFacebookPageId()

  const where = {
    ...(pageId ? { pageId } : {}),
    ...(unreadOnly ? { unreadCount: { gt: 0 } } : {}),
    lastMessageAt: { not: null as Date | null },
    ...(cursor
      ? {
          OR: [
            {
              lastMessageAt: {
                lt: new Date(cursor.lastMessageAt),
              },
            },
            {
              lastMessageAt: new Date(cursor.lastMessageAt),
              id: {
                lt: cursor.id,
              },
            },
          ],
        }
      : {}),
  }

  const conversations = await prisma.fbConversation.findMany({
    where: {
      ...where,
    },
    include: {
      messages: {
        orderBy: {
          timestamp: 'desc',
        },
        take: 1,
      },
    },
    orderBy: [
      {
        lastMessageAt: 'desc',
      },
      {
        id: 'desc',
      },
    ],
    take: conversationLimit + 1,
  })

  const unreadCountResult = await prisma.fbConversation.aggregate({
    where: {
      ...(pageId ? { pageId } : {}),
    },
    _sum: {
      unreadCount: true,
    },
  })

  const hasMoreConversations = conversations.length > conversationLimit
  const pageConversations = conversations.slice(0, conversationLimit)
  const nextConversationCursor =
    hasMoreConversations && pageConversations.length > 0
      ? encodeConversationCursor({
          id: pageConversations[pageConversations.length - 1].id,
          lastMessageAt:
            pageConversations[pageConversations.length - 1].lastMessageAt!.toISOString(),
        })
      : null

  const normalizedConversations = pageConversations
    .map((conversation) => mapFacebookConversationRecord(conversation))
    .filter((conversation): conversation is InboxConversationRecord => Boolean(conversation))

  return {
    messages: [],
    conversations: normalizedConversations,
    unreadCount: unreadCountResult._sum.unreadCount ?? 0,
    pageInfo: {
      nextConversationCursor,
      hasMoreConversations,
    },
  }
}

async function getLegacyMessages(
  platform: string | null,
  unreadOnly: boolean,
  limit: number
) {
  const messages = await prisma.socialMessage.findMany({
    where: {
      ...(platform && platform !== 'all' ? { platform } : {}),
      ...(unreadOnly ? { isRead: false, isIncoming: true } : {}),
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      attachments: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  const unreadCount = await prisma.socialMessage.count({
    where: {
      ...(platform && platform !== 'all' ? { platform } : {}),
      isRead: false,
      isIncoming: true,
    },
  })

  return {
    messages: messages.map<InboxMessageRecord>((message) => ({
      id: message.id,
      platform: message.platform as InboxMessageRecord['platform'],
      type: message.type as InboxMessageRecord['type'],
      externalId: message.externalId,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      content: message.content,
      isRead: message.isRead,
      timestamp: message.timestamp.toISOString(),
      isIncoming: message.isIncoming,
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        type: attachment.type,
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
        storageUrl: attachment.storageUrl,
        externalUrl: attachment.externalUrl,
        thumbnailUrl: attachment.thumbnailUrl,
      })),
    })),
    unreadCount,
  }
}

async function getUnreadCountSummary(platform: string | null) {
  const pageId = getFacebookPageId()
  const includeFacebook = !platform || platform === 'all' || platform === 'facebook'
  const includeLegacy = !platform || platform === 'all' || platform !== 'facebook'
  const [facebookUnread, legacyUnread] = await Promise.all([
    prisma.fbConversation.aggregate({
      where: {
        ...(includeFacebook ? {} : { id: '__none__' }),
        ...(pageId ? { pageId } : {}),
      },
      _sum: {
        unreadCount: true,
      },
    }),
    prisma.socialMessage.count({
      where: {
        ...(includeLegacy
          ? platform && platform !== 'all' && platform !== 'facebook'
            ? { platform }
            : {}
          : { platform: '__none__' }),
        isRead: false,
        isIncoming: true,
      },
    }),
  ])

  return {
    unreadCount: (facebookUnread._sum.unreadCount ?? 0) + legacyUnread,
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getVerifiedAdmin(request)
    if (!admin) {
      return adminUnauthorizedResponse()
    }

    const { searchParams } = request.nextUrl
    const platform = searchParams.get('platform')
    const mode = searchParams.get('mode')
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = clampLimit(searchParams.get('limit'))
    const conversationLimit = clampLimit(searchParams.get('conversationLimit'), 40)
    const messageLimit = clampLimit(searchParams.get('messageLimit'), 250)
    const conversationId = searchParams.get('conversationId')
    const includeUnreadSummary = searchParams.get('unreadSummary') === 'true'
    const conversationCursor = decodeConversationCursor(
      searchParams.get('conversationCursor')
    )
    const messageCursor = decodeMessageCursor(searchParams.get('messageCursor'))

    if (mode === 'unread_count') {
      return NextResponse.json(await getUnreadCountSummary(platform))
    }

    if (mode === 'conversations') {
      const data = await getFacebookConversations(
        conversationLimit,
        unreadOnly,
        conversationCursor
      )
      return NextResponse.json({
        conversations: data.conversations,
        unreadCount: data.unreadCount,
        pageInfo: data.pageInfo,
      })
    }

    if (conversationId && (!platform || platform === 'facebook')) {
      const data = await getFacebookConversationThread(
        conversationId,
        unreadOnly,
        messageLimit,
        messageCursor,
        includeUnreadSummary
      )
      return NextResponse.json({
        messages: data.messages,
        unreadCount: data.unreadCount,
        conversation: data.conversation,
        pageInfo: data.pageInfo,
      })
    }

    if (platform === 'facebook') {
      const data = conversationId
        ? await getFacebookConversationThread(
            conversationId,
            unreadOnly,
            messageLimit,
            messageCursor,
            includeUnreadSummary
          )
        : await getFacebookConversations(
            conversationLimit,
            unreadOnly,
            conversationCursor
          )
      return NextResponse.json(data)
    }

    if (platform && platform !== 'all') {
      const data = await getLegacyMessages(platform, unreadOnly, limit)
      return NextResponse.json(data)
    }

    const [facebookData, legacyData] = await Promise.all([
      getFacebookMessages(limit, unreadOnly),
      getLegacyMessages(null, unreadOnly, limit),
    ])

    const combinedMessages = [...facebookData.messages, ...legacyData.messages]
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
      )
      .slice(0, limit)

    return NextResponse.json({
      messages: combinedMessages,
      unreadCount: facebookData.unreadCount + legacyData.unreadCount,
    })
  } catch (error) {
    console.error('[social/messages] GET failed', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getVerifiedAdmin(request)
    if (!admin) {
      return adminUnauthorizedResponse()
    }

    const { id, conversationId, platform, markAll } = await request.json()
    const pageId = getFacebookPageId()

    if (markAll) {
      if (!platform || platform === 'all' || platform === 'facebook') {
        await prisma.fbConversation.updateMany({
          where: {
            ...(pageId ? { pageId } : {}),
          },
          data: { unreadCount: 0 },
        })
      }

      if (!platform || platform === 'all' || platform !== 'facebook') {
        await prisma.socialMessage.updateMany({
          where: {
            ...(platform && platform !== 'all' && platform !== 'facebook'
              ? { platform }
              : {}),
            isRead: false,
            isIncoming: true,
          },
          data: { isRead: true },
        })
      }
    } else if (conversationId) {
      if (!platform || platform === 'facebook') {
        await prisma.fbConversation.updateMany({
          where: { id: conversationId },
          data: { unreadCount: 0 },
        })
      }

      if (!platform || platform !== 'facebook') {
        await prisma.socialMessage.updateMany({
          where: {
            conversationId,
            ...(platform && platform !== 'facebook' ? { platform } : {}),
            isRead: false,
            isIncoming: true,
          },
          data: { isRead: true },
        })
      }
    } else if (id) {
      await prisma.socialMessage.update({
        where: { id },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[social/messages] PATCH failed', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
