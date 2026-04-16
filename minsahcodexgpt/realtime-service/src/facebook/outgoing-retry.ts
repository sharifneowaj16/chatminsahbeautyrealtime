import { randomUUID } from 'crypto'
import Redis from 'ioredis'
import { getConfig } from '../config'
import {
  createOrUpdateDeadLetterJob,
  createOrGetOutboxMessage,
  linkOutboxToLocalMessage,
  recordOutboxState,
  resolveDeadLetterJobByDedupeKey,
} from '../db/repository'
import { addAttachmentTypeHint, type MessengerAttachmentType } from './attachments'
import { buildOutgoingDeadLetterKey, toDeadLetterPayloadValue } from './dead-letter'
import {
  GraphApiError,
  sendMessengerAttachment,
  sendMessengerText,
} from './graph.client'
import { processOutgoingInboxMessage } from './inbox-processor'
import { scheduleInboxReplayJob } from './replay-queue'
import { publishInboxEvent } from '../realtime/pubsub'

const OUTGOING_RETRY_KEY = 'fb:outgoing:retry'

export interface OutgoingRetryJob {
  jobId: string
  pageId: string
  customerPsid: string
  agentId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  clientMessageId?: string
  attempts: number
  queuedAt: string
  lastError?: string
}

export interface QueueOutgoingRetryInput {
  outboxMessageId: string
  pageId: string
  customerPsid: string
  agentId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  clientMessageId?: string
  lastError?: string
  attempt?: number
}

const retryRedis = new Redis(getConfig().REDIS_URL)
retryRedis.on('error', (error) => {
  console.error('[facebook/outgoing-retry] redis error', error)
})

let activeWorker = false

function buildDelayMs(attempts: number): number {
  const base = getConfig().FB_OUTGOING_RETRY_BASE_DELAY_MS
  const scaled = base * 2 ** Math.max(0, attempts - 1)
  return Math.min(scaled, getConfig().FB_OUTGOING_RETRY_MAX_DELAY_MS)
}

function getStorageAttachmentUrl(job: {
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
}): string | undefined {
  if (!job.attachmentUrl) {
    return undefined
  }

  if (!job.attachmentType) {
    return job.attachmentUrl
  }

  return addAttachmentTypeHint(job.attachmentUrl, job.attachmentType)
}

async function publishOutgoingStatus(input: {
  job: Pick<
    OutgoingRetryJob,
    | 'jobId'
    | 'pageId'
    | 'customerPsid'
    | 'text'
    | 'attachmentUrl'
    | 'attachmentType'
    | 'clientMessageId'
  >
  state: 'queued' | 'retrying' | 'sent' | 'failed'
  attempt: number
  conversationId?: string
  messageId?: string
  fbMessageId?: string
  error?: string
}): Promise<void> {
  await publishInboxEvent({
    type: 'outgoing_status',
    jobId: input.job.jobId,
    threadId: input.job.customerPsid,
    pageId: input.job.pageId,
    state: input.state,
    text: input.job.text,
    attachmentUrl: getStorageAttachmentUrl(input.job),
    attachmentType: input.job.attachmentType,
    timestamp: new Date().toISOString(),
    attempt: input.attempt,
    clientMessageId: input.job.clientMessageId,
    conversationId: input.conversationId,
    messageId: input.messageId,
    fbMessageId: input.fbMessageId,
    error: input.error,
  })
}

async function enqueueOutgoingRetry(job: OutgoingRetryJob, delayMs: number): Promise<void> {
  await retryRedis.zadd(OUTGOING_RETRY_KEY, Date.now() + delayMs, JSON.stringify(job))
}

