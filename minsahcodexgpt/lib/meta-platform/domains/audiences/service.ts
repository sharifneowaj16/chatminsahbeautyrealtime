import 'server-only';

import { createEnvironmentMetaCredentialProvider } from '../../credentials/environment-provider';
import type { MetaCredentialProvider } from '../../credentials/types';
import { MetaBusinessSdkClientFactory } from '../../transports/business-sdk/client-factory';
import { createMetaCustomAudience, getMetaCustomAudience, listMetaCustomAudiences, mutateMetaCustomAudienceUsers, updateMetaCustomAudience } from '../../transports/business-sdk/adapters/audiences';
import { cleanMetaAdsObject } from '../ads/normalization';
import { getMetaPlatformAdsConfig } from '../ads/service';
import type { MetaPlatformAdsConfig } from '../ads/types';
import type { MetaAudienceHashedBatch, MetaAudienceMemberMode } from './types';

export const META_AUDIENCE_FIELDS = Object.freeze([
  'id', 'name', 'description', 'subtype', 'approximate_count_lower_bound',
  'approximate_count_upper_bound', 'delivery_status', 'operation_status',
  'retention_days', 'time_created', 'time_updated', 'customer_file_source',
  'lookalike_spec', 'rule', 'permission_for_actions',
]);

function chunkRows<T>(items: readonly T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output;
}

export function buildMetaWebsiteAudienceRule(pixelId: string, eventName: string, retentionDays: number) {
  return {
    inclusions: {
      operator: 'or',
      rules: [{
        event_sources: [{ id: pixelId, type: 'pixel' }],
        retention_seconds: retentionDays * 86_400,
        filter: { operator: 'and', filters: [{ field: 'event', operator: 'eq', value: eventName }] },
      }],
    },
  };
}

export class MetaPlatformAudiencesService {
  readonly #factory: MetaBusinessSdkClientFactory;
  readonly #config: MetaPlatformAdsConfig;

  constructor(input: { readonly credentialProvider?: MetaCredentialProvider; readonly config?: MetaPlatformAdsConfig } = {}) {
    const credentialProvider = input.credentialProvider ?? createEnvironmentMetaCredentialProvider();
    this.#factory = new MetaBusinessSdkClientFactory({ credentialProvider, appCredentialProvider: credentialProvider });
    this.#config = input.config ?? getMetaPlatformAdsConfig();
  }

  async #client(correlationId?: string) {
    return this.#factory.getClient({ capability: 'ads-marketing', connectionKey: this.#config.connectionKey, credentialRole: 'BUSINESS_SYSTEM_USER', graphApiVersion: this.#config.graphApiVersion, correlationId });
  }

  async list(params: Record<string, unknown> = {}, correlationId?: string) {
    return listMetaCustomAudiences(await this.#client(correlationId), { adAccountId: this.#config.adAccountId, fields: META_AUDIENCE_FIELDS, params });
  }

  async get(audienceId: string, correlationId?: string) {
    return getMetaCustomAudience(await this.#client(correlationId), { audienceId, fields: META_AUDIENCE_FIELDS });
  }

  async createCustomerFile(input: { readonly name: string; readonly description?: string; readonly customerFileSource?: string; readonly valueBased?: boolean }, correlationId?: string) {
    return createMetaCustomAudience(await this.#client(correlationId), { adAccountId: this.#config.adAccountId, fields: META_AUDIENCE_FIELDS, params: cleanMetaAdsObject({
      name: input.name, description: input.description, subtype: 'CUSTOM', customer_file_source: input.customerFileSource ?? 'USER_PROVIDED_ONLY', is_value_based: input.valueBased || undefined,
    }) });
  }

  async createLookalike(input: { readonly name: string; readonly originAudienceId: string; readonly country?: string; readonly ratio?: number; readonly description?: string }, correlationId?: string) {
    const ratio = Math.min(Math.max(input.ratio ?? 0.01, 0.01), 0.2);
    return createMetaCustomAudience(await this.#client(correlationId), { adAccountId: this.#config.adAccountId, fields: META_AUDIENCE_FIELDS, params: cleanMetaAdsObject({
      name: input.name, description: input.description, subtype: 'LOOKALIKE', origin_audience_id: input.originAudienceId,
      lookalike_spec: { type: 'similarity', ratio, country: (input.country ?? 'BD').toUpperCase() },
    }) });
  }

  async createWebsite(input: { readonly name: string; readonly eventName: string; readonly retentionDays?: number; readonly description?: string; readonly rule?: Record<string, unknown> }, correlationId?: string) {
    if (!this.#config.pixelId) throw new Error('META_PIXEL_ID_REQUIRED');
    const retentionDays = Math.min(Math.max(input.retentionDays ?? 30, 1), 180);
    return createMetaCustomAudience(await this.#client(correlationId), { adAccountId: this.#config.adAccountId, fields: META_AUDIENCE_FIELDS, params: cleanMetaAdsObject({
      name: input.name, description: input.description, subtype: 'WEBSITE', retention_days: retentionDays,
      rule: JSON.stringify(input.rule ?? buildMetaWebsiteAudienceRule(this.#config.pixelId, input.eventName, retentionDays)), prefill: true,
    }) });
  }

  async update(audienceId: string, input: Record<string, unknown>, correlationId?: string) {
    return updateMetaCustomAudience(await this.#client(correlationId), { audienceId, fields: META_AUDIENCE_FIELDS, params: cleanMetaAdsObject({
      ...input, rule: input.rule && typeof input.rule !== 'string' ? JSON.stringify(input.rule) : input.rule,
    }) });
  }

  async syncHashed(input: { readonly audienceId: string; readonly batch: MetaAudienceHashedBatch; readonly mode?: MetaAudienceMemberMode }, correlationId?: string) {
    const batches = chunkRows(input.batch.rows, 10_000);
    const responses: Record<string, unknown>[] = [];
    let processed = 0;
    const sessionId = Date.now();
    const client = await this.#client(correlationId);
    for (const [index, data] of batches.entries()) {
      const result = await mutateMetaCustomAudienceUsers(client, {
        audienceId: input.audienceId,
        mode: input.mode ?? 'add',
        payload: { schema: input.batch.schema, data },
        session: { session_id: sessionId, batch_seq: index + 1, last_batch_flag: index === batches.length - 1, estimated_num_total: input.batch.rows.length },
      });
      responses.push(result);
      processed += data.length;
    }
    return Object.freeze({ audienceId: input.audienceId, mode: input.mode ?? 'add', processed, rejected: input.batch.rejected, batches: batches.length, responses: Object.freeze(responses) });
  }
}
