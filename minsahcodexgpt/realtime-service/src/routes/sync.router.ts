import { Router, type Request, type Response } from 'express'
import {
  getDeadLetterJobById,
  listDeadLetterJobs,
  markDeadLetterJobRequeued,
} from '../db/repository'
import { parseDeadLetterPayload } from '../facebook/dead-letter'
import { getConfig } from '../config'
import { syncFacebookInbox } from '../facebook/inbox-sync'
import { scheduleFacebookMediaRetry } from '../facebook/media-retry'
import { queueOutgoingRetry } from '../facebook/outgoing-retry'
import { scheduleInboxReplayJob } from '../facebook/replay-queue'

export const syncRouter = Router()

function hasSyncAuth(req: Request): boolean {
  return req.headers['x-api-secret'] === getConfig().REPLY_API_SECRET
}

async function replayDeadLetterJobById(id: string): Promise<void> {
  const job = await getDeadLetterJobById({ id })
  if (!job) {
    throw new Error('Dead-letter job not found')
  }

  const payload = parseDeadLetterPayload(job.payload)

  if (payload.kind === 'replay_queue') {
    await scheduleInboxReplayJob(payload.job)
  } else if (payload.kind === 'media_retry') {
    await scheduleFacebookMediaRetry(payload.job)
  } else {
    await queueOutgoingRetry({
      ...payload.job,
      attempt: 1,
      lastError: undefined,
    })
  }

  await markDeadLetterJobRequeued({ id: job.id })
}

syncRouter.post('/facebook', async (req: Request, res: Response) => {
  if (!hasSyncAuth(req)) {
    res.sendStatus(401)
    return
  }

  try {
    const result = await syncFacebookInbox({
      mode: 'full',
      publishEvents: false,
      reason: 'manual',
    })

    res.json({ synced: result.synced, conversations: result.conversations })
  } catch (error) {
    console.error('[sync/facebook] unexpected error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

syncRouter.get('/facebook/dead-letter', async (req: Request, res: Response) => {
  if (!hasSyncAuth(req)) {
    res.sendStatus(401)
    return
  }

  try {
    const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined
    const limitParam = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined
    const jobs = await listDeadLetterJobs({
      status:
        statusParam === 'OPEN' || statusParam === 'REQUEUED' || statusParam === 'RESOLVED'
          ? statusParam
          : undefined,
      limit:
        limitParam && Number.isFinite(limitParam)
          ? Math.min(Math.max(limitParam, 1), 200)
          : 50,
    })

    res.json({
      count: jobs.length,
      jobs,
    })
  } catch (error) {
    console.error('[sync/facebook/dead-letter] list failed', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

syncRouter.post('/facebook/dead-letter/replay-open', async (req: Request, res: Response) => {
  if (!hasSyncAuth(req)) {
    res.sendStatus(401)
    return
  }

  try {
    const limitParam =
      typeof req.body?.limit === 'number'
        ? req.body.limit
        : typeof req.query.limit === 'string'
          ? Number(req.query.limit)
          : 20
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100)
    const jobs = await listDeadLetterJobs({
      status: 'OPEN',
      limit,
    })

    let replayed = 0
    let failed = 0

    for (const job of jobs) {
      try {
        await replayDeadLetterJobById(job.id)
        replayed += 1
      } catch (error) {
        failed += 1
        console.error('[sync/facebook/dead-letter] replay-open item failed', {
          jobId: job.id,
          error,
        })
      }
    }

    res.json({
      ok: true,
      replayed,
      failed,
    })
  } catch (error) {
    console.error('[sync/facebook/dead-letter] replay-open failed', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

syncRouter.post('/facebook/dead-letter/:id/replay', async (req: Request, res: Response) => {
  if (!hasSyncAuth(req)) {
    res.sendStatus(401)
    return
  }

  try {
    await replayDeadLetterJobById(req.params.id)
    res.json({ ok: true, replayed: req.params.id })
  } catch (error) {
    console.error('[sync/facebook/dead-letter] replay failed', {
      id: req.params.id,
      error,
    })
    res.status(500).json({ error: 'Internal server error' })
  }
})
