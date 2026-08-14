import 'server-only';

import {
  createAdsEntityThroughMetaPlatform,
  getAdAccountThroughMetaPlatform,
  getAsyncInsightsReportResultsThroughMetaPlatform,
  getAsyncInsightsReportStatusThroughMetaPlatform,
  getAdsEntityThroughMetaPlatform,
  getInsightsThroughMetaPlatform,
  listAdsEntitiesThroughMetaPlatform,
  startAsyncInsightsReportThroughMetaPlatform,
  updateAdsEntityThroughMetaPlatform,
} from '@/lib/meta-platform/migration/phase29-ads-facade';

/** @deprecated Phase 29 compatibility facade. New code must use MetaPlatform Ads domain services. */
export function getAdAccount() { return getAdAccountThroughMetaPlatform(); }
/** @deprecated Phase 29 compatibility facade. */
export function listCampaigns(params: Record<string, unknown> = {}) { return listAdsEntitiesThroughMetaPlatform('CAMPAIGN', params); }
/** @deprecated Phase 29 compatibility facade. */
export function getCampaign(campaignId: string) { return getAdsEntityThroughMetaPlatform('CAMPAIGN', campaignId); }
/** @deprecated Phase 29 compatibility facade. */
export function createCampaign(input: {
  name: string; objective?: string; status?: string; specialAdCategories?: string[]; buyingType?: string;
  dailyBudgetBdt?: number; lifetimeBudgetBdt?: number; bidStrategy?: string;
}) { return createAdsEntityThroughMetaPlatform('CAMPAIGN', input); }
/** @deprecated Phase 29 compatibility facade. */
export function updateCampaign(campaignId: string, input: Record<string, unknown>) { return updateAdsEntityThroughMetaPlatform('CAMPAIGN', campaignId, input); }
/** @deprecated Phase 29 compatibility facade. */
export function listAdSets(params: Record<string, unknown> = {}) { return listAdsEntitiesThroughMetaPlatform('ADSET', params); }
/** @deprecated Phase 29 compatibility facade. */
export function getAdSet(adSetId: string) { return getAdsEntityThroughMetaPlatform('ADSET', adSetId); }
/** @deprecated Phase 29 compatibility facade. */
export function createAdSet(input: {
  name: string; campaignId: string; status?: string; dailyBudgetBdt?: number; lifetimeBudgetBdt?: number;
  bidAmountBdt?: number; bidStrategy?: string; billingEvent?: string; optimizationGoal?: string;
  targeting?: Record<string, unknown>; promotedObject?: Record<string, unknown>; startTime?: string; endTime?: string; attributionSpec?: unknown;
}) { return createAdsEntityThroughMetaPlatform('ADSET', input); }
/** @deprecated Phase 29 compatibility facade. */
export function updateAdSet(adSetId: string, input: Record<string, unknown>) { return updateAdsEntityThroughMetaPlatform('ADSET', adSetId, input); }
/** @deprecated Phase 29 compatibility facade. */
export function listCreatives(params: Record<string, unknown> = {}) { return listAdsEntitiesThroughMetaPlatform('CREATIVE', params); }
/** @deprecated Phase 29 compatibility facade. */
export function getCreative(creativeId: string) { return getAdsEntityThroughMetaPlatform('CREATIVE', creativeId); }
/** @deprecated Phase 29 compatibility facade. */
export function createCreative(input: {
  name: string; pageId?: string; instagramActorId?: string; link?: string; message?: string; headline?: string;
  description?: string; imageHash?: string; picture?: string; callToActionType?: string;
  objectStorySpec?: Record<string, unknown>; assetFeedSpec?: Record<string, unknown>;
  degreesOfFreedomSpec?: Record<string, unknown>; urlTags?: string;
}) { return createAdsEntityThroughMetaPlatform('CREATIVE', input); }
/** @deprecated Phase 29 compatibility facade. */
export function updateCreative(creativeId: string, input: Record<string, unknown>) { return updateAdsEntityThroughMetaPlatform('CREATIVE', creativeId, input); }
/** @deprecated Phase 29 compatibility facade. */
export function listAds(params: Record<string, unknown> = {}) { return listAdsEntitiesThroughMetaPlatform('AD', params); }
/** @deprecated Phase 29 compatibility facade. */
export function getAd(adId: string) { return getAdsEntityThroughMetaPlatform('AD', adId); }
/** @deprecated Phase 29 compatibility facade. */
export function createAd(input: { name: string; adSetId: string; creativeId: string; status?: string; trackingSpecs?: unknown }) {
  return createAdsEntityThroughMetaPlatform('AD', input);
}
/** @deprecated Phase 29 compatibility facade. */
export function updateAd(adId: string, input: Record<string, unknown>) { return updateAdsEntityThroughMetaPlatform('AD', adId, input); }
/** @deprecated Phase 29 compatibility facade. */
export function getInsights(input: {
  level?: 'account' | 'campaign' | 'adset' | 'ad'; since?: string; until?: string; datePreset?: string;
  breakdowns?: string[]; filtering?: unknown[]; limit?: number;
}) { return getInsightsThroughMetaPlatform(input); }
/** Phase 29 async report entry point. */
export function startAsyncInsightsReport(input: Parameters<typeof getInsightsThroughMetaPlatform>[0]) {
  return startAsyncInsightsReportThroughMetaPlatform(input);
}

export function getAsyncInsightsReportStatus(reportRunId: string) { return getAsyncInsightsReportStatusThroughMetaPlatform(reportRunId); }
export function getAsyncInsightsReportResults(reportRunId: string, limit?: number) { return getAsyncInsightsReportResultsThroughMetaPlatform(reportRunId, limit); }
