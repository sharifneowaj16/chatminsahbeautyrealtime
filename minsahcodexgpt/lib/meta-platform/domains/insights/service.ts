import 'server-only';

import { createEnvironmentMetaCredentialProvider } from '../../credentials/environment-provider';
import type { MetaCredentialProvider } from '../../credentials/types';
import { MetaBusinessSdkClientFactory } from '../../transports/business-sdk/client-factory';
import { createMetaAdAccountAsyncInsightsReport, getMetaAdAccountInsights, getMetaAsyncInsightsReportResults, getMetaAsyncInsightsReportStatus } from '../../transports/business-sdk/adapters/insights';
import { cleanMetaAdsObject } from '../ads/normalization';
import { getMetaPlatformAdsConfig } from '../ads/service';
import type { MetaPlatformAdsConfig } from '../ads/types';
import type { MetaPlatformInsightInput } from './types';

type ActionMetric = { action_type?: string; value?: string | number };

export const META_INSIGHT_FIELDS = Object.freeze([
  'account_id', 'account_name', 'campaign_id', 'campaign_name', 'adset_id',
  'adset_name', 'ad_id', 'ad_name', 'date_start', 'date_stop', 'impressions',
  'reach', 'frequency', 'clicks', 'inline_link_clicks', 'ctr', 'cpc', 'cpm',
  'spend', 'actions', 'action_values', 'purchase_roas', 'cost_per_action_type',
]);

function actionValue(items: unknown, matcher: RegExp) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    const metric = item as ActionMetric;
    return matcher.test(metric.action_type ?? '') ? total + Number(metric.value ?? 0) : total;
  }, 0);
}

function params(input: MetaPlatformInsightInput) {
  return cleanMetaAdsObject({
    level: input.level ?? 'campaign',
    time_range: input.since && input.until ? { since: input.since, until: input.until } : undefined,
    date_preset: input.datePreset ?? (!input.since ? 'last_30d' : undefined),
    breakdowns: input.breakdowns ? [...input.breakdowns] : undefined,
    filtering: input.filtering ? [...input.filtering] : undefined,
    limit: Math.min(500, Math.max(1, input.limit ?? 100)),
    action_report_time: 'conversion',
    use_account_attribution_setting: true,
  });
}

export class MetaPlatformInsightsService {
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

  async get(input: MetaPlatformInsightInput, correlationId?: string) {
    const cursor = await getMetaAdAccountInsights(await this.#client(correlationId), this.#config.adAccountId, META_INSIGHT_FIELDS, params(input));
    return Object.freeze({
      ...cursor,
      data: Object.freeze(cursor.data.map((row) => {
        const spend = Number(row.spend ?? 0);
        const purchaseValue = actionValue(row.action_values, /purchase/i);
        const purchases = actionValue(row.actions, /purchase/i);
        return Object.freeze({ ...row, calculated_purchase_value: purchaseValue, calculated_purchases: purchases, calculated_roas: spend > 0 ? purchaseValue / spend : 0 });
      })),
    });
  }

  async startAsyncReport(input: MetaPlatformInsightInput, correlationId?: string) {
    return createMetaAdAccountAsyncInsightsReport(await this.#client(correlationId), this.#config.adAccountId, META_INSIGHT_FIELDS, params(input));
  }

  async getAsyncReportStatus(reportRunId: string, correlationId?: string) {
    return getMetaAsyncInsightsReportStatus(await this.#client(correlationId), reportRunId);
  }

  async getAsyncReportResults(reportRunId: string, limit = 100, correlationId?: string) {
    return getMetaAsyncInsightsReportResults(await this.#client(correlationId), reportRunId, { fields: META_INSIGHT_FIELDS, limit });
  }
}
