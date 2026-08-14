import { createMetaAssetContext, type MetaAssetBinding, type MetaAssetContext, type MetaAssetType } from '../context/asset-context';
import type { MetaConnectionAssetSnapshot } from '../references/backfill';
import type { RegisterMetaProviderIdentityInput } from './provider-identities';
import type { MetaProviderIdentityRelationshipType } from './provider-identity-relationships';

const FIELDS: readonly [keyof MetaConnectionAssetSnapshot, MetaAssetType][] = Object.freeze([
  ['appId', 'APP'],
  ['businessId', 'BUSINESS'],
  ['adAccountId', 'AD_ACCOUNT'],
  ['pageId', 'PAGE'],
  ['instagramAccountId', 'INSTAGRAM_ACCOUNT'],
]);

export interface MetaProviderIdentityBackfillRelationPlan {
  readonly relationshipType: MetaProviderIdentityRelationshipType;
  readonly parentAssetType: MetaAssetType;
  readonly childAssetType: MetaAssetType;
}

export interface MetaProviderIdentityBackfillPlan {
  readonly context: MetaAssetContext;
  readonly identities: readonly Omit<RegisterMetaProviderIdentityInput, 'context'>[];
  readonly relationships: readonly MetaProviderIdentityBackfillRelationPlan[];
}

export function buildMetaProviderIdentityBackfillPlan(input: {
  readonly environment: MetaAssetContext['environment'];
  readonly connectionKey: string;
  readonly snapshot: MetaConnectionAssetSnapshot;
}): MetaProviderIdentityBackfillPlan {
  if (input.snapshot.name.trim() !== input.connectionKey.trim()) throw new TypeError('META_BACKFILL_CONNECTION_MISMATCH');
  const assets: MetaAssetBinding[] = [];
  const identities: Omit<RegisterMetaProviderIdentityInput, 'context'>[] = [];
  const present = new Set<MetaAssetType>();
  for (const [field, assetType] of FIELDS) {
    const raw = input.snapshot[field];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const providerId = raw.trim();
    assets.push({ type: assetType, id: providerId });
    present.add(assetType);
    identities.push(Object.freeze({
      assetType: assetType as RegisterMetaProviderIdentityInput['assetType'],
      providerId,
      identityStatus: 'UNVERIFIED',
      permissionHealth: 'UNKNOWN',
      source: 'BACKFILL',
      metadata: Object.freeze({ connectionName: input.snapshot.name.trim(), sourceField: String(field) }),
    }));
  }
  const relationships: MetaProviderIdentityBackfillRelationPlan[] = [];
  if (present.has('APP') && present.has('BUSINESS')) relationships.push(Object.freeze({ relationshipType: 'APP_ASSOCIATED_WITH_BUSINESS', parentAssetType: 'APP', childAssetType: 'BUSINESS' }));
  if (present.has('BUSINESS') && present.has('PAGE')) relationships.push(Object.freeze({ relationshipType: 'BUSINESS_OWNS_PAGE', parentAssetType: 'BUSINESS', childAssetType: 'PAGE' }));
  if (present.has('BUSINESS') && present.has('AD_ACCOUNT')) relationships.push(Object.freeze({ relationshipType: 'BUSINESS_OWNS_AD_ACCOUNT', parentAssetType: 'BUSINESS', childAssetType: 'AD_ACCOUNT' }));
  if (present.has('PAGE') && present.has('INSTAGRAM_ACCOUNT')) relationships.push(Object.freeze({ relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT', parentAssetType: 'PAGE', childAssetType: 'INSTAGRAM_ACCOUNT' }));
  return Object.freeze({
    context: createMetaAssetContext({ environment: input.environment, connectionKey: input.connectionKey, assets }),
    identities: Object.freeze(identities),
    relationships: Object.freeze(relationships),
  });
}