export async function queueOutgoingRetry(
  input: QueueOutgoingRetryInput
): Promise<{ jobId: string }> {
  if (!getConfig().FB_OUTGOING_RETRY_ENABLED) {
    throw new Error('Outgoing retry is disabled')
  }

  const attempt = input.attempt ?? 1
  const job: OutgoingRetryJob = {
    jobId: input.outboxMessageId,
    pageId: input.pageId,
    customerPsid: input.customerPsid,
    agentId: input.agentId,
    text: input.text,
    attachmentUrl: input.attachmentUrl,
    attachmentType: input.attachmentType,
    clientMessageId: input.clientMessageId,
    attempts: attempt,
    queuedAt: new Date().toISOString(),
    lastError: input.lastError,
  }

  await enqueueOutgoingRetry(job, getConfig().FB_OUTGOING_RETRY_BASE_DELAY_MS)
  await recordOutboxState({
    outboxMessageId: job.jobId,
    state: 'QUEUED',
    attempt: job.attempts,
    error: input.lastError,
  })
  await publishOutgoingStatus({
    job,
    state: 'queued',
    attempt: job.attempts,
    error: input.lastError,
  })

  return { jobId: job.jobId }
}

async function persistDeliveredOutgoingMessage(input: {
  outboxMessageId: string
  pageId: string
  customerPsid: string
  agentId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  fbMessageId: string
}): Promise<{
  conversationId: string
  messageId: string
}> {
  const saved = await processOutgoingInboxMessage({
    pageId: input.pageId,
    customerPsid: input.customerPsid,
    messageId: input.fbMessageId,
    text: input.text,
    attachmentUrl: getStorageAttachmentUrl(input),
    attachmentType: input.attachmentType,
    timestamp: new Date(),
    publishEvent: true,
  })

  return {
    conversationId: saved.conversationId,
    messageId: saved.messageId,
  }
}

async function deliverOutgoingJob(
  job: OutgoingRetryJob
): Promise<{
  recipientId: string
  fbMessageId: string
  conversationId: string
  messageId: string
}> {
  const delivery = job.attachmentUrl && job.attachmentType
    ? await sendMessengerAttachment(job.customerPsid, {
        type: job.attachmentType,
        url: job.attachmentUrl,
      })
    : await sendMessengerText(job.customerPsid, job.text)

  await recordOutboxState({
    outboxMessageId: job.jobId,
    state: 'SENT',
    attempt: job.attempts,
    fbMessageId: delivery.messageId,
  })

  try {
    const persisted = await persistDeliveredOutgoingMessage({
      outboxMessageId: job.jobId,
      pageId: job.pageId,
      customerPsid: delivery.recipientId,
      agentId: job.agentId,
      text: job.text,
      attachmentUrl: job.attachmentUrl,
      attachmentType: job.attachmentType,
      fbMessageId: delivery.messageId,
    })

    await linkOutboxToLocalMessage({
      outboxMessageId: job.jobId,
      conversationId: persisted.conversationId,
      localMessageId: persisted.messageId,
    })

    return {
      recipientId: delivery.recipientId,
      fbMessageId: delivery.messageId,
      conversationId: persisted.conversationId,
      messageId: persisted.messageId,
    }
  } catch (error) {
    console.error('[facebook/outgoing-retry] persist after send failed', {
      jobId: job.jobId,
      fbMessageId: delivery.messageId,
      error,
    })

    await scheduleInboxReplayJob({
      type: 'outgoing_message',
      pageId: job.pageId,
      customerPsid: delivery.recipientId,
      fbMessageId: delivery.messageId,
      text: job.text,
      attachmentUrl: getStorageAttachmentUrl(job),
      attachmentType: job.attachmentType,
      timestamp: new Date().toISOString(),
    })

    return {
      recipientId: delivery.recipientId,
      fbMessageId: delivery.messageId,
      conversationId: '',
      messageId: '',
    }
  }
}

export async function sendOutgoingNowOrQueue(input: {
  pageId: string
  customerPsid: string
  agentId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  clientMessageId?: string
}): Promise<
  | {
      queued: false
      recipientId: string
      fbMessageId: string
      conversationId: string
      messageId: string
    }
  | {
      queued: true
      jobId: string
      error: string
    }
