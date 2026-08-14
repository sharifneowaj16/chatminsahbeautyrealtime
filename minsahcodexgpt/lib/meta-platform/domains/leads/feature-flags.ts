export type MetaLeadRuntimeMode = 'DOMAIN' | 'LEGACY_ROLLBACK';

export function getMetaLeadRuntimeMode(env: Readonly<Record<string, string | undefined>> = {}): MetaLeadRuntimeMode {
  return env.META_PHASE31_LEAD_RUNTIME === 'LEGACY_ROLLBACK' ? 'LEGACY_ROLLBACK' : 'DOMAIN';
}
