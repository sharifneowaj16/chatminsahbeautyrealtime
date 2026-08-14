import type { MetaPlatformEnvironment } from '../context/asset-context';
import { MetaProviderIdentityError, type MetaProviderIdentityRecord, type MetaProviderIdentityRepository } from './provider-identities';
import type { MetaProviderIdentityRelationshipRepository } from './provider-identity-relationships';

export async function resolveMetaLeadFormIdentity(input: {
  readonly repository: MetaProviderIdentityRepository;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly formId: string;
}): Promise<MetaProviderIdentityRecord> {
  const identity = await input.repository.resolve({
    environment: input.environment,
    connectionKey: input.connectionKey,
    assetType: 'LEAD_FORM',
    providerId: input.formId,
  });
  if (!identity) throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_NOT_FOUND', { assetType: 'LEAD_FORM' });
  if (identity.identityStatus === 'REVOKED') throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_REVOKED', { assetType: 'LEAD_FORM' });
  if (identity.identityStatus === 'INACTIVE') throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_INACTIVE', { assetType: 'LEAD_FORM' });
  return identity;
}

export async function verifyMetaPageLeadFormBinding(input: {
  readonly relationships: MetaProviderIdentityRelationshipRepository;
  readonly pageIdentityId: string;
  readonly leadFormIdentityId: string;
}) {
  const relation = await input.relationships.find({
    relationshipType: 'PAGE_CONTAINS_LEAD_FORM',
    parentIdentityId: input.pageIdentityId,
    childIdentityId: input.leadFormIdentityId,
  });
  if (!relation || relation.status === 'INACTIVE' || relation.status === 'REVOKED') {
    throw new MetaProviderIdentityError('META_PROVIDER_RELATION_MISMATCH', { relationshipType: 'PAGE_CONTAINS_LEAD_FORM' });
  }
  return relation;
}
