export type MetaPhase29ReadMode = 'LEGACY' | 'SHADOW' | 'PLATFORM';
export type MetaPhase29WriteMode = 'LEGACY' | 'PLATFORM_TEST' | 'PLATFORM' | 'BLOCKED';
export type MetaPhase29Domain = 'ADS' | 'AUDIENCES';
export type MetaPhase29Environment = Readonly<Record<string, string | undefined>>;

function truthy(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value?.trim().toLowerCase() ?? '');
}

function positiveMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1_000 ? parsed : fallback;
}

function prefix(domain: MetaPhase29Domain) {
  return domain === 'ADS' ? 'META_PLATFORM_ADS' : 'META_PLATFORM_AUDIENCES';
}

export function resolveMetaPhase29ReadCutover(domain: MetaPhase29Domain, env: MetaPhase29Environment = process.env) {
  const key = prefix(domain);
  const platformEnabled = truthy(env[`${key}_READS`]);
  const shadowEnabled = truthy(env[`${key}_SHADOW`]);
  const legacyDisabled = truthy(env[`${key}_LEGACY_DISABLED`]);
  const mode: MetaPhase29ReadMode = platformEnabled || legacyDisabled ? 'PLATFORM' : shadowEnabled ? 'SHADOW' : 'LEGACY';
  return Object.freeze({
    domain,
    mode,
    platformEnabled,
    shadowEnabled,
    legacyDisabled,
    freshTtlMs: positiveMs(env.META_PLATFORM_ADS_READ_CACHE_FRESH_MS, 60_000),
    staleTtlMs: positiveMs(env.META_PLATFORM_ADS_READ_CACHE_STALE_MS, 6 * 60 * 60 * 1_000),
  });
}

export function resolveMetaPhase29WriteCutover(input: {
  readonly domain: MetaPhase29Domain;
  readonly resourceId?: string | null;
  readonly assetId?: string | null;
  readonly env?: MetaPhase29Environment;
}) {
  const env = input.env ?? process.env;
  const key = prefix(input.domain);
  const killSwitch = truthy(env[`${key}_KILL_SWITCH`]) || truthy(env.META_PLATFORM_ADS_GLOBAL_KILL_SWITCH);
  const platformEnabled = truthy(env[`${key}_WRITES`]);
  const legacyDisabled = truthy(env[`${key}_LEGACY_DISABLED`]);
  const configuredTestAssetId = env[`${key}_TEST_ASSET_ID`]?.trim() || '';
  const candidateIds = [input.resourceId, input.assetId].map((value) => value?.trim()).filter(Boolean);
  const selectedTestAsset = Boolean(configuredTestAssetId && candidateIds.includes(configuredTestAssetId));
  const mode: MetaPhase29WriteMode = killSwitch
    ? 'BLOCKED'
    : platformEnabled
      ? 'PLATFORM'
      : selectedTestAsset
        ? 'PLATFORM_TEST'
        : legacyDisabled
          ? 'BLOCKED'
          : 'LEGACY';
  return Object.freeze({ inputDomain: input.domain, mode, killSwitch, platformEnabled, legacyDisabled, configuredTestAssetId: configuredTestAssetId || null, selectedTestAsset });
}

export function assertMetaPhase29WriteAllowed(input: Parameters<typeof resolveMetaPhase29WriteCutover>[0]) {
  const cutover = resolveMetaPhase29WriteCutover(input);
  if (cutover.mode === 'BLOCKED') {
    const code = cutover.killSwitch ? 'META_PHASE29_WRITE_KILL_SWITCHED' : 'META_PHASE29_LEGACY_WRITE_DISABLED';
    throw Object.assign(new Error(code), { code });
  }
  return cutover;
}
