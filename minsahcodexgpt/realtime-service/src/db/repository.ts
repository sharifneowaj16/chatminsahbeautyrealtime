import { Prisma } from '../../prisma/generated/prisma/client'
import type { MessengerAttachmentType } from '../facebook/attachments'
import { prisma } from './client'

export interface SaveIncomingMessageInput {
  fbMessageId: string
  pageId: string
  customerPsid: string
  customerName?: string
  text: string
  attachmentUrl?: string
  timestamp: Date
}

export interface SaveOutgoingMessageInput {
  fbMessageId: string
  pageId: string
  customerPsid: string
  text: string
  attachmentUrl?: string
  timestamp: Date
}

export type DurableOutboxState =
  | 'PENDING'
  | 'QUEUED'
  | 'RETRYING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'

export type DeadLetterSource = 'REPLAY_QUEUE' | 'MEDIA_RETRY' | 'OUTGOING_RETRY'
export type DeadLetterStatus = 'OPEN' | 'REQUEUED' | 'RESOLVED'

function toDbAttachmentType(type: MessengerAttachmentType | undefined):
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'FILE'
  | undefined {
  if (!type) {
    return undefined
  }

  if (type === 'image') {
    return 'IMAGE'
  }

  if (type === 'video') {
    return 'VIDEO'
  }

  if (type === 'audio') {
    return 'AUDIO'
  }

  return 'FILE'
}

export async function upsertConversationAndSaveMessage(
  input: SaveIncomingMessageInput
): Promise<{
  conversationId: string
  messageId: string
  isNew: boolean
  isNewMessage: boolean
}> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingConversation = await tx.fbConversation.findUnique({
      where: { threadId: input.customerPsid },
      select: { id: true },
    })

    const existingMessage = await tx.fbMessage.findUnique({
      where: { fbMessageId: input.fbMessageId },
      select: { id: true },
    })

    const conversation = await tx.fbConversation.upsert({
      where: { threadId: input.customerPsid },
      update: {
        lastMessage: input.text,
        lastMessageAt: input.timestamp,
        unreadCount: existingMessage ? undefined : { increment: 1 },
        isReplied: false,
        ...(input.customerName ? { customerName: input.customerName } : {}),
      },
      create: {
        threadId: input.customerPsid,
        pageId: input.pageId,
        customerPsid: input.customerPsid,
        customerName: input.customerName ?? null,
        lastMessage: input.text,
        lastMessageAt: input.timestamp,
        unreadCount: existingMessage ? 0 : 1,
        isReplied: false,
      },
    })

    if (existingMessage) {
      return {
        conversationId: conversation.id,
        messageId: existingMessage.id,
        isNew: false,
        isNewMessage: false,
      }
    }

    const message = await tx.fbMessage.create({
      data: {
        fbMessageId: input.fbMessageId,
        conversationId: conversation.id,
        senderId: input.customerPsid,
        senderType: 'CUSTOMER',
        text: input.text,
        attachmentUrl: input.attachmentUrl ?? null,
        timestamp: input.timestamp,
      },
    })

    return {
      conversationId: conversation.id,
      messageId: message.id,
      isNew: !existingConversation,
      isNewMessage: true,
    }
  })
}

export async function saveOutgoingMessage(
  input: SaveOutgoingMessageInput,
  agentSenderId: string
): Promise<{ conversationId: string; messageId: string; isNewMessage: boolean }> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingMessage = await tx.fbMessage.findUnique({
      where: { fbMessageId: input.fbMessageId },
      select: { id: true },
    })

    const conversation = await tx.fbConversation.upsert({
      where: { threadId: input.customerPsid },
      update: {
        lastMessage: input.text,
        lastMessageAt: input.timestamp,
        isReplied: true,
      },
      create: {
        threadId: input.customerPsid,
        pageId: input.pageId,
        customerPsid: input.customerPsid,
        lastMessage: input.text,
        lastMessageAt: input.timestamp,
        unreadCount: 0,
        isReplied: true,
      },
    })

    if (existingMessage) {
      return {
        conversationId: conversation.id,
        messageId: existingMessage.id,
        isNewMessage: false,
      }
    }

    const message = await tx.fbMessage.create({
      data: {
        fbMessageId: input.fbMessageId,
        conversationId: conversation.id,
        senderId: agentSenderId,
        senderType: 'PAGE',
        text: input.text,
        attachmentUrl: input.attachmentUrl ?? null,
        timestamp: input.timestamp,
      },
    })

    return {
      conversationId: conversation.id,
      messageId: message.id,
      isNewMessage: true,
    }
  })
}

