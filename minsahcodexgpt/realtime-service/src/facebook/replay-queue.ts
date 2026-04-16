import Redis from 'ioredis'
import { getConfig } from '../config'
import {
  createOrUpdateDeadLetterJob,
  resolveDeadLetterJobByDedupeKey,
} from '../db/repository'
import type { MessengerAttachmentType } from './attachments'
import { buildReplayDeadLetterKey, toDeadLetterPayloadValue } from './dead-letter'
import {
  processIncomingInboxMessage,
  processOutgoingInboxMessage,
} from './inbox-processor'

const REPLAY_QUEUE_KEY = 'fb:replay:queue'

interface ReplayJobBase {
  attempts: number
}

interface IncomingReplayJob extends ReplayJobBase {
  type: 'incoming_message'
  pageId: string
  senderId: string
  customerName?: string
  fbMessageId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  timestamp: string
}

interface OutgoingReplayJob extends ReplayJobBase {
  type: 'outgoing_message'
  pageId: string
  customerPsid: string
  fbMessageId: string
  text: string
  attachmentUrl?: string
  attachmentType?: MessengerAttachmentType
  timestamp: string
}

type ReplayJob = IncomingReplayJob | OutgoingReplayJob
export type ReplayJobInput = Omit<IncomingReplayJob, 'attempts'> | Omit<OutgoingReplayJob, 'attempts'>

const replayRedis = new Redis(getConfig().REDIS_URL)
replayRedis.on('error', (error) => {
  console.error('[facebook/replay] redis error', error)
})

let activeWorker = false

function buildDelayMs(attempts: number): number {
  const base = getConfig().FB_REPLAY_BASE_DELAY_MS
  const scaled = base * 2 ** Math.max(0, attempts - 1)
  return Math.min(scaled, getConfig().FB_REPLAY_MAX_DELAY_MS)
}

async function enqueueReplayJob(job: ReplayJob, delayMs: number): Promise<void> {
  const score = Date.now() + delayMs
  await replayRedis.zadd(REPLAY_QUEUE_KEY, score, JSON.stringify(job))
}

export async function scheduleInboxReplayJob(job: ReplayJobInput): Promise<void> {
  if (!getConfig().FB_REPLAY_ENABLED) {
    return
  }

  await enqueueReplayJob(
    {
      ...job,
      attempts: 1,
    },
    getConfig().FB_REPLAY_BASE_DELAY_MS
  )
}

async function claimDueJobs(limit: number): Promise<ReplayJob[]> {
  const now = Date.now()
  const rawJobs = await replayRedis.zrangebyscore(REPLAY_QUEUE_KEY, 0, now, 'LIMIT', 0, limit)

  if (rawJobs.length === 0) {
    return []
  }

  const jobs: ReplayJob[] = []

  for (const rawJob of rawJobs) {
    const removed = await replayRedis.zrem(REPLAY_QUEUE_KEY, rawJob)
    if (removed === 0) {
      continue
    }

    try {
      jobs.push(JSON.parse(rawJob) as ReplayJob)
    } catch (error) {
      console.error('[facebook/replay] invalid job payload', { rawJob, error })
    }
  }

  return jobs
}

async function processReplayJob(job: ReplayJob): Promise<void> {
  if (job.type === 'incoming_message') {
    await processIncomingInboxMessage({
      pageId: job.pageId,
      senderId: job.senderId,
      messageId: job.fbMessageId,
      text: job.text,
      attachmentUrl: job.attachmentUrl,
      attachmentType: job.attachmentType,
      timestamp: new Date(job.timestamp),
      customerName: job.customerName,
      publishEvent: true,
    })
    await resolveDeadLetterJobByDedupeKey({
      dedupeKey: buildReplayDeadLetterKey(job),
    })
    return
  }

  await processOutgoingInboxMessage({
    pageId: job.pageId,
    customerPsid: job.customerPsid,
    messageId: job.fbMessageId,
    text: job.text,
    attachmentUrl: job.attachmentUrl,
    attachmentType: job.attachmentType,
    timestamp: new Date(job.timestamp),
    publishEvent: true,
  })

  await resolveDeadLetterJobByDedupeKey({
    dedupeKey: buildReplayDeadLetterKey(job),
  })
}

async function drainReplayQueue(): Promise<void> {
  if (activeWorker) {
    return
  }

  activeWorker = true

  try {
    while (true) {
      const jobs = await claimDueJobs(getConfig().FB_REPLAY_BATCH_SIZE)
      if (jobs.length === 0) {
        return
      }

      for (const job of jobs) {
        try {
          await processReplayJob(job)
        } catch (error) {
          console.error('[facebook/replay] job failed', { job, error })

          if (job.attempts < getConfig().FB_REPLAY_MAX_ATTEMPTS) {
            await enqueueReplayJob(
              {
                ...job,
                attempts: job.attempts + 1,
              },
              buildDelayMs(job.attempts + 1)
            )
          } else {
            await createOrUpdateDeadLetterJob({
              source: 'REPLAY_QUEUE',
              dedupeKey: buildReplayDeadLetterKey(job),
              jobType: job.type,
              pageId: job.pageId,
              threadId: job.type === 'incoming_message' ? job.senderId : job.customerPsid,
              fbMessageId: job.fbMessageId,
              attempts: job.attempts,
              maxAttempts: getConfig().FB_REPLAY_MAX_ATTEMPTS,
              error: error instanceof Error ? error.message : 'Replay queue job failed',
              payload: toDeadLetterPayloadValue({
                kind: 'replay_queue',
                job: job.type === 'incoming_message'
                  ? {
                      type: 'incoming_message',
                      pageId: job.pageId,
                      senderId: job.senderId,
                      customerName: job.customerName,
                      fbMessageId: job.fbMessageId,
                      text: job.text,
                      attachmentUrl: job.attachmentUrl,
                      attachmentType: job.attachmentType,
                      timestamp: job.timestamp,
                    }
                  : {
                      type: 'outgoing_message',
                      pageId: job.pageId,
                      customerPsid: job.customerPsid,
                      fbMessageId: job.fbMessageId,
                      text: job.text,
                      attachmentUrl: job.attachmentUrl,
                      attachmentType: job.attachmentType,
                      timestamp: job.timestamp,
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

export function startFacebookReplayWorker(): () => void {
  if (!getConfig().FB_REPLAY_ENABLED) {
    console.log('[facebook/replay] disabled')
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
        await drainReplayQueue()
      } catch (error) {
        console.error('[facebook/replay] worker tick failed', error)
      } finally {
        if (!stopped) {
          tick()
        }
      }
    }, getConfig().FB_REPLAY_POLL_MS)

    timer.unref()
  }

  console.log(
    `[facebook/replay] enabled poll=${getConfig().FB_REPLAY_POLL_MS}ms attempts=${getConfig().FB_REPLAY_MAX_ATTEMPTS}`
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

export async function getFacebookReplayQueueDepth(): Promise<number> {
  return replayRedis.zcard(REPLAY_QUEUE_KEY)
}

export async function disconnectFacebookReplayQueue(): Promise<void> {
  await replayRedis.quit()
}