> {
  const requestedJobId = randomUUID()
  const outbox = await createOrGetOutboxMessage({
    outboxMessageId: requestedJobId,
    pageId: input.pageId,
    customerPsid: input.customerPsid,
    agentId: input.agentId,
    text: input.text,
    attachmentUrl: getStorageAttachmentUrl(input),
    attachmentType: input.attachmentType,
    clientMessageId: input.clientMessageId,
  })

  if (
    outbox.fbMessageId &&
    outbox.localMessageId &&
    outbox.conversationId &&
    (outbox.state === 'SENT' || outbox.state === 'DELIVERED' || outbox.state === 'READ')
  ) {
    return {
      queued: false,
      recipientId: input.customerPsid,
      fbMessageId: outbox.fbMessageId,
      conversationId: outbox.conversationId,
      messageId: outbox.localMessageId,
    }
  }

  if (
    outbox.state === 'QUEUED' ||
    outbox.state === 'RETRYING' ||
    outbox.state === 'FAILED'
  ) {
    return {
      queued: true,
      jobId: outbox.id,
      error: outbox.lastError ?? 'Message already queued for retry',
    }
  }

  const job: OutgoingRetryJob = {
    jobId: outbox.id,
    pageId: input.pageId,
    customerPsid: input.customerPsid,
    agentId: input.agentId,
    text: input.text,
    attachmentUrl: input.attachmentUrl,
    attachmentType: input.attachmentType,
    clientMessageId: outbox.clientMessageId ?? input.clientMessageId,
    attempts: 1,
    queuedAt: new Date().toISOString(),
  }

  try {
    const delivered = await deliverOutgoingJob(job)
    await resolveDeadLetterJobByDedupeKey({
      dedupeKey: buildOutgoingDeadLetterKey(job.jobId),
    })
    await publishOutgoingStatus({
      job,
      state: 'sent',
      attempt: 1,
      conversationId: delivered.conversationId || undefined,
      messageId: delivered.messageId || undefined,
      fbMessageId: delivered.fbMessageId,
    })

    return {
      queued: false,
      recipientId: delivered.recipientId,
      fbMessageId: delivered.fbMessageId,
      conversationId: delivered.conversationId,
      messageId: delivered.messageId,
    }
  } catch (error) {
    const detail =
      error instanceof GraphApiError ? error.message : 'Outgoing send failed'

    const queued = await queueOutgoingRetry({
      outboxMessageId: job.jobId,
      pageId: input.pageId,
      customerPsid: input.customerPsid,
      agentId: input.agentId,
      text: input.text,
      attachmentUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      clientMessageId: input.clientMessageId,
      lastError: detail,
    })

    return {
      queued: true,
      jobId: queued.jobId,
      error: detail,
    }
  }
}

async function claimDueJobs(limit: number): Promise<OutgoingRetryJob[]> {
  const now = Date.now()
  const rawJobs = await retryRedis.zrangebyscore(OUTGOING_RETRY_KEY, 0, now, 'LIMIT', 0, limit)

  if (rawJobs.length === 0) {
    return []
  }

  const jobs: OutgoingRetryJob[] = []

  for (const rawJob of rawJobs) {
    const removed = await retryRedis.zrem(OUTGOING_RETRY_KEY, rawJob)
    if (removed === 0) {
      continue
    }

    try {
      jobs.push(JSON.parse(rawJob) as OutgoingRetryJob)
    } catch (error) {
      console.error('[facebook/outgoing-retry] invalid job payload', { rawJob, error })
    }
  }

  return jobs
}

