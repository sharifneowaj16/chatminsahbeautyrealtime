import type { MetaPlatformEnvironment } from '../context/asset-context';
import { MetaProviderIdentityError, type MetaProviderIdentityRecord, type MetaProviderIdentityRepository } from './provider-identities';
import type { MetaProviderIdentityRelationshipRepository } from './provider-identity-relationships';

export async function resolveMetaPageIdentity(input: {
  readonly repository: MetaProviderIdentityRepository;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly pageId: string;
  readonly requireWritable?: boolean;
}): Promise<MetaProviderIdentityRecord> {
  const identity = await input.repository.resolve({
    environment: input.environment,
    connectionKey: input.connectionKey,
    assetType: 'PAGE',
    providerId: input.pageId,
  });
  if (!identity) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_FOUND', { assetType: 'PAGE' });
  if (identity.identityStatus === 'REVOKED') throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_REVOKED', { assetType: 'PAGE' });
  if (identity.identityStatus === 'INACTIVE') throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_INACTIVE', { assetType: 'PAGE' });
  if (input.requireWritable && (identity.identityStatus !== 'ACTIVE' || identity.permissionHealth !== 'HEALTHY')) {
    throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_WRITABLE', { assetType: 'PAGE' });
  }
  return identity;
}

export async function getMetaBusinessForPage(input: {
  readonly relationships: MetaProviderIdentityRelationshipRepository;
  readonly pageIdentityId: string;
}) {
  const rows = await input.relationships.listByChild({
    relationshipType: 'BUSINESS_OWNS_PAGE',
    childIdentityId: input.pageIdentityId,
  });
  const active = rows.filter((row) => row.status === 'ACTIVE' || row.status === 'UNVERIFIED');
  if (active.length > 1) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_AMBIGUOUS', { relationshipType: 'BUSINESS_OWNS_PAGE' });
  return active[0] ?? null;
}
