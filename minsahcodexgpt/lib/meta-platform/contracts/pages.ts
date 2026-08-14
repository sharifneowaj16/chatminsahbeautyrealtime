import {
  createMetaProviderIdentity,
  isMetaProviderIdentity,
  type CreateMetaProviderIdentityInput,
  type MetaProviderIdentity,
} from './social.ts';

export const META_PAGE_ACCOUNT_BINDING_SCHEMA_VERSION = 1 as const;

export type MetaPageIdentity = MetaProviderIdentity & { readonly assetType: 'PAGE' };
export type MetaInstagramAccountIdentity = MetaProviderIdentity & { readonly assetType: 'INSTAGRAM_ACCOUNT' };

export interface MetaPageAccountBinding {
  readonly schemaVersion: typeof META_PAGE_ACCOUNT_BINDING_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly bindingKey: string;
  readonly page: MetaPageIdentity;
  readonly instagramAccount: MetaInstagramAccountIdentity | null;
}

export interface CreateMetaPageAccountBindingInput {
  readonly page: CreateMetaProviderIdentityInput & { readonly assetType: 'PAGE' };
  readonly instagramAccount?: (CreateMetaProviderIdentityInput & { readonly assetType: 'INSTAGRAM_ACCOUNT' }) | null;
}

export function createMetaPageAccountBinding(input: CreateMetaPageAccountBindingInput): MetaPageAccountBinding {
  const page = createMetaProviderIdentity(input.page) as MetaPageIdentity;
  const instagramAccount = input.instagramAccount
    ? createMetaProviderIdentity({ ...input.instagramAccount, pageId: input.instagramAccount.pageId ?? page.providerId }) as MetaInstagramAccountIdentity
    : null;

  if (instagramAccount) {
    if (instagramAccount.environment !== page.environment) {
      throw new TypeError('META_PAGE_INSTAGRAM_ENVIRONMENT_MISMATCH');
    }
    if (instagramAccount.connectionKey !== page.connectionKey) {
      throw new TypeError('META_PAGE_INSTAGRAM_CONNECTION_MISMATCH');
    }
    if (instagramAccount.pageId !== page.providerId) {
      throw new TypeError('META_PAGE_INSTAGRAM_PAGE_MISMATCH');
    }
    if (page.businessId && instagramAccount.businessId && page.businessId !== instagramAccount.businessId) {
      throw new TypeError('META_PAGE_INSTAGRAM_BUSINESS_MISMATCH');
    }
    if (page.appId && instagramAccount.appId && page.appId !== instagramAccount.appId) {
      throw new TypeError('META_PAGE_INSTAGRAM_APP_MISMATCH');
    }
  }

  return Object.freeze({
    schemaVersion: META_PAGE_ACCOUNT_BINDING_SCHEMA_VERSION,
    provider: 'META' as const,
    bindingKey: `${page.identityKey}:INSTAGRAM:${instagramAccount?.providerId ?? 'NONE'}`,
    page,
    instagramAccount,
  });
}

export function isMetaPageAccountBinding(value: unknown): value is MetaPageAccountBinding {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Readonly<Record<string, unknown>>;
  if (candidate.schemaVersion !== META_PAGE_ACCOUNT_BINDING_SCHEMA_VERSION
    || candidate.provider !== 'META'
    || typeof candidate.bindingKey !== 'string'
    || !isMetaProviderIdentity(candidate.page)
    || candidate.page.assetType !== 'PAGE'
    || (candidate.instagramAccount !== null
      && (!isMetaProviderIdentity(candidate.instagramAccount)
        || candidate.instagramAccount.assetType !== 'INSTAGRAM_ACCOUNT'))) {
    return false;
  }

  try {
    const page = candidate.page as MetaPageIdentity;
    const instagramAccount = candidate.instagramAccount as MetaInstagramAccountIdentity | null;
    const normalized = createMetaPageAccountBinding({
      page,
      instagramAccount,
    });
    return normalized.bindingKey === candidate.bindingKey;
  } catch {
    return false;
  }
}
