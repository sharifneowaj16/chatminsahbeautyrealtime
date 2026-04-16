import { randomUUID } from 'crypto'
import Redis from 'ioredis'
import { getConfig } from '../config'

const lockRedis = new Redis(getConfig().REDIS_URL)
lockRedis.on('error', (error) => {
  console.error('[redis-lock] error', error)
})

const COMPARE_AND_DELETE = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`

const COMPARE_AND_PEXPIRE = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
return 0
`

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface DistributedLockLease {
  release: () => Promise<void>
}

export async function acquireDistributedLock(input: {
  key: string
  ttlMs: number
  renewMs: number
  acquireTimeoutMs: number
  retryMs: number
}): Promise<DistributedLockLease | null> {
  const token = randomUUID()
  const deadline = Date.now() + input.acquireTimeoutMs

  while (true) {
    const result = await lockRedis.set(input.key, token, 'PX', input.ttlMs, 'NX')

    if (result === 'OK') {
      let released = false
      const renewTimer = setInterval(async () => {
        if (released) {
          return
        }

        try {
          await lockRedis.eval(COMPARE_AND_PEXPIRE, 1, input.key, token, String(input.ttlMs))
        } catch (error) {
          console.error('[redis-lock] renew failed', { key: input.key, error })
        }
      }, input.renewMs)
      renewTimer.unref()

      return {
        release: async () => {
          if (released) {
            return
          }

          released = true
          clearInterval(renewTimer)

          try {
            await lockRedis.eval(COMPARE_AND_DELETE, 1, input.key, token)
          } catch (error) {
            console.error('[redis-lock] release failed', { key: input.key, error })
          }
        },
      }
    }

    if (Date.now() >= deadline) {
      return null
    }

    await sleep(input.retryMs)
  }
}

export async function disconnectDistributedLockRedis(): Promise<void> {
  await lockRedis.quit()
}