async function processOutgoingRetryJob(job: OutgoingRetryJob): Promise<void> {
  await recordOutboxState({
    outboxMessageId: job.jobId,
    state: 'RETRYING',
    attempt: job.attempts,
    error: job.lastError,
  })
  await publishOutgoingStatus({
    job,
    state: 'retrying',
    attempt: job.attempts,
    error: job.lastError,
  })

  try {
    const delivered = await deliverOutgoingJob(job)
    await resolveDeadLetterJobByDedupeKey({
      dedupeKey: buildOutgoingDeadLetterKey(job.jobId),
    })
    await publishOutgoingStatus({
      job,
      state: 'sent',
      attempt: job.attempts,
      conversationId: delivered.conversationId || undefined,
      messageId: delivered.messageId || undefined,
      fbMessageId: delivered.fbMessageId,
    })
  } catch (error) {
    const detail =
      error instanceof GraphApiError ? error.message : 'Outgoing send failed'

    if (job.attempts >= getConfig().FB_OUTGOING_RETRY_MAX_ATTEMPTS) {
      await recordOutboxState({
        outboxMessageId: job.jobId,
        state: 'FAILED',
        attempt: job.attempts,
        error: detail,
      })
      await createOrUpdateDeadLetterJob({
        source: 'OUTGOING_RETRY',
        dedupeKey: buildOutgoingDeadLetterKey(job.jobId),
        jobType: 'outgoing_retry',
        pageId: job.pageId,
        threadId: job.customerPsid,
        outboxMessageId: job.jobId,
        attempts: job.attempts,
        maxAttempts: getConfig().FB_OUTGOING_RETRY_MAX_ATTEMPTS,
        error: detail,
        payload: toDeadLetterPayloadValue({
          kind: 'outgoing_retry',
          job: {
            outboxMessageId: job.jobId,
            pageId: job.pageId,
            customerPsid: job.customerPsid,
            agentId: job.agentId,
            text: job.text,
            attachmentUrl: job.attachmentUrl,
            attachmentType: job.attachmentType,
            clientMessageId: job.clientMessageId,
          },
        }),
      })
      await publishOutgoingStatus({
        job,
        state: 'failed',
        attempt: job.attempts,
        error: detail,
      })
      return
    }

    await enqueueOutgoingRetry(
      {
        ...job,
        attempts: job.attempts + 1,
        lastError: detail,
      },
      buildDelayMs(job.attempts + 1)
    )

    await recordOutboxState({
      outboxMessageId: job.jobId,
      state: 'QUEUED',
      attempt: job.attempts + 1,
      error: detail,
    })

    await publishOutgoingStatus({
      job,
      state: 'queued',
      attempt: job.attempts + 1,
      error: detail,
    })
  }
}

async function drainOutgoingRetryQueue(): Promise<void> {
  if (activeWorker) {
    return
  }

  activeWorker = true

  try {
    while (true) {
      const jobs = await claimDueJobs(getConfig().FB_OUTGOING_RETRY_BATCH_SIZE)
      if (jobs.length === 0) {
        return
      }

      for (const job of jobs) {
        try {
          await processOutgoingRetryJob(job)
        } catch (error) {
          console.error('[facebook/outgoing-retry] job failed', { job, error })
        }
      }
    }
  } finally {
    activeWorker = false
  }
}

export function startOutgoingRetryWorker(): () => void {
  if (!getConfig().FB_OUTGOING_RETRY_ENABLED) {
    console.log('[facebook/outgoing-retry] disabled')
    return () => {}
  }

  let timer: NodeJS.Timeout | null = null
  let stopped = false

  const tick = () => {
    timer = setTimeout(async () => {
      if (stopped) {
        return
      }

      try {
        await drainOutgoingRetryQueue()
      } catch (error) {
        console.error('[facebook/outgoing-retry] worker tick failed', error)
      } finally {
        if (!stopped) {
          tick()
        }
      }
    }, getConfig().FB_OUTGOING_RETRY_POLL_MS)

    timer.unref()
  }

  console.log(
    `[facebook/outgoing-retry] enabled poll=${getConfig().FB_OUTGOING_RETRY_POLL_MS}ms attempts=${getConfig().FB_OUTGOING_RETRY_MAX_ATTEMPTS}`
  )
  tick()

  return () => {
    stopped = true
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
}

export async function getOutgoingRetryQueueDepth(): Promise<number> {
  return retryRedis.zcard(OUTGOING_RETRY_KEY)
}

export async function disconnectOutgoingRetryQueue(): Promise<void> {
  await retryRedis.quit()
}
