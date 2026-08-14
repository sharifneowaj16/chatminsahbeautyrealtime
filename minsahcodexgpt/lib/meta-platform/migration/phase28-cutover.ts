export type MetaConnectionCutoverMode = 'LEGACY' | 'SHADOW' | 'PLATFORM';
export type MetaCapiCutoverMode = 'LEGACY' | 'PLATFORM_TEST' | 'PLATFORM_CANARY' | 'PLATFORM';

export type MetaPhase28Environment = Readonly<Record<string, string | undefined>>;

function truthy(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value?.trim().toLowerCase() ?? '');
}

function percent(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

export function stableMetaCanaryBucket(identity: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % 10_000;
}

export function resolveMetaConnectionCutover(env: MetaPhase28Environment = process.env) {
  const platformEnabled = truthy(env.META_PLATFORM_CONNECTION_READS);
  const shadowEnabled = truthy(env.META_PLATFORM_CONNECTION_SHADOW);
  const legacyDisabled = truthy(env.META_PLATFORM_CONNECTION_LEGACY_DISABLED);
  const mode: MetaConnectionCutoverMode = platformEnabled || legacyDisabled ? 'PLATFORM' : shadowEnabled ? 'SHADOW' : 'LEGACY';
  return Object.freeze({ mode, platformEnabled, shadowEnabled, legacyDisabled });
}

export function resolveMetaCapiCutover(input: {
  readonly eventId: string;
  readonly testEventCode?: string | null;
  readonly env?: MetaPhase28Environment;
}) {
  const env = input.env ?? process.env;
  const platformEnabled = truthy(env.META_PLATFORM_CAPI_WRITES);
  const testEventsEnabled = truthy(env.META_PLATFORM_CAPI_TEST_EVENTS);
  const legacyDisabled = truthy(env.META_PLATFORM_CAPI_LEGACY_DISABLED);
  const canaryPercent = percent(env.META_PLATFORM_CAPI_CANARY_PERCENT);
  const bucket = stableMetaCanaryBucket(input.eventId.trim());
  const selectedByCanary = canaryPercent > 0 && bucket < Math.round(canaryPercent * 100);
  const selectedTest = Boolean(input.testEventCode?.trim()) && testEventsEnabled;
  const mode: MetaCapiCutoverMode = platformEnabled
    ? 'PLATFORM'
    : selectedTest
      ? 'PLATFORM_TEST'
      : selectedByCanary
        ? 'PLATFORM_CANARY'
        : 'LEGACY';
  return Object.freeze({
    mode,
    platformEnabled,
    testEventsEnabled,
    legacyDisabled,
    canaryPercent,
    bucket,
    selected: mode !== 'LEGACY',
  });
}
