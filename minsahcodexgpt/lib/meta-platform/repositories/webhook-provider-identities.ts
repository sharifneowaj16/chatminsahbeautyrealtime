import 'server-only';

import { createMetaAssetContext, type MetaAssetBinding, type MetaPlatformEnvironment } from '../context/asset-context';
import {
  attachMetaSocialWebhookPrimaryIdentity,
  prismaMetaProviderIdentities,
  prismaMetaProviderIdentityRelationships,
} from './prisma-provider-identities';
import { MetaProviderIdentityError, type MetaProviderIdentityRecord } from './provider-identities';

export async function persistMetaLeadWebhookProviderIdentity(input: {
  readonly receiptId: string;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly pageId: string;
  readonly formId?: string | null;
  readonly pageConfigured: boolean;
  readonly formAllowlisted: boolean;
}) {
  const assets: MetaAssetBinding[] = [{ type: 'PAGE', id: input.pageId }];
  if (input.formId) assets.push({ type: 'LEAD_FORM', id: input.formId });
  const context = createMetaAssetContext({ environment: input.environment, connectionKey: input.connectionKey, assets });
  const now = new Date();
  const page = await prismaMetaProviderIdentities.register({
    context,
    assetType: 'PAGE',
    providerId: input.pageId,
    identityStatus: input.pageConfigured ? 'ACTIVE' : 'UNVERIFIED',
    permissionHealth: 'UNKNOWN',
    source: 'RUNTIME',
    seenAt: now,
    ...(input.pageConfigured ? { verifiedAt: now, statusReason: 'CONFIGURED_PAGE_MATCH' } : {}),
    metadata: { providerObjectType: 'page' },
  });

  let primary: MetaProviderIdentityRecord = page;
  let form: MetaProviderIdentityRecord | null = null;
  if (input.formId) {
    form = await prismaMetaProviderIdentities.register({
      context,
      assetType: 'LEAD_FORM',
      providerId: input.formId,
      identityStatus: input.formAllowlisted ? 'ACTIVE' : 'UNVERIFIED',
      permissionHealth: 'UNKNOWN',
      source: 'RUNTIME',
      seenAt: now,
      ...(input.formAllowlisted ? { verifiedAt: now, statusReason: 'CONFIGURED_FORM_MATCH' } : {}),
      metadata: { providerObjectType: 'lead_form' },
    });
    await prismaMetaProviderIdentityRelationships.link({
      relationshipType: 'PAGE_CONTAINS_LEAD_FORM',
      parentIdentityId: page.id,
      childIdentityId: form.id,
      status: input.formAllowlisted ? 'ACTIVE' : 'UNVERIFIED',
      source: 'RUNTIME',
      ...(input.formAllowlisted ? { verifiedAt: now } : {}),
    });
    primary = form;
  }
  await attachMetaSocialWebhookPrimaryIdentity({ receiptId: input.receiptId, identityId: primary.id });
  return Object.freeze({ page, form, primary });
}

export async function persistInstagramWebhookProviderIdentity(input: {
  readonly receiptId: string;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly eventAccountId: string;
  readonly configuredInstagramAccountId?: string | null;
  readonly configuredPageId?: string | null;
}) {
  const allowed = new Set([input.configuredInstagramAccountId, input.configuredPageId].filter((value): value is string => Boolean(value)));
  if (allowed.size > 0 && !allowed.has(input.eventAccountId)) {
    throw new MetaProviderIdentityError('META_PROVIDER_IDENTITY_SCOPE_MISMATCH', { assetType: 'INSTAGRAM_ACCOUNT' });
  }
  const instagramAccountId = input.configuredInstagramAccountId || input.eventAccountId;
  const assets: MetaAssetBinding[] = [{ type: 'INSTAGRAM_ACCOUNT', id: instagramAccountId }];
  if (input.configuredPageId) assets.push({ type: 'PAGE', id: input.configuredPageId });
  const context = createMetaAssetContext({ environment: input.environment, connectionKey: input.connectionKey, assets });
  const now = new Date();
  const configuredMatch = Boolean(input.configuredInstagramAccountId || input.configuredPageId);
  const instagram = await prismaMetaProviderIdentities.register({
    context,
    assetType: 'INSTAGRAM_ACCOUNT',
    providerId: instagramAccountId,
    identityStatus: configuredMatch ? 'ACTIVE' : 'UNVERIFIED',
    permissionHealth: 'UNKNOWN',
    source: 'RUNTIME',
    seenAt: now,
    ...(configuredMatch ? { verifiedAt: now, statusReason: 'CONFIGURED_ACCOUNT_MATCH' } : {}),
    metadata: { providerObjectType: 'instagram' },
  });
  let page: MetaProviderIdentityRecord | null = null;
  if (input.configuredPageId) {
    page = await prismaMetaProviderIdentities.register({
      context,
      assetType: 'PAGE',
      providerId: input.configuredPageId,
      identityStatus: 'ACTIVE',
      permissionHealth: 'UNKNOWN',
      source: 'RUNTIME',
      seenAt: now,
      verifiedAt: now,
      statusReason: 'CONFIGURED_PAGE_MATCH',
      metadata: { providerObjectType: 'page' },
    });
    await prismaMetaProviderIdentityRelationships.link({
      relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT',
      parentIdentityId: page.id,
      childIdentityId: instagram.id,
      status: 'ACTIVE',
      source: 'RUNTIME',
      verifiedAt: now,
    });
  }
  await attachMetaSocialWebhookPrimaryIdentity({ receiptId: input.receiptId, identityId: instagram.id });
  return Object.freeze({ instagram, page, primary: instagram });
}
