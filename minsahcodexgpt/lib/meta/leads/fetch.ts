import 'server-only';
import { createMetaGraphClient } from '@/lib/meta/connection/client';
import { getMetaLeadConfig } from './config';
import {
  MetaLeadFetchError,
  fetchMetaLeadWithClient,
  validateMetaLeadFreshness,
} from '@/lib/meta-platform/domains/leads/fetch-contract';

export { MetaLeadFetchError, validateMetaLeadFreshness };

export async function fetchMetaLeadGraphRecord(input: {
  leadgenId: string;
  fetchImpl?: typeof fetch;
  now?: Date;
}) {
  const config = getMetaLeadConfig();
  if (!config.pageAccessToken) throw new MetaLeadFetchError({ code: 'META_PAGE_ACCESS_TOKEN_REQUIRED', message: 'Meta Page access token is not configured.', retrievalStatus: 'TOKEN_ERROR', permanent: false });
  const client = createMetaGraphClient({ accessToken: config.pageAccessToken, appSecret: config.appSecret, graphApiVersion: config.graphApiVersion, fetchImpl: input.fetchImpl, timeoutMs: 15_000 });
  return fetchMetaLeadWithClient({
    leadgenId: input.leadgenId,
    client,
    now: input.now,
    maxAgeSeconds: config.maxRetrievalAgeSeconds,
  });
}
