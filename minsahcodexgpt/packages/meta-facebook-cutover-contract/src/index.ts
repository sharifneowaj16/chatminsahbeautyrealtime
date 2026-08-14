export type FacebookCutoverMode = 'LEGACY' | 'SHADOW' | 'PLATFORM' | 'LEGACY_ROLLBACK' | 'BLOCKED'
export type FacebookCutoverAuthority = 'LEGACY' | 'PLATFORM' | 'NONE'
export type FacebookProviderIngressOwner = 'REALTIME_LEGACY' | 'REALTIME_BRIDGE_OR_MAIN_APP' | 'NONE'
export type FacebookRetryOwner = 'REALTIME_LEGACY' | 'MAIN_APP_BULLMQ' | 'NONE'

type EnvValue = string | boolean | undefined
export type FacebookCutoverEnv = Readonly<Record<string, EnvValue>>

export type BooleanFlagStatus = Readonly<{
  enabled: boolean
  valid: boolean
  configured: boolean
}>

export type FacebookRealtimeCutoverStatus = Readonly<{
  mode: FacebookCutoverMode
  authority: FacebookCutoverAuthority
  valid: boolean
  active: boolean
  reasonCode: string
  runtimeSelectorConfigured: boolean
  legacyFlag: BooleanFlagStatus
  realtimeFlag: BooleanFlagStatus
  webhookFlag: BooleanFlagStatus
  legacyDirectClientEnabled: boolean
  platformSyncEnabled: boolean
  platformWebhookEnabled: boolean
  realtimeBridgeEnabled: boolean
  shadowPlatformEvaluationEnabled: boolean
  shadowSideEffectsAllowed: false
  providerIngressOwner: FacebookProviderIngressOwner
  retryOwner: FacebookRetryOwner
  duplicateEventBoundary: 'RAW_BODY_SHA256_AND_PAGE_ID'
  rollbackAvailable: boolean
  legacyDisableEligible: false
}>

const TRUE_VALUES = new Set(['true', '1', 'yes'])
const FALSE_VALUES = new Set(['false', '0', 'no'])
const RUNTIME_VALUES = new Set(['LEGACY', 'SHADOW', 'PLATFORM', 'DOMAIN', 'LEGACY_ROLLBACK'])
const REALTIME_MODES = new Set(['bridge', 'legacy'])
const RUNTIME_FLAVORS = new Set(['bridge', 'legacy'])

function text(value: EnvValue): string | undefined {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  const normalized = value?.trim()
  return normalized || undefined
}

function booleanFlag(value: EnvValue, defaultValue: boolean, failSafeValue: boolean): BooleanFlagStatus {
  const configuredValue = text(value)?.toLowerCase()
  if (configuredValue === undefined) {
    return Object.freeze({ enabled: defaultValue, valid: true, configured: false })
  }
  if (TRUE_VALUES.has(configuredValue) || FALSE_VALUES.has(configuredValue)) {
    return Object.freeze({ enabled: TRUE_VALUES.has(configuredValue), valid: true, configured: true })
  }
  return Object.freeze({ enabled: failSafeValue, valid: false, configured: true })
}

function status(input: Omit<FacebookRealtimeCutoverStatus,
  'shadowSideEffectsAllowed' | 'duplicateEventBoundary' | 'legacyDisableEligible'>): FacebookRealtimeCutoverStatus {
  return Object.freeze({
    ...input,
    shadowSideEffectsAllowed: false,
    duplicateEventBoundary: 'RAW_BODY_SHA256_AND_PAGE_ID',
    legacyDisableEligible: false,
  })
}

