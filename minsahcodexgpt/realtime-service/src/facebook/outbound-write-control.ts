export type FacebookOutboundOperation =
  | 'FACEBOOK_PAGE_MESSAGE'
  | 'FACEBOOK_PAGE_COMMENT_REPLY'
  | 'FACEBOOK_PAGE_MEDIA'

export interface FacebookOutboundWriteControl {
  operation: FacebookOutboundOperation
  enabled: boolean
  reasonCode: string
  blockers: readonly string[]
}

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off'])

function normalized(value: string | undefined): string | undefined {
  const result = value?.trim().toLowerCase()
  return result || undefined
}

function killSwitchBlocker(name: string, value: string | undefined): string | null {
  const current = normalized(value)
  if (current === undefined || FALSE_VALUES.has(current)) {
    return null
  }
  if (TRUE_VALUES.has(current)) {
    return `${name}_ACTIVE`
  }
  return `${name}_INVALID_FAIL_SAFE_ACTIVE`
}

export function getFacebookOutboundWriteControl(
  operation: FacebookOutboundOperation,
  env: Readonly<Record<string, string | undefined>> = process.env
): FacebookOutboundWriteControl {
  const blockers = [
    killSwitchBlocker('META_PLATFORM_GLOBAL_KILL_SWITCH', env.META_PLATFORM_GLOBAL_KILL_SWITCH),
    killSwitchBlocker(
      'META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH',
      env.META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH
    ),
    killSwitchBlocker(
      'META_PLATFORM_FACEBOOK_KILL_SWITCH',
      env.META_PLATFORM_FACEBOOK_KILL_SWITCH
    ),
  ].filter((value): value is string => Boolean(value))

  return Object.freeze({
    operation,
    enabled: blockers.length === 0,
    reasonCode: blockers[0] ?? 'ENABLED',
    blockers: Object.freeze(blockers),
  })
}

export class FacebookOutboundWriteBlockedError extends Error {
  readonly status = 409
  readonly retryable = false
  readonly policyBlocked = true
  readonly code: string
  readonly operation: FacebookOutboundOperation

  constructor(code: string, operation: FacebookOutboundOperation) {
    super(code)
    this.name = 'FacebookOutboundWriteBlockedError'
    this.code = code
    this.operation = operation
  }
}

export function assertFacebookOutboundWriteEnabled(
  operation: FacebookOutboundOperation,
  env: Readonly<Record<string, string | undefined>> = process.env
): void {
  const control = getFacebookOutboundWriteControl(operation, env)
  if (control.enabled) {
    return
  }
  throw new FacebookOutboundWriteBlockedError(control.reasonCode, operation)
}
