import Redis from 'ioredis'
import { getConfig } from '../config'
import {
  createOrUpdateDeadLetterJob,
  resolveDeadLetterJobByDedupeKey,
  updateMessageAttachmentUrlByFbMessageId,
} from '../db/repository'
import type { MessengerAttachmentType } from './attachments'
import { buildMediaDeadLetterKey, toDeadLetterPayloadValue } from './dead-letter'
import { persistIncomingFacebookMedia } from './media-store'

const MEDIA_RETRY_KEY = 'fb:media:retry'

interface MediaRetryJob {
  fbMessageId: string
  sourceUrl: string
  attachmentType: MessengerAttachmentType
  threadId: string
  pageId: string
  text: string
  senderName?: string
  isIncoming: boolean
  attempts: number
}

export type ScheduleFacebookMediaRetryInput = Omit<MediaRetryJob, 'attempts'>

const retryRedis = new Redis(getConfig().REDIS_URL)
retryRedis.on('error', (error) => {
  console.error('[facebook/media-retry] redis error', error)
})

let activeWorker = false

function buildDelayMs(attempts: number): number {
  const base = getConfig().FB_MEDIA_RETRY_BASE_DELAY_MS
  const scaled = base * 2 ** Math.max(0, attempts - 1)
  return Math.min(scaled, getConfig().FB_MEDIA_RETRY_MAX_DELAY_MS)
}

async function enqueueMediaRetry(job: MediaRetryJob, delayMs: number): Promise<void> {
  const score = Date.now() + delayMs
  await retryRedis.zadd(MEDIA_RETRY_KEY, score, JSON.stringify(job))
}

export async function scheduleFacebookMediaRetry(job: ScheduleFacebookMediaRetryInput): Promise<void> {
  if (!getConfig().FB_MEDIA_RETRY_ENABLED) {
    return
  }

  await enqueueMediaRetry(
    {
      ...job,
      attempts: 1,
    },
    getConfig().FB_MEDIA_RETRY_BASE_DELAY_MS
  )
}

async function claimDueJobs(limit: number): Promise<MediaRetryJob[]> {
  const now = Date.now()
  const rawJobs = await retryRedis.zrangebyscore(MEDIA_RETRY_KEY, 0, now, 'LIMIT', 0, limit)

  if (rawJobs.length === 0) {
    return []
  }

  const claimed: MediaRetryJob[] = []

  for (const rawJob of rawJobs) {
    const removed = await retryRedis.zrem(MEDIA_RETRY_KEY, rawJob)
    if (removed === 0) {
      continue
    }

    try {
      claimed.push(JSON.parse(rawJob) as MediaRetryJob)
    } catch (error) {
      console.error('[facebook/media-retry] invalid job payload', { rawJob, error })
    }
  }

  return claimed
}

async function processMediaRetryJob(job: MediaRetryJob): Promise<void> {
  const result = await persistIncomingFacebookMedia({
    sourceUrl: job.sourceUrl,
    messageId: job.fbMessageId,
    attachmentType: job.attachmentType,
  })

  if (!result.url || !result.persisted) {
    if (job.attempts >= getConfig().FB_MEDIA_RETRY_MAX_ATTEMPTS) {
      console.error('[facebook/media-retry] giving up', job)
      await createOrUpdateDeadLetterJob({
        source: 'MEDIA_RETRY',
        dedupeKey: buildMediaDeadLetterKey(job),
        jobType: 'media_retry',
        pageId: job.pageId,
        threadId: job.threadId,
        fbMessageId: job.fbMessageId,
        attempts: job.attempts,
        maxAttempts: getConfig().FB_MEDIA_RETRY_MAX_ATTEMPTS,
        error: 'Media persistence retries exhausted',
        payload: toDeadLetterPayloadValue({
          kind: 'media_retry',
          job: {
            fbMessageId: job.fbMessageId,
            sourceUrl: job.sourceUrl,
            attachmentType: job.attachmentType,
            threadId: job.threadId,
            pageId: job.pageId,
            text: job.text,
            senderName: job.senderName,
            isIncoming: job.isIncoming,
          },
        }),
      })
      return
    }

    await enqueueMediaRetry(
      {
        ...job,
        attempts: job.attempts + 1,
      },
      buildDelayMs(job.attempts + 1)
    )
    return
  }

  await updateMessageAttachmentUrlByFbMessageId({
    fbMessageId: job.fbMessageId,
    attachmentUrl: result.url,
  })

  await resolveDeadLetterJobByDedupeKey({
    dedupeKey: buildMediaDeadLetterKey(job),
  })
}

async function drainMediaRetryQueue(): Promise<void> {
  if (activeWorker) {
    return
  }

  activeWorker = true

  try {
    while (true) {
      const jobs = await claimDueJobs(getConfig().FB_MEDIA_RETRY_BATCH_SIZE)
      if (jobs.length === 0) {
        return
      }

      for (const job of jobs) {
        try {
          await processMediaRetryJob(job)
        } catch (error) {
          console.error('[facebook/media-retry] job failed', { job, error })

          if (job.attempts < getConfig().FB_MEDIA_RETRY_MAX_ATTEMPTS) {
            await enqueueMediaRetry(
              {
                ...job,
                attempts: job.attempts + 1,
              },
              buildDelayMs(job.attempts + 1)
            )
          } else {
            await createOrUpdateDeadLetterJob({
              source: 'MEDIA_RETRY',
              dedupeKey: buildMediaDeadLetterKey(job),
              jobType: 'media_retry',
              pageId: job.pageId,
              threadId: job.threadId,
              fbMessageId: job.fbMessageId,
              attempts: job.attempts,
              maxAttempts: getConfig().FB_MEDIA_RETRY_MAX_ATTEMPTS,
              error: error instanceof Error ? error.message : 'Media retry failed',
              payload: toDeadLetterPayloadValue({
                kind: 'media_retry',
                job: {
                  fbMessageId: job.fbMessageId,
                  sourceUrl: job.sourceUrl,
                  attachmentType: job.attachmentType,
                  threadId: job.threadId,
                  pageId: job.pageId,
                  text: job.text,
                  senderName: job.senderName,
                  isIncoming: job.isIncoming,
                },
              }),
            })
          }
        }
      }
    }
  } finally {
    activeWorker = false
  }
}

export function startFacebookMediaRetryWorker(): () => void {
  if (!getConfig().FB_MEDIA_RETRY_ENABLED) {
    console.log('[facebook/media-retry] disabled')
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
        await drainMediaRetryQueue()
      } catch (error) {
        console.error('[facebook/media-retry] worker tick failed', error)
      } finally {
        if (!stopped) {
          tick()
        }
      }
    }, getConfig().FB_MEDIA_RETRY_POLL_MS)

    timer.unref()
  }

  console.log(
    `[facebook/media-retry] enabled poll=${getConfig().FB_MEDIA_RETRY_POLL_MS}ms attempts=${getConfig().FB_MEDIA_RETRY_MAX_ATTEMPTS}`
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

export async function getFacebookMediaRetryQueueDepth(): Promise<number> {
  return retryRedis.zcard(MEDIA_RETRY_KEY)
}

export async function disconnectFacebookMediaRetry(): Promise<void> {
  await retryRedis.quit()
}