export async function markConversationRead(input: {
  conversationId?: string
  threadId?: string
}): Promise<{ conversationId: string; threadId: string } | null> {
  const conversation = input.conversationId
    ? await prisma.fbConversation.findUnique({
        where: { id: input.conversationId },
        select: { id: true, threadId: true },
      })
    : input.threadId
      ? await prisma.fbConversation.findUnique({
          where: { threadId: input.threadId },
          select: { id: true, threadId: true },
        })
      : null

  if (!conversation) {
    return null
  }

  await prisma.fbConversation.update({
    where: { id: conversation.id },
    data: { unreadCount: 0 },
  })

  return {
    conversationId: conversation.id,
    threadId: conversation.threadId,
  }
}

export async function updateMessageAttachmentUrlByFbMessageId(input: {
  fbMessageId: string
  attachmentUrl: string
}): Promise<{ messageId: string; conversationId: string } | null> {
  const message = await prisma.fbMessage.findUnique({
    where: { fbMessageId: input.fbMessageId },
    select: {
      id: true,
      conversationId: true,
      attachmentUrl: true,
    },
  })

  if (!message) {
    return null
  }

  if (message.attachmentUrl === input.attachmentUrl) {
    return {
      messageId: message.id,
      conversationId: message.conversationId,
    }
  }

  const updated = await prisma.fbMessage.update({
    where: { fbMessageId: input.fbMessageId },
    data: {
      attachmentUrl: input.attachmentUrl,
    },
    select: {
      id: true,
      conversationId: true,
    },
  })

  return {
    messageId: updated.id,
    conversationId: updated.conversationId,
  }
}

export async function createWebhookAudit(input: {
  pageId?: string
  rawBody: string
  payload?: Prisma.InputJsonValue
  signatureValid: boolean
  eventCount: number
}): Promise<{ id: string }> {
  const created = await prisma.fbWebhookAudit.create({
    data: {
      pageId: input.pageId ?? null,
      rawBody: input.rawBody,
      payload: input.payload,
      signatureValid: input.signatureValid,
      eventCount: input.eventCount,
      processingStatus: 'RECEIVED',
    },
    select: {
      id: true,
    },
  })

  return {
    id: created.id,
  }
}

export async function finalizeWebhookAudit(input: {
  id: string
  processingStatus: 'PROCESSED' | 'PARTIAL_ERROR' | 'FAILED'
  processedEvents: number
  failedEvents: number
  error?: string
}): Promise<void> {
  await prisma.fbWebhookAudit.update({
    where: {
      id: input.id,
    },
    data: {
      processingStatus: input.processingStatus,
      processedEvents: input.processedEvents,
      failedEvents: input.failedEvents,
      error: input.error ?? null,
      processedAt: new Date(),
    },
  })
}

export async function createOrUpdateDeadLetterJob(input: {
  source: DeadLetterSource
  dedupeKey: string
  jobType: string
  pageId?: string
  threadId?: string
  fbMessageId?: string
  outboxMessageId?: string
  attempts: number
  maxAttempts: number
  error?: string
  payload: Prisma.InputJsonValue
}): Promise<{ id: string }> {
  const existing = await prisma.fbDeadLetterJob.findUnique({
    where: {
      dedupeKey: input.dedupeKey,
    },
    select: {
      id: true,
    },
  })

  if (existing) {
    const updated = await prisma.fbDeadLetterJob.update({
      where: {
        dedupeKey: input.dedupeKey,
      },
      data: {
        source: input.source,
        jobType: input.jobType,
        pageId: input.pageId ?? null,
        threadId: input.threadId ?? null,
        fbMessageId: input.fbMessageId ?? null,
        outboxMessageId: input.outboxMessageId ?? null,
        status: 'OPEN',
        attempts: input.attempts,
        maxAttempts: input.maxAttempts,
        failureCount: {
          increment: 1,
        },
        lastError: input.error ?? null,
        payload: input.payload,
        lastFailedAt: new Date(),
        resolvedAt: null,
      },
      select: {
        id: true,
      },
    })

    return {
      id: updated.id,
    }
  }

  const created = await prisma.fbDeadLetterJob.create({
    data: {
      source: input.source,
      dedupeKey: input.dedupeKey,
      jobType: input.jobType,
      pageId: input.pageId ?? null,
      threadId: input.threadId ?? null,
      fbMessageId: input.fbMessageId ?? null,
      outboxMessageId: input.outboxMessageId ?? null,
      attempts: input.attempts,
      maxAttempts: input.maxAttempts,
      lastError: input.error ?? null,
      payload: input.payload,
    },
    select: {
      id: true,
    },
  })

  return {
    id: created.id,
  }
}