export function resolveFacebookRealtimeCutover(
  env: FacebookCutoverEnv = {},
  options: Readonly<{ role?: 'MAIN_APP' | 'REALTIME' }> = {},
): FacebookRealtimeCutoverStatus {
  const role = options.role ?? 'MAIN_APP'
  const legacyFlag = booleanFlag(env.META_PLATFORM_LEGACY_FACEBOOK, true, true)
  const realtimeFlag = booleanFlag(env.META_PLATFORM_SOCIAL_REALTIME, false, false)
  const webhookFlag = booleanFlag(env.META_PLATFORM_SOCIAL_WEBHOOKS, false, false)
  const rollbackFlag = booleanFlag(env.REALTIME_FACEBOOK_LEGACY_ROLLBACK_ENABLED, false, false)
  const runtimeRaw = text(env.META_PHASE31_FACEBOOK_INBOX_RUNTIME)?.toUpperCase()
  const runtimeSelectorConfigured = runtimeRaw !== undefined
  const runtime = runtimeRaw ?? 'LEGACY'
  const realtimeMode = text(env.REALTIME_FACEBOOK_MODE)?.toLowerCase() ?? 'bridge'
  const runtimeFlavor = text(env.REALTIME_RUNTIME_FLAVOR)?.toLowerCase() ?? 'bridge'
  const localRuntimeSyntaxValid = role === 'MAIN_APP' || (rollbackFlag.valid && REALTIME_MODES.has(realtimeMode) && RUNTIME_FLAVORS.has(runtimeFlavor))
  const syntaxValid = legacyFlag.valid && realtimeFlag.valid && webhookFlag.valid
    && RUNTIME_VALUES.has(runtime) && localRuntimeSyntaxValid

  if (!syntaxValid) {
    return status({
      mode: 'BLOCKED', authority: 'NONE', valid: false, active: false,
      reasonCode: 'INVALID_CONFIGURATION_FAIL_SAFE_BLOCKED', runtimeSelectorConfigured,
      legacyFlag, realtimeFlag, webhookFlag,
      legacyDirectClientEnabled: false, platformSyncEnabled: false, platformWebhookEnabled: false,
      realtimeBridgeEnabled: false, shadowPlatformEvaluationEnabled: false,
      providerIngressOwner: 'NONE', retryOwner: 'NONE', rollbackAvailable: legacyFlag.enabled,
    })
  }

  const normalizedRuntime = runtime === 'DOMAIN' ? 'PLATFORM' : runtime
  if (normalizedRuntime === 'PLATFORM') {
    const canonicalPlatformReady = !legacyFlag.enabled && realtimeFlag.enabled && webhookFlag.enabled
    const localPlatformReady = role === 'MAIN_APP' || (realtimeMode === 'bridge' && runtimeFlavor === 'bridge')
    const platformReady = canonicalPlatformReady && localPlatformReady
    if (!platformReady) {
      return status({
        mode: 'BLOCKED', authority: 'NONE', valid: true, active: false,
        reasonCode: 'PLATFORM_PREREQUISITES_DISABLED', runtimeSelectorConfigured,
        legacyFlag, realtimeFlag, webhookFlag,
        legacyDirectClientEnabled: false, platformSyncEnabled: false, platformWebhookEnabled: false,
        realtimeBridgeEnabled: false, shadowPlatformEvaluationEnabled: false,
        providerIngressOwner: 'NONE', retryOwner: 'NONE', rollbackAvailable: legacyFlag.enabled,
      })
    }
    return status({
      mode: 'PLATFORM', authority: 'PLATFORM', valid: true, active: true,
      reasonCode: 'PLATFORM_AUTHORITY_ACTIVE', runtimeSelectorConfigured,
      legacyFlag, realtimeFlag, webhookFlag,
      legacyDirectClientEnabled: false, platformSyncEnabled: true, platformWebhookEnabled: true,
      realtimeBridgeEnabled: true, shadowPlatformEvaluationEnabled: false,
      providerIngressOwner: 'REALTIME_BRIDGE_OR_MAIN_APP', retryOwner: 'MAIN_APP_BULLMQ',
      rollbackAvailable: true,
    })
  }

  const canonicalLegacyReady = legacyFlag.enabled
  const localLegacyReady = role === 'MAIN_APP' || (realtimeMode === 'legacy'
    && runtimeFlavor === 'legacy' && rollbackFlag.enabled)
  const legacyRuntimeReady = canonicalLegacyReady && localLegacyReady
  const mode = normalizedRuntime as 'LEGACY' | 'SHADOW' | 'LEGACY_ROLLBACK'
  if (!legacyRuntimeReady) {
    return status({
      mode: 'BLOCKED', authority: 'NONE', valid: true, active: false,
      reasonCode: 'LEGACY_RUNTIME_NOT_EXPLICITLY_ENABLED', runtimeSelectorConfigured,
      legacyFlag, realtimeFlag, webhookFlag,
      legacyDirectClientEnabled: false, platformSyncEnabled: false, platformWebhookEnabled: false,
      realtimeBridgeEnabled: false, shadowPlatformEvaluationEnabled: false,
      providerIngressOwner: 'NONE', retryOwner: 'NONE', rollbackAvailable: legacyFlag.enabled,
    })
  }

  const shadowEnabled = mode === 'SHADOW' && webhookFlag.enabled
  return status({
    mode, authority: 'LEGACY', valid: true, active: true,
    reasonCode: mode === 'SHADOW'
      ? (shadowEnabled ? 'SHADOW_LEGACY_AUTHORITY' : 'SHADOW_WEBHOOK_MIRROR_DISABLED')
      : mode === 'LEGACY_ROLLBACK' ? 'EXPLICIT_LEGACY_ROLLBACK' : 'LEGACY_AUTHORITY_ACTIVE',
    runtimeSelectorConfigured,
    legacyFlag, realtimeFlag, webhookFlag,
    legacyDirectClientEnabled: true, platformSyncEnabled: false, platformWebhookEnabled: shadowEnabled,
    realtimeBridgeEnabled: false, shadowPlatformEvaluationEnabled: shadowEnabled,
    providerIngressOwner: 'REALTIME_LEGACY', retryOwner: 'REALTIME_LEGACY', rollbackAvailable: true,
  })
}
