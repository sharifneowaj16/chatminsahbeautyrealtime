export type MetaAdsEntityType = 'CAMPAIGN' | 'ADSET' | 'CREATIVE' | 'AD';

export type MetaAdsMutationOperation =
  | 'CREATE_CAMPAIGN'
  | 'UPDATE_CAMPAIGN'
  | 'CREATE_ADSET'
  | 'UPDATE_ADSET'
  | 'CREATE_CREATIVE'
  | 'UPDATE_CREATIVE'
  | 'CREATE_AD'
  | 'UPDATE_AD';

export type MetaAdsMutationApprovalPayload = {
  operation: MetaAdsMutationOperation;
  entityType: MetaAdsEntityType;
  resourceId: string | null;
  input: Record<string, unknown>;
};

export type MetaAdsSafetyCaps = {
  maxDailyBudgetBdt: number;
  maxLifetimeBudgetBdt: number;
  maxBidAmountBdt: number;
  maxBudgetIncreasePercent: number;
};

export type MetaAdsStabilityRun = {
  status: string;
  completedAt: Date | string | null;
  startedAt: Date | string;
};

export type MetaAdsReadOnlyStability = {
  stable: boolean;
  successfulRuns: number;
  requiredSuccessfulRuns: number;
  latestCompletedAt: string | null;
  stale: boolean;
  reason: string;
};
