import { NextRequest, NextResponse } from 'next/server'
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils'
import prisma from '@/lib/prisma'
import { createAndPublishSocialRealtimeEvent } from '@/lib/meta-platform/realtime/social-events'
import { getFacebookInboxRuntimeMode } from '@/lib/meta-platform/domains/facebook/feature-flags'

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



type NormalizedSocialMessageRow = {
  id: string
  platform: string
  type: string
  externalId: string | null
  conversationId: string | null
  senderId: string | null
  senderName: string | null
  senderAvatar: string | null
  content: string
  isRead: boolean
  timestamp: Date
  isIncoming: boolean
  attachments: Array<{
    id: string
    type: string
    mimeType: string | null
    fileName: string | null
    storageUrl: string | null
    externalUrl: string | null
    thumbnailUrl: string | null
  }>
}

function mapNormalizedSocialMessage(message: NormalizedSocialMessageRow): InboxMessageRecord {
  return {
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
  }
}

async function getNormalizedFacebookConversationThread(
  conversationId: string,
  unreadOnly: boolean,
  messageLimit: number,
  cursor: MessageCursor | null,
  includeUnreadSummary: boolean
) {
  const rows = await prisma.socialMessage.findMany({
    where: {
      platform: 'facebook',
      conversationId,
      ...(unreadOnly ? { isRead: false, isIncoming: true } : {}),
      ...(cursor ? {
        OR: [
          { timestamp: { lt: new Date(cursor.timestamp) } },
          { timestamp: new Date(cursor.timestamp), id: { lt: cursor.id } },
        ],
      } : {}),
    },
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take: messageLimit + 1,
    include: { attachments: { orderBy: { createdAt: 'asc' } } },
  })
  const hasMoreMessages = rows.length > messageLimit
  const pageRows = rows.slice(0, messageLimit)
  const oldest = hasMoreMessages ? pageRows[pageRows.length - 1] : null
  const participant = [...pageRows].find((message) => message.isIncoming) ?? pageRows[pageRows.length - 1] ?? null
  const latest = pageRows[0] ?? null
  const unreadCount = includeUnreadSummary
    ? await prisma.socialMessage.count({ where: { platform: 'facebook', isIncoming: true, isRead: false } })
    : 0
  return {
    messages: [...pageRows].reverse().map((message) => mapNormalizedSocialMessage(message as NormalizedSocialMessageRow)),
    unreadCount,
    conversation: latest ? {
      conversationId,
      platform: 'facebook' as const,
      participant: {
        id: participant?.senderId ?? conversationId,
        name: participant?.senderName ?? participant?.senderId ?? conversationId,
        avatar: participant?.senderAvatar ?? null,
      },
      latestMessage: mapNormalizedSocialMessage(latest as NormalizedSocialMessageRow),
      unreadCount: await prisma.socialMessage.count({ where: { platform: 'facebook', conversationId, isIncoming: true, isRead: false } }),
      searchText: `${participant?.senderName ?? ''} ${latest.content}`.toLowerCase(),
    } : null,
    pageInfo: {
      nextMessageCursor: oldest ? encodeMessageCursor({ id: oldest.id, timestamp: oldest.timestamp.toISOString() }) : null,
      hasMoreMessages,
    },
  }
}

