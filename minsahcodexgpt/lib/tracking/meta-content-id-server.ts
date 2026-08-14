import 'server-only';

import {
  resolveMetaCatalogIdSourceEnv,
  type MetaCatalogIdentityEnvSource,
} from '@/lib/tracking/meta-content-id-env';

export const META_CATALOG_ID_ENV_KEYS = [
  'META_CATALOG_ID_SOURCE',
  'NEXT_PUBLIC_META_CATALOG_ID_SOURCE',
] as const;

export function isMetaCatalogRuntimeEnabled(source: NodeJS.ProcessEnv = process.env) {
  return Boolean(
    source.META_CATALOG_ID?.trim() ||
    source.META_CATALOG_CONNECTED === 'true' ||
    source.META_CATALOG_SYNC_ENABLED === 'true'
  );
}

export function getServerMetaCatalogIdSource(options: {
  source?: NodeJS.ProcessEnv;
  required?: boolean;
} = {}) {
  const source = options.source ?? process.env;
  const required =
    options.required ??
    (source.NODE_ENV === 'production' && isMetaCatalogRuntimeEnabled(source));

  return resolveMetaCatalogIdSourceEnv(source as MetaCatalogIdentityEnvSource, { required });
}

export function validateMetaCatalogIdentityEnvironment(
  source: NodeJS.ProcessEnv = process.env
) {
  return getServerMetaCatalogIdSource({ source });
}
