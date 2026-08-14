import 'server-only';

import { createEnvironmentMetaCredentialProvider } from '../../credentials/environment-provider';
import type { MetaCredentialProvider } from '../../credentials/types';
import { getMetaPlatformConnectionConfig } from '../connection/config';
import { MetaBusinessSdkClientFactory } from '../../transports/business-sdk/client-factory';
import {
  createMetaAdAccountEntity,
  getMetaAdAccount,
  getMetaAdsEntity,
  listMetaAdAccountEntities,
  updateMetaAdsEntity,
  type MetaAdsSdkAccountCollection,
  type MetaAdsSdkAccountCreate,
  type MetaAdsSdkEntity,
} from '../../transports/business-sdk/adapters/ads';
import { cleanMetaAdsObject, normalizeMetaTargeting, toMetaAdsMinorAmount } from './normalization';
import type { MetaPlatformAdsConfig } from './types';

export const META_AD_ACCOUNT_FIELDS = Object.freeze([
  'id', 'account_id', 'name', 'account_status', 'currency', 'timezone_name',
  'timezone_offset_hours_utc', 'amount_spent', 'balance', 'spend_cap',
  'business', 'disable_reason', 'funding_source_details',
]);
export const META_CAMPAIGN_FIELDS = Object.freeze([
  'id', 'name', 'objective', 'status', 'effective_status', 'buying_type',
  'daily_budget', 'lifetime_budget', 'budget_remaining', 'bid_strategy',
  'start_time', 'stop_time', 'created_time', 'updated_time',
]);
export const META_ADSET_FIELDS = Object.freeze([
  'id', 'name', 'campaign_id', 'status', 'effective_status', 'daily_budget',
  'lifetime_budget', 'budget_remaining', 'bid_amount', 'bid_strategy',
  'billing_event', 'optimization_goal', 'targeting', 'promoted_object',
  'start_time', 'end_time', 'created_time', 'updated_time',
]);
export const META_CREATIVE_FIELDS = Object.freeze([
  'id', 'name', 'status', 'object_story_spec', 'asset_feed_spec', 'thumbnail_url',
  'image_url', 'image_hash', 'instagram_actor_id', 'effective_object_story_id',
]);
export const META_AD_FIELDS = Object.freeze([
  'id', 'name', 'adset_id', 'campaign_id', 'status', 'effective_status',
  'creative', 'tracking_specs', 'created_time', 'updated_time',
]);

function normalizeAdAccountId(value: string | undefined): string {
  const id = value?.trim();
  if (!id) throw new Error('META_AD_ACCOUNT_ID_REQUIRED');
  return id.startsWith('act_') ? id : `act_${id}`;
}

export function getMetaPlatformAdsConfig(env: NodeJS.ProcessEnv = process.env): MetaPlatformAdsConfig {
  const connection = getMetaPlatformConnectionConfig(env);
  return Object.freeze({
    connectionKey: connection.connectionName,
    graphApiVersion: connection.graphApiVersion,
    adAccountId: normalizeAdAccountId(connection.adAccountId),
    ...(connection.pageId ? { pageId: connection.pageId } : {}),
    ...(connection.instagramAccountId ? { instagramActorId: connection.instagramAccountId } : {}),
    ...(connection.pixelId ? { pixelId: connection.pixelId } : {}),
  });
}

const ENTITY = {
  CAMPAIGN: { exportName: 'Campaign' as MetaAdsSdkEntity, fields: META_CAMPAIGN_FIELDS, collection: 'getCampaigns' as MetaAdsSdkAccountCollection, create: 'createCampaign' as MetaAdsSdkAccountCreate },
  ADSET: { exportName: 'AdSet' as MetaAdsSdkEntity, fields: META_ADSET_FIELDS, collection: 'getAdSets' as MetaAdsSdkAccountCollection, create: 'createAdSet' as MetaAdsSdkAccountCreate },
  CREATIVE: { exportName: 'AdCreative' as MetaAdsSdkEntity, fields: META_CREATIVE_FIELDS, collection: 'getAdCreatives' as MetaAdsSdkAccountCollection, create: 'createAdCreative' as MetaAdsSdkAccountCreate },
  AD: { exportName: 'Ad' as MetaAdsSdkEntity, fields: META_AD_FIELDS, collection: 'getAds' as MetaAdsSdkAccountCollection, create: 'createAd' as MetaAdsSdkAccountCreate },
} as const;

export class MetaPlatformAdsService {
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