async function getNormalizedFacebookConversations(
  conversationLimit: number,
  unreadOnly: boolean,
  cursor: ConversationCursor | null
) {
  const unreadGroups = await prisma.socialMessage.groupBy({
    by: ['conversationId'],
    where: { platform: 'facebook', conversationId: { not: null }, isIncoming: true, isRead: false },
    _count: { _all: true },
  })
  const unreadByConversation = new Map(unreadGroups.flatMap((row) => row.conversationId ? [[row.conversationId, row._count._all] as const] : []))
  const unreadConversationIds = [...unreadByConversation.keys()]
  const latestRows = await prisma.socialMessage.findMany({
    where: {
      platform: 'facebook',
      conversationId: { not: null },
      ...(unreadOnly ? { conversationId: { in: unreadConversationIds } } : {}),
      ...(cursor ? {
        OR: [
          { timestamp: { lt: new Date(cursor.lastMessageAt) } },
          { timestamp: new Date(cursor.lastMessageAt), id: { lt: cursor.id } },
        ],
      } : {}),
    },
    distinct: ['conversationId'],
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take: conversationLimit + 1,
    include: { attachments: { orderBy: { createdAt: 'asc' } } },
  })
  const hasMoreConversations = latestRows.length > conversationLimit
  const pageRows = latestRows.slice(0, conversationLimit)
  const ids = pageRows.flatMap((row) => row.conversationId ? [row.conversationId] : [])
  const participantRows = ids.length ? await prisma.socialMessage.findMany({
    where: { platform: 'facebook', conversationId: { in: ids }, isIncoming: true },
    distinct: ['conversationId'],
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
  }) : []
  const participantByConversation = new Map(participantRows.flatMap((row) => row.conversationId ? [[row.conversationId, row] as const] : []))
  const conversations: InboxConversationRecord[] = pageRows.flatMap((row) => {
    if (!row.conversationId) return []
    const participant = participantByConversation.get(row.conversationId) ?? row
    const latestMessage = mapNormalizedSocialMessage(row as NormalizedSocialMessageRow)
    return [{
      conversationId: row.conversationId,
      platform: 'facebook' as const,
      participant: {
        id: participant.senderId ?? row.conversationId,
        name: participant.senderName ?? participant.senderId ?? row.conversationId,
        avatar: participant.senderAvatar ?? null,
      },
      latestMessage,
      unreadCount: unreadByConversation.get(row.conversationId) ?? 0,
      searchText: `${participant.senderName ?? ''} ${row.content}`.toLowerCase(),
    }]
  })
  const last = pageRows[pageRows.length - 1]
  return {
    messages: [],
    conversations,
    unreadCount: unreadGroups.reduce((sum, row) => sum + row._count._all, 0),
    pageInfo: {
      nextConversationCursor: hasMoreConversations && last
        ? encodeConversationCursor({ id: last.id, lastMessageAt: last.timestamp.toISOString() })
        : null,
      hasMoreConversations,
    },
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
    messages: messages.map((message) => mapNormalizedSocialMessage(message as NormalizedSocialMessageRow)),
    unreadCount,
  }
}