export async function resolveDeadLetterJobByDedupeKey(input: {
  dedupeKey: string
}): Promise<void> {
  await prisma.fbDeadLetterJob.updateMany({
    where: {
      dedupeKey: input.dedupeKey,
      status: {
        not: 'RESOLVED',
      },
    },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
  })
}

export async function markDeadLetterJobRequeued(input: { id: string }): Promise<void> {
  await prisma.fbDeadLetterJob.update({
    where: {
      id: input.id,
    },
    data: {
      status: 'REQUEUED',
      replayCount: {
        increment: 1,
      },
      lastRequeuedAt: new Date(),
    },
  })
}

export async function listDeadLetterJobs(input?: {
  status?: DeadLetterStatus
  limit?: number
}): Promise<
  Array<{
    id: string
    source: DeadLetterSource
    status: DeadLetterStatus
    jobType: string
    pageId?: string
    threadId?: string
    fbMessageId?: string
    outboxMessageId?: string
    attempts: number
    maxAttempts: number
    failureCount: number
    replayCount: number
    lastError?: string
    lastFailedAt: Date
    lastRequeuedAt?: Date
    resolvedAt?: Date
  }>
> {
  const jobs = await prisma.fbDeadLetterJob.findMany({
    where: input?.status
      ? {
          status: input.status,
        }
      : undefined,
    orderBy: {
      lastFailedAt: 'desc',
    },
    take: input?.limit ?? 50,
    select: {
      id: true,
      source: true,
      status: true,
      jobType: true,
      pageId: true,
      threadId: true,
      fbMessageId: true,
      outboxMessageId: true,
      attempts: true,
      maxAttempts: true,
      failureCount: true,
      replayCount: true,
      lastError: true,
      lastFailedAt: true,
      lastRequeuedAt: true,
      resolvedAt: true,
    },
  })

  return jobs.map((job) => ({
    id: job.id,
    source: job.source as DeadLetterSource,
    status: job.status as DeadLetterStatus,
    jobType: job.jobType,
    pageId: job.pageId ?? undefined,
    threadId: job.threadId ?? undefined,
    fbMessageId: job.fbMessageId ?? undefined,
    outboxMessageId: job.outboxMessageId ?? undefined,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    failureCount: job.failureCount,
    replayCount: job.replayCount,
    lastError: job.lastError ?? undefined,
    lastFailedAt: job.lastFailedAt,
    lastRequeuedAt: job.lastRequeuedAt ?? undefined,
    resolvedAt: job.resolvedAt ?? undefined,
  }))
}

export async function getDeadLetterJobById(input: {
  id: string
}): Promise<{
  id: string
  source: DeadLetterSource
  status: DeadLetterStatus
  jobType: string
  payload: Prisma.JsonValue
} | null> {
  const job = await prisma.fbDeadLetterJob.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      source: true,
      status: true,
      jobType: true,
      payload: true,
    },
  })

  if (!job) {
    return null
  }

  return {
    id: job.id,
    source: job.source as DeadLetterSource,
    status: job.status as DeadLetterStatus,
    jobType: job.jobType,
    payload: job.payload,
  }
}

