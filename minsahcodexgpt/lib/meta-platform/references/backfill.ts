import { assertMetaReferenceScope, type MetaAssetContext, type MetaAssetType } from '../context/asset-context';
import type { RegisterMetaExternalReferenceInput } from './types';

export interface MetaConnectionAssetSnapshot {
  readonly id: string;
  readonly name: string;
  readonly appId?: string | null;
  readonly businessId?: string | null;
  readonly adAccountId?: string | null;
  readonly catalogId?: string | null;
  readonly datasetId?: string | null;
  readonly pixelId?: string | null;
  readonly pageId?: string | null;
  readonly instagramAccountId?: string | null;
}

const ASSET_FIELDS: readonly [keyof MetaConnectionAssetSnapshot, MetaAssetType][] = [
  ['appId', 'APP'],
  ['businessId', 'BUSINESS'],
  ['adAccountId', 'AD_ACCOUNT'],
  ['catalogId', 'CATALOG'],
  ['datasetId', 'DATASET'],
  ['pixelId', 'PIXEL'],
  ['pageId', 'PAGE'],
  ['instagramAccountId', 'INSTAGRAM_ACCOUNT'],
];

export function buildMetaConnectionReferenceBackfill(
  context: MetaAssetContext,
  snapshot: MetaConnectionAssetSnapshot,
): readonly RegisterMetaExternalReferenceInput[] {
  if (snapshot.name.trim() !== context.connectionKey) throw new TypeError('META_BACKFILL_CONNECTION_MISMATCH');
  const references: RegisterMetaExternalReferenceInput[] = [];

  for (const [field, assetType] of ASSET_FIELDS) {
    const value = snapshot[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    const candidate: RegisterMetaExternalReferenceInput = {
      environment: context.environment,
      connectionKey: context.connectionKey,
      assetType,
      assetId: value.trim(),
      objectType: 'ASSET_BINDING',
      localId: `meta-connection:${snapshot.id}:${assetType}`,
      providerId: value.trim(),
      source: 'BACKFILL',
      metadata: Object.freeze({ connectionName: snapshot.name.trim(), sourceField: String(field) }),
    };
    assertMetaReferenceScope(context, candidate);
    references.push(Object.freeze(candidate));
  }

  return Object.freeze(references);
}