async function getUnreadCountSummary(platform: string | null, useLegacyFacebook: boolean) {
  if (!useLegacyFacebook) {
    return {
      unreadCount: await prisma.socialMessage.count({
        where: {
          ...(platform && platform !== 'all' ? { platform } : {}),
          isRead: false,
          isIncoming: true,
        },
      }),
    }
  }

  const pageId = getFacebookPageId()
  const includeFacebook = !platform || platform === 'all' || platform === 'facebook'
  const includeNormalized = !platform || platform === 'all' || platform !== 'facebook'
  const [facebookUnread, normalizedUnread] = await Promise.all([
    prisma.fbConversation.aggregate({
      where: {
        ...(includeFacebook ? {} : { id: '__none__' }),
        ...(pageId ? { pageId } : {}),
      },
      _sum: { unreadCount: true },
    }),
    prisma.socialMessage.count({
      where: {
        ...(includeNormalized
          ? platform && platform !== 'all' && platform !== 'facebook' ? { platform } : { platform: { not: 'facebook' } }
          : { platform: '__none__' }),
        isRead: false,
        isIncoming: true,
      },
    }),
  ])
  return { unreadCount: (facebookUnread._sum.unreadCount ?? 0) + normalizedUnread }
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
    const useLegacyFacebook = getFacebookInboxRuntimeMode(process.env) === 'LEGACY_ROLLBACK'

    if (mode === 'unread_count') {
      return NextResponse.json(await getUnreadCountSummary(platform, useLegacyFacebook))
    }

    if (mode === 'conversations') {
      const data = useLegacyFacebook
        ? await getFacebookConversations(conversationLimit, unreadOnly, conversationCursor)
        : await getNormalizedFacebookConversations(conversationLimit, unreadOnly, conversationCursor)
      return NextResponse.json({
        conversations: data.conversations,
        unreadCount: data.unreadCount,
        pageInfo: data.pageInfo,
      })
    }

    if (conversationId && (!platform || platform === 'facebook')) {
      const data = useLegacyFacebook
        ? await getFacebookConversationThread(conversationId, unreadOnly, messageLimit, messageCursor, includeUnreadSummary)
        : await getNormalizedFacebookConversationThread(conversationId, unreadOnly, messageLimit, messageCursor, includeUnreadSummary)
      return NextResponse.json({
        messages: data.messages,
        unreadCount: data.unreadCount,
        conversation: data.conversation,
        pageInfo: data.pageInfo,
      })
    }

    if (platform === 'facebook') {
      const data = conversationId
        ? (useLegacyFacebook
            ? await getFacebookConversationThread(conversationId, unreadOnly, messageLimit, messageCursor, includeUnreadSummary)
            : await getNormalizedFacebookConversationThread(conversationId, unreadOnly, messageLimit, messageCursor, includeUnreadSummary))
        : (useLegacyFacebook
            ? await getFacebookConversations(conversationLimit, unreadOnly, conversationCursor)
            : await getNormalizedFacebookConversations(conversationLimit, unreadOnly, conversationCursor))
      return NextResponse.json(data)
    }

    if (platform && platform !== 'all') {
      const data = await getLegacyMessages(platform, unreadOnly, limit)
      return NextResponse.json(data)
    }

    if (!useLegacyFacebook) {
      const data = await getLegacyMessages(null, unreadOnly, limit)
      return NextResponse.json(data)
    }

    const [facebookData, normalizedData] = await Promise.all([
      getFacebookMessages(limit, unreadOnly),
      getLegacyMessages(null, unreadOnly, limit),
    ])
    const nonFacebook = normalizedData.messages.filter((message) => message.platform !== 'facebook')
    return NextResponse.json({
      messages: [...facebookData.messages, ...nonFacebook]
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
        .slice(0, limit),
      unreadCount: facebookData.unreadCount + normalizedData.unreadCount,
    })

  } catch (error) {
    console.error('[social/messages] GET failed', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getVerifiedAdmin(request)
    if (!admin) return adminUnauthorizedResponse()

    const body = await request.json() as {
      id?: string
      conversationId?: string
      platform?: string
      markAll?: boolean
    }
    const { id, conversationId, platform, markAll } = body
    const pageId = getFacebookPageId()
    let eventConversationId: string | null = conversationId ?? null
    let eventMessageId: string | null = id ?? null
    let eventPlatform: 'facebook' | 'instagram' = platform === 'instagram' ? 'instagram' : 'facebook'

    if (markAll) {
      if ((!platform || platform === 'all' || platform === 'facebook')
        && getFacebookInboxRuntimeMode(process.env) === 'LEGACY_ROLLBACK') {
        await prisma.fbConversation.updateMany({
          where: { ...(pageId ? { pageId } : {}) },
          data: { unreadCount: 0 },
        })
      }
      await prisma.socialMessage.updateMany({
        where: {
          ...(platform && platform !== 'all' ? { platform } : {}),
          isRead: false,
          isIncoming: true,
        },
        data: { isRead: true },
      })
      eventConversationId = null
      eventMessageId = null
    } else if (conversationId) {
      if ((!platform || platform === 'facebook')
        && getFacebookInboxRuntimeMode(process.env) === 'LEGACY_ROLLBACK') {
        await prisma.fbConversation.updateMany({ where: { id: conversationId }, data: { unreadCount: 0 } })
      }
      await prisma.socialMessage.updateMany({
        where: {
          conversationId,
          ...(platform && platform !== 'all' ? { platform } : {}),
          isRead: false,
          isIncoming: true,
        },
        data: { isRead: true },
      })
    } else if (id) {
      const updated = await prisma.socialMessage.update({
        where: { id },
        data: { isRead: true },
        select: { id: true, conversationId: true, platform: true },
      })
      eventConversationId = updated.conversationId
      eventMessageId = updated.id
      eventPlatform = updated.platform === 'instagram' ? 'instagram' : 'facebook'
    }

    await createAndPublishSocialRealtimeEvent({
      type: 'SOCIAL_CONVERSATION_READ',
      platform: eventPlatform,
      correlationId: `social-read:${admin.adminId}:${Date.now()}`,
      orderingKey: eventConversationId ?? `social-read:${eventPlatform}:all`,
      conversationId: eventConversationId,
      messageId: eventMessageId,
      state: markAll ? 'ALL_READ' : 'READ',
    }).catch((error) => console.error('[social/messages] realtime publish failed', error))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[social/messages] PATCH failed', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
