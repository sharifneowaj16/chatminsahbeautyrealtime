export type MetaPageDomainRuntimeMode = 'DOMAIN' | 'LEGACY_ROLLBACK';
export function getMetaPageDomainRuntimeMode(env: Readonly<Record<string, string | undefined>> = {}): MetaPageDomainRuntimeMode {
  return env.META_PHASE31_PAGE_DOMAIN_RUNTIME === 'LEGACY_ROLLBACK' ? 'LEGACY_ROLLBACK' : 'DOMAIN';
}
