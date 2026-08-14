import 'server-only';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { subscribePageToLeadgenLegacy } from '@/lib/meta-business/leads';
import { createMetaGraphClient } from '@/lib/meta/connection/client';
import { getMetaConnectionBootstrap } from '@/lib/meta/connection/config';
import { getLatestMetaConnectionReadiness } from '@/lib/meta/connection/repository';
import { assertMetaPageHealthReady, evaluateMetaPageHealth } from './page-identity';
import { getMetaPageDomainRuntimeMode } from './feature-flags';

export async function subscribeMetaPageLeadgenProduction(pageId?: string) {
  if (getMetaPageDomainRuntimeMode(process.env) === 'LEGACY_ROLLBACK') {
    return subscribePageToLeadgenLegacy(pageId);
  }
  const config = getMetaBusinessConfig();
  const bootstrap = getMetaConnectionBootstrap();
  const resolvedPageId = pageId?.trim() || config.pageId;
  const readiness = await getLatestMetaConnectionReadiness(bootstrap.connectionName);
  const health = evaluateMetaPageHealth({
    operation: 'LEADGEN_SUBSCRIBE',
    expectedPageId: resolvedPageId,
    expectedAppId: bootstrap.appId,
    expectedBusinessId: bootstrap.businessId,
    expectedInstagramAccountId: bootstrap.instagramAccountId,
    readiness,
    now: new Date(),
  });
  assertMetaPageHealthReady(health);
  if (!config.pageAccessToken || !resolvedPageId) {
    throw Object.assign(new Error('META_PAGE_TOKEN_NOT_CONFIGURED'), { code: 'META_PAGE_TOKEN_NOT_CONFIGURED', status: 409, retryable: false });
  }
  const client = createMetaGraphClient({
    accessToken: config.pageAccessToken,
    appSecret: config.appSecret,
    graphApiVersion: config.graphApiVersion,
  });
  const provider = await client.post<Record<string, unknown>>(
    `/${encodeURIComponent(resolvedPageId)}/subscribed_apps`,
    { subscribed_fields: ['leadgen'] },
    {},
    config.pageAccessToken,
  );
  return Object.freeze({
    pageId: resolvedPageId,
    subscribed: provider.success === true || provider.id === resolvedPageId,
    providerResult: provider.success === true ? 'SUCCESS' : 'ACCEPTED',
    health,
  });
}
