import { getConfig } from '../config'
import { prisma } from '../db/client'
import { acquireDistributedLock } from '../realtime/distributed-lock'
import { buildIncomingMessageParts } from './attachments'
import { processIncomingInboxMessage, processOutgoingInboxMessage } from './inbox-processor'
import { scheduleInboxReplayJob } from './replay-queue'
import { getCurrentPageToken } from './token-health'

interface FacebookParticipant {
  id: string
  name?: string
}

interface FacebookMessage {
  id: string
  message?: string
  from: {
    id: string
  }
  created_time: string
  attachments?: {
    data?: FacebookAttachment[]
  }
}

interface FacebookAttachment {
  type?: string
  payload?: {
    url?: string
  }
  file_url?: string
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

interface FacebookConversation {
  id: string
  participants?: {
    data?: FacebookParticipant[]
  }
}

interface GraphPage<T> {
  data?: T[]
  paging?: {
    next?: string
  }
}

export interface SyncFacebookInboxOptions {
  mode?: 'full' | 'incremental'
  publishEvents?: boolean
  reason?: string
}

export interface SyncFacebookInboxResult {
  synced: number
  conversations: number
  scannedMessages: number
  mode: 'full' | 'incremental'
  reason: string
  startedAt: string
  finishedAt: string
}

let activeSync: Promise<SyncFacebookInboxResult> | null = null
let lastSyncStatus: {
  active: boolean
  lastStartedAt?: string
  lastFinishedAt?: string
  lastSuccessfulAt?: string
  lastMode?: 'full' | 'incremental'
  lastReason?: string
  lastResult?: SyncFacebookInboxResult
  lastError?: string
} = {
  active: false,
}

function getGraphApiBase(): string {
  const config = getConfig()
  return `https://graph.facebook.com/${config.FB_GRAPH_API_VERSION}`
}

async function fetchGraphPage<T>(url: string, accessToken: string): Promise<GraphPage<T>> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Facebook Graph API request failed with status ${response.status}`)
  }

  return (await response.json()) as GraphPage<T>
}

async function fetchAllConversations(accessToken: string): Promise<FacebookConversation[]> {
  const config = getConfig()
  const conversations: FacebookConversation[] = []
  let url =
    `${getGraphApiBase()}/${config.FB_PAGE_ID}/conversations` +
    `?fields=id,participants` +
    `&limit=100`

  while (url) {
    const page = await fetchGraphPage<FacebookConversation>(url, accessToken)
    conversations.push(...(page.data ?? []))
    url = page.paging?.next ?? ''
  }

  return conversations
}

async function fetchAllMessages(
  conversationId: string,
  accessToken: string,
  since: Date | null,
  overlapMs: number
): Promise<FacebookMessage[]> {
  const messages: FacebookMessage[] = []
  const sinceSeconds =
    since !== null ? Math.max(0, Math.floor((since.getTime() - overlapMs) / 1000)) : null
  const sinceQuery = sinceSeconds !== null ? `&since=${sinceSeconds}` : ''
  let url =
    `${getGraphApiBase()}/${conversationId}/messages` +
    `?fields=id,message,from,created_time,attachments{type,payload,file_url,image_data,video_data,audio_data}` +
    `&limit=100${sinceQuery}`

  while (url) {
    const page = await fetchGraphPage<FacebookMessage>(url, accessToken)
    messages.push(...(page.data ?? []))
    url = page.paging?.next ?? ''
  }

  return messages
}

async function getConversationCursors(threadIds: string[]): Promise<Map<string, Date>> {
  if (threadIds.length === 0) {
    return new Map()
  }

  const conversations = await prisma.fbConversation.findMany({
    where: {
      threadId: {
        in: threadIds,
      },
    },
    select: {
      threadId: true,
      lastMessageAt: true,
    },
  })

  return new Map(
    conversations
      .filter(
        (conversation): conversation is { threadId: string; lastMessageAt: Date } =>
          Boolean(conversation.lastMessageAt)
      )
      .map((conversation) => [conversation.threadId, conversation.lastMessageAt])
  )
}

function buildSyncResult(input: {
  synced: number
  conversations: number
  scannedMessages: number
  mode: 'full' | 'incremental'
  reason: string
  startedAt: Date
}): SyncFacebookInboxResult {
  return {
    synced: input.synced,
    conversations: input.conversations,
    scannedMessages: input.scannedMessages,
    mode: input.mode,
    reason: input.reason,
    startedAt: input.startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  }
}

async function enqueueReplayJobForSync(input: {
  pageId: string
  customerPsid: string
  customerName?: string
  fbMessageId: string
  text: string
  attachmentUrl?: string
  attachmentType?: 'image' | 'video' | 'audio' | 'file'
  timestamp: Date
  isOutgoing: boolean
}): Promise<void> {
  try {
    if (input.isOutgoing) {
      await scheduleInboxReplayJob({
        type: 'outgoing_message',
        pageId: input.pageId,
        customerPsid: input.customerPsid,
        fbMessageId: input.fbMessageId,
        text: input.text,
        attachmentUrl: input.attachmentUrl,
        attachmentType: input.attachmentType,
        timestamp: input.timestamp.toISOString(),
      })
      return
    }

    await scheduleInboxReplayJob({
      type: 'incoming_message',
      pageId: input.pageId,
      senderId: input.customerPsid,
      customerName: input.customerName,
      fbMessageId: input.fbMessageId,
      text: input.text,
      attachmentUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      timestamp: input.timestamp.toISOString(),
    })
  } catch (error) {
    console.error('[sync/facebook] replay enqueue failed', {
      customerPsid: input.customerPsid,
      fbMessageId: input.fbMessageId,
      error,
    })
  }
}

async function runFacebookInboxSync(
  options: SyncFacebookInboxOptions,
  startedAt: Date
): Promise<SyncFacebookInboxResult> {
  const config = getConfig()
  const accessToken = getCurrentPageToken()
  const mode = options.mode ?? 'incremental'
  const publishEvents = options.publishEvents ?? mode === 'incremental'
  const reason = options.reason ?? mode

  const conversations = await fetchAllConversations(accessToken)
  const customerThreadIds = conversations
    .map((conversation) =>
      conversation.participants?.data?.find((participant) => participant.id !== config.FB_PAGE_ID)?.id
    )
    .filter((threadId): threadId is string => Boolean(threadId))
  const cursorByThreadId =
    mode === 'incremental' ? await getConversationCursors(customerThreadIds) : new Map<string, Date>()

  let newMessages = 0
  let scannedMessages = 0

  for (const conversation of conversations) {
    const customer = conversation.participants?.data?.find(
      (participant) => participant.id !== config.FB_PAGE_ID
    )

    if (!customer) {
      continue
    }

    let customerName = customer.name
    let messages: FacebookMessage[]

    try {
      messages = await fetchAllMessages(
        conversation.id,
        accessToken,
        cursorByThreadId.get(customer.id) ?? null,
        config.FB_SYNC_MESSAGE_OVERLAP_MS
      )
    } catch (error) {
      console.error('[sync/facebook] conversation fetch failed', {
        conversationId: conversation.id,
        customerPsid: customer.id,
        error,
      })
      continue
    }

    messages.sort(
      (left, right) =>
        new Date(left.created_time).getTime() - new Date(right.created_time).getTime()
    )

    for (const message of messages) {
      scannedMessages += 1

      const timestamp = new Date(message.created_time)
      const parts = buildIncomingMessageParts(
        message.id,
        message.message,
        message.attachments?.data
      )

      for (const part of parts) {
        try {
          if (message.from.id === config.FB_PAGE_ID) {
            const saved = await processOutgoingInboxMessage({
              pageId: config.FB_PAGE_ID,
              customerPsid: customer.id,
              messageId: part.messageId,
              text: part.text,
              attachmentUrl: part.attachmentUrl,
              attachmentType: part.attachmentType,
              timestamp,
              publishEvent: publishEvents,
            })

            if (saved.isNewMessage) {
              newMessages += 1
            }

            continue
          }

          const saved = await processIncomingInboxMessage({
            pageId: config.FB_PAGE_ID,
            senderId: customer.id,
            messageId: part.messageId,
            text: part.text,
            attachmentUrl: part.attachmentUrl,
            attachmentType: part.attachmentType,
            timestamp,
            customerName,
            publishEvent: publishEvents,
          })

          if (saved.customerName && !customerName) {
            customerName = saved.customerName
          }

          if (saved.isNewMessage) {
            newMessages += 1
          }
        } catch (error) {
          console.error('[sync/facebook] message processing failed', {
            conversationId: conversation.id,
            customerPsid: customer.id,
            fbMessageId: part.messageId,
            error,
          })

          await enqueueReplayJobForSync({
            pageId: config.FB_PAGE_ID,
            customerPsid: customer.id,
            customerName,
            fbMessageId: part.messageId,
            text: part.text,
            attachmentUrl: part.attachmentUrl,
            attachmentType: part.attachmentType,
            timestamp,
            isOutgoing: message.from.id === config.FB_PAGE_ID,
          })
        }
      }
    }
  }

  return buildSyncResult({
    synced: newMessages,
    conversations: conversations.length,
    scannedMessages,
    mode,
    reason,
    startedAt,
  })
}

export async function syncFacebookInbox(
  options: SyncFacebookInboxOptions = {}
): Promise<SyncFacebookInboxResult> {
  if (activeSync) {
    return activeSync
  }

  const startedAt = new Date()
  const config = getConfig()
  const mode = options.mode ?? 'incremental'
  const reason = options.reason ?? mode
  lastSyncStatus = {
    ...lastSyncStatus,
    active: true,
    lastStartedAt: startedAt.toISOString(),
    lastMode: mode,
    lastReason: reason,
    lastError: undefined,
  }

  activeSync = (async () => {
    try {
      let result: SyncFacebookInboxResult

      if (!config.FB_SYNC_LOCK_ENABLED) {
        result = await runFacebookInboxSync(options, startedAt)
      } else {
        const lease = await acquireDistributedLock({
          key: 'facebook:sync:lock',
          ttlMs: config.FB_SYNC_LOCK_TTL_MS,
          renewMs: config.FB_SYNC_LOCK_RENEW_MS,
          acquireTimeoutMs: config.FB_SYNC_LOCK_ACQUIRE_TIMEOUT_MS,
          retryMs: config.FB_SYNC_LOCK_RETRY_MS,
        })

        if (!lease) {
          console.warn('[sync/facebook] skipped, distributed lock busy')
          result = buildSyncResult({
            synced: 0,
            conversations: 0,
            scannedMessages: 0,
            mode,
            reason: `${reason}:lock_busy`,
            startedAt,
          })
        } else {
          try {
            result = await runFacebookInboxSync(options, startedAt)
          } finally {
            await lease.release()
          }
        }
      }

      lastSyncStatus = {
        ...lastSyncStatus,
        active: false,
        lastFinishedAt: result.finishedAt,
        lastSuccessfulAt: result.finishedAt,
        lastMode: result.mode,
        lastReason: result.reason,
        lastResult: result,
        lastError: undefined,
      }

      return result
    } catch (error) {
      lastSyncStatus = {
        ...lastSyncStatus,
        active: false,
        lastFinishedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : 'Facebook sync failed',
      }
      throw error
    }
  })().finally(() => {
    activeSync = null
  })

  return activeSync
}

export function getFacebookInboxSyncStatus(): {
  active: boolean
  lastStartedAt?: string
  lastFinishedAt?: string
  lastSuccessfulAt?: string
  lastMode?: 'full' | 'incremental'
  lastReason?: string
  lastResult?: SyncFacebookInboxResult
  lastError?: string
} {
  return { ...lastSyncStatus }
}

export function startFacebookInboxSyncScheduler(): () => void {
  const config = getConfig()

  if (!config.FB_SYNC_ENABLED) {
    console.log('[sync/facebook] background sync disabled')
    return () => {}
  }

  let stopped = false
  let timer: NodeJS.Timeout | null = null

  const schedule = (delayMs: number, reason: string) => {
    timer = setTimeout(async () => {
      if (stopped) {
        return
      }

      try {
        const result = await syncFacebookInbox({
          mode: 'incremental',
          publishEvents: true,
          reason,
        })

        console.log(
          `[sync/facebook] ${reason} synced=${result.synced} scanned=${result.scannedMessages} conversations=${result.conversations}`
        )
      } catch (error) {
        console.error(`[sync/facebook] ${reason} failed`, error)
      } finally {
        if (!stopped) {
          schedule(config.FB_SYNC_INTERVAL_MS, 'interval')
        }
      }
    }, delayMs)

    timer.unref()
  }

  console.log(
    `[sync/facebook] background sync enabled interval=${config.FB_SYNC_INTERVAL_MS}ms startupDelay=${config.FB_SYNC_STARTUP_DELAY_MS}ms`
  )
  schedule(config.FB_SYNC_STARTUP_DELAY_MS, 'startup')

  return () => {
    stopped = true

    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
}
