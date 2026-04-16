import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  FB_APP_SECRET: z.string().min(10, 'FB_APP_SECRET is required'),
  FB_VERIFY_TOKEN: z.string().min(8, 'FB_VERIFY_TOKEN is required'),
  FB_PAGE_ACCESS_TOKEN: z.string().min(10, 'FB_PAGE_ACCESS_TOKEN is required'),
  FB_PAGE_ID: z.string().min(1, 'FB_PAGE_ID is required'),
  REALTIME_PUBLIC_BASE_URL: z.string().default('http://localhost:3001'),
  MEDIA_STORAGE_BACKEND: z.enum(['local', 'minio']).default('local'),
  MEDIA_STORAGE_DIR: z.string().default('./data'),
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_PORT: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine(
      (value) => value === undefined || (Number.isFinite(value) && value > 0),
      'MINIO_PORT must be a positive number'
    ),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_USE_SSL: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === undefined ? undefined : value === 'true'),
  MINIO_BUCKET_NAME: z.string().optional(),
  MINIO_REGION: z.string().default('us-east-1'),
  MINIO_PUBLIC_BASE_URL: z.string().optional(),
  FB_MEDIA_MAX_BYTES: z
    .string()
    .default('52428800')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1048576,
      'FB_MEDIA_MAX_BYTES must be at least 1048576'
    ),
  FB_MEDIA_RETRY_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  FB_MEDIA_RETRY_POLL_MS: z
    .string()
    .default('15000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_MEDIA_RETRY_POLL_MS must be at least 1000'
    ),
  FB_MEDIA_RETRY_BASE_DELAY_MS: z
    .string()
    .default('30000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_MEDIA_RETRY_BASE_DELAY_MS must be at least 1000'
    ),
  FB_MEDIA_RETRY_MAX_DELAY_MS: z
    .string()
    .default('3600000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_MEDIA_RETRY_MAX_DELAY_MS must be at least 1000'
    ),
  FB_MEDIA_RETRY_MAX_ATTEMPTS: z
    .string()
    .default('8')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1,
      'FB_MEDIA_RETRY_MAX_ATTEMPTS must be at least 1'
    ),
  FB_MEDIA_RETRY_BATCH_SIZE: z
    .string()
    .default('10')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1,
      'FB_MEDIA_RETRY_BATCH_SIZE must be at least 1'
    ),
  FB_REPLAY_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  FB_REPLAY_POLL_MS: z
    .string()
    .default('15000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_REPLAY_POLL_MS must be at least 1000'
    ),
  FB_REPLAY_BASE_DELAY_MS: z
    .string()
    .default('30000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_REPLAY_BASE_DELAY_MS must be at least 1000'
    ),
  FB_REPLAY_MAX_DELAY_MS: z
    .string()
    .default('3600000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_REPLAY_MAX_DELAY_MS must be at least 1000'
    ),
  FB_REPLAY_MAX_ATTEMPTS: z
    .string()
    .default('8')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1,
      'FB_REPLAY_MAX_ATTEMPTS must be at least 1'
    ),
  FB_REPLAY_BATCH_SIZE: z
    .string()
    .default('10')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1,
      'FB_REPLAY_BATCH_SIZE must be at least 1'
    ),
  FB_SYNC_LOCK_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  FB_SYNC_LOCK_TTL_MS: z
    .string()
    .default('900000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 10000,
      'FB_SYNC_LOCK_TTL_MS must be at least 10000'
    ),
  FB_SYNC_LOCK_RENEW_MS: z
    .string()
    .default('30000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_SYNC_LOCK_RENEW_MS must be at least 1000'
    ),
  FB_SYNC_LOCK_ACQUIRE_TIMEOUT_MS: z
    .string()
    .default('5000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 0,
      'FB_SYNC_LOCK_ACQUIRE_TIMEOUT_MS must be at least 0'
    ),
  FB_SYNC_LOCK_RETRY_MS: z
    .string()
    .default('1000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 100,
      'FB_SYNC_LOCK_RETRY_MS must be at least 100'
    ),
  FB_OUTGOING_RETRY_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  FB_OUTGOING_RETRY_POLL_MS: z
    .string()
    .default('5000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_OUTGOING_RETRY_POLL_MS must be at least 1000'
    ),
  FB_OUTGOING_RETRY_BASE_DELAY_MS: z
    .string()
    .default('15000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_OUTGOING_RETRY_BASE_DELAY_MS must be at least 1000'
    ),
  FB_OUTGOING_RETRY_MAX_DELAY_MS: z
    .string()
    .default('1800000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1000,
      'FB_OUTGOING_RETRY_MAX_DELAY_MS must be at least 1000'
    ),
  FB_OUTGOING_RETRY_MAX_ATTEMPTS: z
    .string()
    .default('8')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1,
      'FB_OUTGOING_RETRY_MAX_ATTEMPTS must be at least 1'
    ),
  FB_OUTGOING_RETRY_BATCH_SIZE: z
    .string()
    .default('20')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 1,
      'FB_OUTGOING_RETRY_BATCH_SIZE must be at least 1'
    ),
  FB_SYNC_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  FB_SYNC_INTERVAL_MS: z
    .string()
    .default('20000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 5000,
      'FB_SYNC_INTERVAL_MS must be at least 5000'
    ),
  FB_SYNC_STARTUP_DELAY_MS: z
    .string()
    .default('2000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 0,
      'FB_SYNC_STARTUP_DELAY_MS must be at least 0'
    ),
  FB_SYNC_MESSAGE_OVERLAP_MS: z
    .string()
    .default('120000')
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value) && value >= 0,
      'FB_SYNC_MESSAGE_OVERLAP_MS must be at least 0'
    ),
  WS_AUTH_SECRET: z.string().min(32, 'WS_AUTH_SECRET must be at least 32 chars'),
  REPLY_API_SECRET: z.string().min(32, 'REPLY_API_SECRET must be at least 32 chars'),
  NEXTJS_INTERNAL_URL: z.string().default('http://localhost:3000'),
}).superRefine((data, ctx) => {
  if (data.MEDIA_STORAGE_BACKEND !== 'minio') {
    return
  }

  if (!data.MINIO_ENDPOINT) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MINIO_ENDPOINT'],
      message: 'MINIO_ENDPOINT is required when MEDIA_STORAGE_BACKEND=minio',
    })
  }

  if (!data.MINIO_ACCESS_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MINIO_ACCESS_KEY'],
      message: 'MINIO_ACCESS_KEY is required when MEDIA_STORAGE_BACKEND=minio',
    })
  }

  if (!data.MINIO_SECRET_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MINIO_SECRET_KEY'],
      message: 'MINIO_SECRET_KEY is required when MEDIA_STORAGE_BACKEND=minio',
    })
  }

  if (!data.MINIO_BUCKET_NAME) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MINIO_BUCKET_NAME'],
      message: 'MINIO_BUCKET_NAME is required when MEDIA_STORAGE_BACKEND=minio',
    })
  }

  if (data.MINIO_USE_SSL === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MINIO_USE_SSL'],
      message: 'MINIO_USE_SSL is required when MEDIA_STORAGE_BACKEND=minio',
    })
  }

  if (!data.MINIO_PUBLIC_BASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MINIO_PUBLIC_BASE_URL'],
      message: 'MINIO_PUBLIC_BASE_URL is required when MEDIA_STORAGE_BACKEND=minio',
    })
  }
})

export type AppConfig = z.infer<typeof envSchema>

let cachedConfig: AppConfig | null = null

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    console.error(`[config] Missing or invalid environment variables:\n${issues}`)
    process.exit(1)
  }

  cachedConfig = parsed.data
  return cachedConfig
}
