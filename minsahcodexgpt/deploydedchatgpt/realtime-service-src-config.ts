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
  WS_AUTH_SECRET: z.string().min(32, 'WS_AUTH_SECRET must be at least 32 chars'),
  REPLY_API_SECRET: z.string().min(32, 'REPLY_API_SECRET must be at least 32 chars'),
  NEXTJS_INTERNAL_URL: z.string().default('http://localhost:3000'),
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
