import { getConfig } from '../config'

interface DebugTokenData {
  data?: {
    is_valid?: boolean
    expires_at?: number
    scopes?: string[]
    app_id?: string
  }
}

interface AccountsResponse {
  data?: Array<{
    id: string
    access_token: string
    name: string
  }>
}

let currentPageToken = ''
let tokenHealthy = false
let inFlightHealthCheck: Promise<void> | null = null

function getGraphApiBase(): string {
  const config = getConfig()
  return `https://graph.facebook.com/${config.FB_GRAPH_API_VERSION}`
}

export function getCurrentPageToken(): string {
  return currentPageToken || getConfig().FB_PAGE_ACCESS_TOKEN
}

export function isTokenHealthy(): boolean {
  return tokenHealthy
}

async function checkTokenValidity(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${getGraphApiBase()}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`
    )

    if (!response.ok) {
      return false
    }

    const data = (await response.json()) as DebugTokenData
    return data.data?.is_valid === true
  } catch {
    return false
  }
}

async function refreshPageToken(): Promise<string | null> {
  const config = getConfig()

  if (!config.FB_SYSTEM_USER_TOKEN) {
    console.warn('[token-health] FB_SYSTEM_USER_TOKEN not set, cannot refresh')
    return null
  }

  try {
    const response = await fetch(
      `${getGraphApiBase()}/me/accounts?access_token=${encodeURIComponent(config.FB_SYSTEM_USER_TOKEN)}`
    )

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('[token-health] /me/accounts failed:', body || response.statusText)
      return null
    }

    const data = (await response.json()) as AccountsResponse
    const page = data.data?.find((entry) => entry.id === config.FB_PAGE_ID)

    if (!page?.access_token) {
      console.error(
        '[token-health] page not found in accounts list for PAGE_ID:',
        config.FB_PAGE_ID
      )
      return null
    }

    return page.access_token
  } catch (error) {
    console.error('[token-health] refresh error:', error)
    return null
  }
}

async function runHealthCheck(): Promise<void> {
  const config = getConfig()
  const tokenToCheck = currentPageToken || config.FB_PAGE_ACCESS_TOKEN

  const valid = await checkTokenValidity(tokenToCheck)
  if (valid) {
    currentPageToken = tokenToCheck
    tokenHealthy = true
    console.log('[token-health] token valid')
    return
  }

  console.warn('[token-health] token invalid or expired, attempting refresh...')
  const refreshedToken = await refreshPageToken()

  if (refreshedToken) {
    currentPageToken = refreshedToken
    tokenHealthy = true
    console.log('[token-health] token refreshed successfully')
    return
  }

  tokenHealthy = false
  console.error('[token-health] CRITICAL: token refresh failed; inbox will not work')
}

function scheduleHealthCheck(): Promise<void> {
  if (!inFlightHealthCheck) {
    inFlightHealthCheck = runHealthCheck().finally(() => {
      inFlightHealthCheck = null
    })
  }

  return inFlightHealthCheck
}

export function startTokenHealthCheck(): () => void {
  void scheduleHealthCheck()

  const interval = setInterval(() => {
    void scheduleHealthCheck()
  }, 6 * 60 * 60 * 1000)

  interval.unref()

  return () => {
    clearInterval(interval)
  }
}