export async function getDeadLetterSummary(): Promise<{
  total: number
  byStatus: {
    open: number
    requeued: number
    resolved: number
  }
  bySource: {
    replayQueue: number
    mediaRetry: number
    outgoingRetry: number
  }
}> {
  const [total, open, requeued, resolved, replayQueue, mediaRetry, outgoingRetry] =
    await Promise.all([
      prisma.fbDeadLetterJob.count(),
      prisma.fbDeadLetterJob.count({
        where: {
          status: 'OPEN',
        },
      }),
      prisma.fbDeadLetterJob.count({
        where: {
          status: 'REQUEUED',
        },
      }),
      prisma.fbDeadLetterJob.count({
        where: {
          status: 'RESOLVED',
        },
      }),
      prisma.fbDeadLetterJob.count({
        where: {
          source: 'REPLAY_QUEUE',
          status: {
            not: 'RESOLVED',
          },
        },
      }),
      prisma.fbDeadLetterJob.count({
        where: {
          source: 'MEDIA_RETRY',
          status: {
            not: 'RESOLVED',
          },
        },
      }),
      prisma.fbDeadLetterJob.count({
        where: {
          source: 'OUTGOING_RETRY',
          status: {
            not: 'RESOLVED',
          },
        },
      }),
    ])

  return {
    total,
    byStatus: {
      open,
      requeued,
      resolved,
    },
    bySource: {
      replayQueue,
      mediaRetry,
      outgoingRetry,
    },
  }
}

export async function createOrGetOutboxMessage(input: {
  outboxMessageId: string
  pageId: string
  customerPsid: string
  agentId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  clientMessageId?: string
}): Promise<{
  id: string
  state: DurableOutboxState
  fbMessageId?: string
  conversationId?: string
  localMessageId?: string
  clientMessageId?: string
  lastError?: string
}> {
  const existing = input.clientMessageId
    ? await prisma.fbOutboxMessage.findUnique({
        where: {
          clientMessageId: input.clientMessageId,
        },
        select: {
          id: true,
          state: true,
          fbMessageId: true,
          conversationId: true,
          localMessageId: true,
          clientMessageId: true,
          lastError: true,
        },
      })
    : await prisma.fbOutboxMessage.findUnique({
        where: {
          id: input.outboxMessageId,
        },
        select: {
          id: true,
          state: true,
          fbMessageId: true,
          conversationId: true,
          localMessageId: true,
          clientMessageId: true,
          lastError: true,
        },
      })

  if (existing) {
    return {
      id: existing.id,
      state: existing.state as DurableOutboxState,
      fbMessageId: existing.fbMessageId ?? undefined,
      conversationId: existing.conversationId ?? undefined,
      localMessageId: existing.localMessageId ?? undefined,
      clientMessageId: existing.clientMessageId ?? undefined,
      lastError: existing.lastError ?? undefined,
    }
  }

  const created = await prisma.fbOutboxMessage.create({
    data: {
      id: input.outboxMessageId,
      pageId: input.pageId,
      customerPsid: input.customerPsid,
      agentId: input.agentId,
      clientMessageId: input.clientMessageId ?? null,
      text: input.text,
      attachmentUrl: input.attachmentUrl ?? null,
      attachmentType: toDbAttachmentType(input.attachmentType),
      state: 'PENDING',
    },
    select: {
      id: true,
      state: true,
      fbMessageId: true,
      conversationId: true,
      localMessageId: true,
      clientMessageId: true,
      lastError: true,
    },
  })

  return {
    id: created.id,
    state: created.state as DurableOutboxState,
    fbMessageId: created.fbMessageId ?? undefined,
    conversationId: created.conversationId ?? undefined,
    localMessageId: created.localMessageId ?? undefined,
    clientMessageId: created.clientMessageId ?? undefined,
    lastError: created.lastError ?? undefined,
  }
}

