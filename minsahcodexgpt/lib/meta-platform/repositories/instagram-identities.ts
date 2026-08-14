import type { MetaPlatformEnvironment } from '../context/asset-context';
import { MetaProviderIdentityError, type MetaProviderIdentityRecord, type MetaProviderIdentityRepository } from './provider-identities';
import type { MetaProviderIdentityRelationshipRepository } from './provider-identity-relationships';

export async function resolveMetaInstagramIdentity(input: {
  readonly repository: MetaProviderIdentityRepository;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly instagramAccountId: string;
  readonly requireWritable?: boolean;
}): Promise<MetaProviderIdentityRecord> {
  const identity = await input.repository.resolve({
    environment: input.environment,
    connectionKey: input.connectionKey,
    assetType: 'INSTAGRAM_ACCOUNT',
    providerId: input.instagramAccountId,
  });
  if (!identity) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_FOUND', { assetType: 'INSTAGRAM_ACCOUNT' });
  if (identity.identityStatus === 'REVOKED') throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_REVOKED', { assetType: 'INSTAGRAM_ACCOUNT' });
  if (identity.identityStatus === 'INACTIVE') throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_INACTIVE', { assetType: 'INSTAGRAM_ACCOUNT' });
  if (input.requireWritable && (identity.identityStatus !== 'ACTIVE' || identity.permissionHealth !== 'HEALTHY')) {
    throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_WRITABLE', { assetType: 'INSTAGRAM_ACCOUNT' });
  }
  return identity;
}

export async function verifyMetaPageInstagramBinding(input: {
  readonly relationships: MetaProviderIdentityRelationshipRepository;
  readonly pageIdentityId: string;
  readonly instagramIdentityId: string;
}) {
  const relation = await input.relationships.find({
    relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT',
    parentIdentityId: input.pageIdentityId,
    childIdentityId: input.instagramIdentityId,
  });
  if (!relation || relation.status === 'INACTIVE' || relation.status === 'REVOKED') {
    throw new MetaProviderIdentityError('META_PROVIDER_RELATION_MISMATCH', { relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT' });
  }
  return relation;
}
