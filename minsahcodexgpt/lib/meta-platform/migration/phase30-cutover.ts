export type MetaPhase30ReadMode = 'LEGACY' | 'SHADOW' | 'PLATFORM';
export type MetaPhase30WriteMode = 'LEGACY' | 'PLATFORM_TEST' | 'PLATFORM' | 'BLOCKED';
export type MetaPhase30Environment = Readonly<Record<string, string | undefined>>;

function truthy(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value?.trim().toLowerCase() ?? '');
}
function positiveMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1_000 ? parsed : fallback;
}

export function resolveMetaPhase30ReadCutover(env: MetaPhase30Environment = process.env) {
  const platformEnabled = truthy(env.META_PLATFORM_CATALOG_READS);
  const shadowEnabled = truthy(env.META_PLATFORM_CATALOG_SHADOW);
  const legacyDisabled = truthy(env.META_PLATFORM_CATALOG_LEGACY_DISABLED);
  const mode: MetaPhase30ReadMode = platformEnabled || legacyDisabled ? 'PLATFORM' : shadowEnabled ? 'SHADOW' : 'LEGACY';
  return Object.freeze({
    mode, platformEnabled, shadowEnabled, legacyDisabled,
    freshTtlMs: positiveMs(env.META_PLATFORM_CATALOG_READ_CACHE_FRESH_MS, 60_000),
    staleTtlMs: positiveMs(env.META_PLATFORM_CATALOG_READ_CACHE_STALE_MS, 6 * 60 * 60 * 1_000),
  });
}

export function resolveMetaPhase30WriteCutover(input: { readonly catalogId?: string | null; readonly env?: MetaPhase30Environment }) {
  const env = input.env ?? process.env;
  const killSwitch = truthy(env.META_PLATFORM_CATALOG_KILL_SWITCH) || truthy(env.META_PLATFORM_GLOBAL_KILL_SWITCH);
  const platformEnabled = truthy(env.META_PLATFORM_CATALOG_WRITES);
  const legacyDisabled = truthy(env.META_PLATFORM_CATALOG_LEGACY_DISABLED);
  const testCatalogId = env.META_PLATFORM_CATALOG_TEST_CATALOG_ID?.trim() || '';
  const selectedTestAsset = Boolean(testCatalogId && input.catalogId?.trim() === testCatalogId);
  const mode: MetaPhase30WriteMode = killSwitch ? 'BLOCKED' : platformEnabled ? 'PLATFORM' : selectedTestAsset ? 'PLATFORM_TEST' : legacyDisabled ? 'BLOCKED' : 'LEGACY';
  return Object.freeze({ mode, killSwitch, platformEnabled, legacyDisabled, testCatalogId: testCatalogId || null, selectedTestAsset });
}

export function assertMetaPhase30WriteAllowed(input: Parameters<typeof resolveMetaPhase30WriteCutover>[0]) {
  const cutover = resolveMetaPhase30WriteCutover(input);
  if (cutover.mode === 'BLOCKED') {
    const code = cutover.killSwitch ? 'META_PHASE30_WRITE_KILL_SWITCHED' : 'META_PHASE30_LEGACY_WRITE_DISABLED';
    throw Object.assign(new Error(code), { code });
  }
  return cutover;
}

export function assertMetaPhase30MassDeleteOverride(input: { readonly required: boolean; readonly env?: MetaPhase30Environment }) {
  if (!input.required) return;
  const env = input.env ?? process.env;
  if (!truthy(env.META_PLATFORM_CATALOG_MASS_DELETE_OVERRIDE)) {
    throw Object.assign(new Error('META_CATALOG_MASS_DELETE_OVERRIDE_REQUIRED'), { code: 'META_CATALOG_MASS_DELETE_OVERRIDE_REQUIRED' });
  }
}
