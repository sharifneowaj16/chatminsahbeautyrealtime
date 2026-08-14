import {
  normalizeMetaCatalogIdSource,
  type MetaCatalogIdSource,
} from '@/lib/tracking/meta-content-id';

export class MetaCatalogIdentityEnvError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid Meta catalog identity environment: ${issues.join('; ')}`);
    this.name = 'MetaCatalogIdentityEnvError';
    this.issues = issues;
  }
}

export type MetaCatalogIdentityEnvSource = {
  META_CATALOG_ID_SOURCE?: string;
  NEXT_PUBLIC_META_CATALOG_ID_SOURCE?: string;
};

export function resolveMetaCatalogIdSourceEnv(
  source: MetaCatalogIdentityEnvSource,
  options: { required?: boolean } = {}
): MetaCatalogIdSource | null {
  const serverRaw = source.META_CATALOG_ID_SOURCE?.trim();
  const publicRaw = source.NEXT_PUBLIC_META_CATALOG_ID_SOURCE?.trim();
  const serverSource = normalizeMetaCatalogIdSource(serverRaw);
  const publicSource = normalizeMetaCatalogIdSource(publicRaw);
  const issues: string[] = [];

  if (serverRaw && !serverSource) {
    issues.push('META_CATALOG_ID_SOURCE must be sku or database_id');
  }
  if (publicRaw && !publicSource) {
    issues.push('NEXT_PUBLIC_META_CATALOG_ID_SOURCE must be sku or database_id');
  }
  if (serverSource && publicSource && serverSource !== publicSource) {
    issues.push(
      `META_CATALOG_ID_SOURCE (${serverSource}) must match NEXT_PUBLIC_META_CATALOG_ID_SOURCE (${publicSource})`
    );
  }
  if (options.required && (!serverSource || !publicSource)) {
    issues.push(
      'META_CATALOG_ID_SOURCE and NEXT_PUBLIC_META_CATALOG_ID_SOURCE are both required for an enabled production Meta catalog'
    );
  }

  if (issues.length > 0) throw new MetaCatalogIdentityEnvError([...new Set(issues)]);
  return serverSource ?? publicSource ?? null;
}