export async function recordOutboxState(input: {
  outboxMessageId: string
  state: DurableOutboxState
  attempt: number
  fbMessageId?: string
  conversationId?: string
  localMessageId?: string
  error?: string
  metadata?: Prisma.InputJsonValue
}): Promise<{
  jobId: string
  clientMessageId?: string
  conversationId?: string
  localMessageId?: string
  fbMessageId?: string
}> {
  const now = new Date()
  const data: Prisma.FbOutboxMessageUpdateInput = {
    state: input.state,
    attempts: input.attempt,
    lastAttemptAt: now,
    lastError:
      input.state === 'SENT' || input.state === 'DELIVERED' || input.state === 'READ'
        ? null
        : input.error ?? undefined,
    fbMessageId: input.fbMessageId ?? undefined,
    conversationId: input.conversationId ?? undefined,
    localMessageId: input.localMessageId ?? undefined,
  }

  if (input.state === 'QUEUED') {
    data.queuedAt = now
  }

  if (input.state === 'SENT') {
    data.sentAt = now
    data.failedAt = null
  }

  if (input.state === 'DELIVERED') {
    data.deliveredAt = now
  }

  if (input.state === 'READ') {
    data.readAt = now
  }

  if (input.state === 'FAILED') {
    data.failedAt = now
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.fbOutboxMessage.update({
      where: {
        id: input.outboxMessageId,
      },
      data,
      select: {
        id: true,
        clientMessageId: true,
        conversationId: true,
        localMessageId: true,
        fbMessageId: true,
      },
    })

    await tx.fbOutboxStatusEvent.create({
      data: {
        outboxMessageId: input.outboxMessageId,
        state: input.state,
        attempt: input.attempt,
        fbMessageId: input.fbMessageId ?? updated.fbMessageId ?? null,
        conversationId: input.conversationId ?? updated.conversationId ?? null,
        localMessageId: input.localMessageId ?? updated.localMessageId ?? null,
        error: input.error ?? null,
        metadata: input.metadata,
      },
    })

    return {
      jobId: updated.id,
      clientMessageId: updated.clientMessageId ?? undefined,
      conversationId: updated.conversationId ?? undefined,
      localMessageId: updated.localMessageId ?? undefined,
      fbMessageId: updated.fbMessageId ?? undefined,
    }
  })
}

export async function linkOutboxToLocalMessage(input: {
  outboxMessageId: string
  conversationId: string
  localMessageId: string
}): Promise<void> {
  await prisma.fbOutboxMessage.update({
    where: {
      id: input.outboxMessageId,
    },
    data: {
      conversationId: input.conversationId,
      localMessageId: input.localMessageId,
    },
  })
}

export async function recordOutboxReceipt(input: {
  fbMessageId: string
  state: 'DELIVERED' | 'READ'
}): Promise<{
  jobId: string
  clientMessageId?: string
  conversationId?: string
  localMessageId?: string
} | null> {
  const existing = await prisma.fbOutboxMessage.findUnique({
    where: {
      fbMessageId: input.fbMessageId,
    },
    select: {
      id: true,
      attempts: true,
      clientMessageId: true,
      conversationId: true,
      localMessageId: true,
      state: true,
    },
  })

  if (!existing) {
    return null
  }

  const updated = await recordOutboxState({
    outboxMessageId: existing.id,
    state: input.state,
    attempt: Math.max(1, existing.attempts),
    fbMessageId: input.fbMessageId,
  })

  return {
    jobId: updated.jobId,
    clientMessageId: updated.clientMessageId,
    conversationId: updated.conversationId,
    localMessageId: updated.localMessageId,
  }
}

export async function findLatestOutgoingMessageForReceipt(input: {
  threadId: string
  watermark: Date
}): Promise<{
  jobId?: string
  clientMessageId?: string
  conversationId: string
  messageId: string
  fbMessageId: string
  text: string
  attachmentUrl?: string
} | null> {
  const message = await prisma.fbMessage.findFirst({
    where: {
      senderType: 'PAGE',
      timestamp: {
        lte: input.watermark,
      },
      conversation: {
        threadId: input.threadId,
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    select: {
      id: true,
      fbMessageId: true,
      text: true,
      attachmentUrl: true,
      conversationId: true,
    },
  })

  if (!message) {
    return null
  }

  const outbox = await prisma.fbOutboxMessage.findUnique({
    where: {
      fbMessageId: message.fbMessageId,
    },
    select: {
      id: true,
      clientMessageId: true,
    },
  })

  return {
    jobId: outbox?.id ?? undefined,
    clientMessageId: outbox?.clientMessageId ?? undefined,
    conversationId: message.conversationId,
    messageId: message.id,
    fbMessageId: message.fbMessageId,
    text: message.text,
    attachmentUrl: message.attachmentUrl ?? undefined,
  }
}