  async getAccount(correlationId?: string) {
    return getMetaAdAccount(await this.#client(correlationId), this.#config.adAccountId, META_AD_ACCOUNT_FIELDS);
  }

  async list(entityType: keyof typeof ENTITY, params: Record<string, unknown> = {}, correlationId?: string) {
    const descriptor = ENTITY[entityType];
    return listMetaAdAccountEntities(await this.#client(correlationId), { adAccountId: this.#config.adAccountId, method: descriptor.collection, fields: descriptor.fields, params });
  }

  async get(entityType: keyof typeof ENTITY, id: string, correlationId?: string) {
    const descriptor = ENTITY[entityType];
    return getMetaAdsEntity(await this.#client(correlationId), { exportName: descriptor.exportName, id, fields: descriptor.fields });
  }

  async create(entityType: keyof typeof ENTITY, input: Record<string, unknown>, correlationId?: string) {
    const descriptor = ENTITY[entityType];
    return createMetaAdAccountEntity(await this.#client(correlationId), {
      adAccountId: this.#config.adAccountId,
      method: descriptor.create,
      fields: descriptor.fields,
      params: this.#providerInput(entityType, input, true),
    });
  }

  async update(entityType: keyof typeof ENTITY, id: string, input: Record<string, unknown>, correlationId?: string) {
    const descriptor = ENTITY[entityType];
    return updateMetaAdsEntity(await this.#client(correlationId), {
      exportName: descriptor.exportName,
      id,
      fields: descriptor.fields,
      params: this.#providerInput(entityType, input, false),
    });
  }

  #providerInput(entityType: keyof typeof ENTITY, input: Record<string, unknown>, creating: boolean) {
    if (entityType === 'CAMPAIGN') return cleanMetaAdsObject({
      ...input,
      name: input.name,
      objective: input.objective ?? (creating ? 'OUTCOME_SALES' : undefined),
      status: input.status ?? (creating ? 'PAUSED' : undefined),
      special_ad_categories: input.specialAdCategories ?? input.special_ad_categories ?? (creating ? [] : undefined),
      buying_type: input.buyingType ?? input.buying_type ?? (creating ? 'AUCTION' : undefined),
      daily_budget: typeof input.dailyBudgetBdt === 'number' ? toMetaAdsMinorAmount(input.dailyBudgetBdt) : input.daily_budget,
      lifetime_budget: typeof input.lifetimeBudgetBdt === 'number' ? toMetaAdsMinorAmount(input.lifetimeBudgetBdt) : input.lifetime_budget,
      bid_strategy: input.bidStrategy ?? input.bid_strategy,
      specialAdCategories: undefined, buyingType: undefined, dailyBudgetBdt: undefined, lifetimeBudgetBdt: undefined, bidStrategy: undefined,
    });
    if (entityType === 'ADSET') {
      const promotedObject = input.promotedObject ?? input.promoted_object ?? (creating && this.#config.pixelId ? { pixel_id: this.#config.pixelId, custom_event_type: 'PURCHASE' } : undefined);
      return cleanMetaAdsObject({
        ...input,
        campaign_id: input.campaignId ?? input.campaign_id,
        status: input.status ?? (creating ? 'PAUSED' : undefined),
        daily_budget: typeof input.dailyBudgetBdt === 'number' ? toMetaAdsMinorAmount(input.dailyBudgetBdt) : input.daily_budget,
        lifetime_budget: typeof input.lifetimeBudgetBdt === 'number' ? toMetaAdsMinorAmount(input.lifetimeBudgetBdt) : input.lifetime_budget,
        bid_amount: typeof input.bidAmountBdt === 'number' ? toMetaAdsMinorAmount(input.bidAmountBdt) : input.bid_amount,
        bid_strategy: input.bidStrategy ?? input.bid_strategy,
        billing_event: input.billingEvent ?? input.billing_event ?? (creating ? 'IMPRESSIONS' : undefined),
        optimization_goal: input.optimizationGoal ?? input.optimization_goal ?? (creating ? 'OFFSITE_CONVERSIONS' : undefined),
        targeting: input.targeting === undefined && !creating ? undefined : normalizeMetaTargeting(input.targeting),
        promoted_object: promotedObject,
        start_time: input.startTime ?? input.start_time,
        end_time: input.endTime ?? input.end_time,
        attribution_spec: input.attributionSpec ?? input.attribution_spec,
        campaignId: undefined, dailyBudgetBdt: undefined, lifetimeBudgetBdt: undefined, bidAmountBdt: undefined, bidStrategy: undefined, billingEvent: undefined, optimizationGoal: undefined, promotedObject: undefined, startTime: undefined, endTime: undefined, attributionSpec: undefined,
      });
    }
    if (entityType === 'CREATIVE') {
      let objectStorySpec = input.objectStorySpec ?? input.object_story_spec;
      const pageId = input.pageId ?? this.#config.pageId;
      if (!objectStorySpec && pageId && input.link) {
        objectStorySpec = {
          page_id: pageId,
          instagram_actor_id: input.instagramActorId ?? this.#config.instagramActorId,
          link_data: cleanMetaAdsObject({
            link: input.link, message: input.message, name: input.headline, description: input.description,
            image_hash: input.imageHash, picture: input.picture,
            call_to_action: input.callToActionType ? { type: input.callToActionType, value: { link: input.link } } : undefined,
          }),
        };
      }
      const assetFeedSpec = input.assetFeedSpec ?? input.asset_feed_spec;
      if (creating && !objectStorySpec && !assetFeedSpec) throw new Error('META_CREATIVE_SPEC_REQUIRED');
      return cleanMetaAdsObject({
        ...input,
        object_story_spec: objectStorySpec,
        asset_feed_spec: assetFeedSpec,
        degrees_of_freedom_spec: input.degreesOfFreedomSpec ?? input.degrees_of_freedom_spec,
        url_tags: input.urlTags ?? input.url_tags,
        pageId: undefined, instagramActorId: undefined, link: undefined, message: undefined, headline: undefined, description: undefined, imageHash: undefined, picture: undefined, callToActionType: undefined, objectStorySpec: undefined, assetFeedSpec: undefined, degreesOfFreedomSpec: undefined, urlTags: undefined,
      });
    }
    return cleanMetaAdsObject({
      ...input,
      adset_id: input.adSetId ?? input.adset_id,
      creative: input.creative ?? (input.creativeId ? { creative_id: input.creativeId } : undefined),
      status: input.status ?? (creating ? 'PAUSED' : undefined),
      tracking_specs: input.trackingSpecs ?? input.tracking_specs,
      adSetId: undefined, creativeId: undefined, trackingSpecs: undefined,
    });
  }
}
