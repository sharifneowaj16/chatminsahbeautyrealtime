import { NextRequest, NextResponse } from 'next/server'
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

function clampLimit(value: string | null, fallback = 200) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(parsed, 500)
}

async function getFacebookMessages(limit: number, unreadOnly: boolean) {
  const pageId = process.env.FACEBOOK_PAGE_ID

  const messages = await prisma.fbMessage.findMany({
    where: {
      ...(pageId ? { conversation: { pageId } } : {}),
    },
    include: {
      conversation: true,
    },
    orderBy: {
      timestamp: 'desc',
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

  const normalized = messages
    .map<InboxMessageRecord>((message) => ({
      id: message.id,
      platform: 'facebook',
      type: 'message',
      externalId: message.fbMessageId,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName:
        message.senderType === 'PAGE'
          ? 'Minsah Beauty'
          : message.conversation.customerName ?? message.conversation.customerPsid,
      senderAvatar: null,
      content: message.text,
      isRead: message.senderType === 'PAGE' || message.conversation.unreadCount === 0,
      timestamp: message.timestamp.toISOString(),
      isIncoming: message.senderType === 'CUSTOMER',
      attachments: [],
    }))
    .filter((message) => !unreadOnly || (message.isIncoming && !message.isRead))

  return {
    messages: normalized,
    unreadCount: unreadCountResult._sum.unreadCount ?? 0,
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const platform = searchParams.get('platform')
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = clampLimit(searchParams.get('limit'))

    if (platform === 'facebook') {
      const data = await getFacebookMessages(limit, unreadOnly)
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
    const { id, conversationId, platform, markAll } = await request.json()
    const pageId = process.env.FACEBOOK_PAGE_ID

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
