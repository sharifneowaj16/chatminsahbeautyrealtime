export const MAX_MASS_HIDE_COUNT = 50;
export const MAX_MASS_HIDE_RATIO = 0.20;
export const HARD_DELETE_MIN_DAYS_HIDDEN = 30;

export type ManagedCatalogItemStatus = 'ACTIVE' | 'HIDDEN' | 'STAGING' | 'DELETED' | 'DELETE_SUBMITTED' | string;

export interface ManagedCatalogItemInput {
  retailerId: string;
  sourceType?: string;
  sourceId?: string;
  status?: ManagedCatalogItemStatus;
  payloadHash?: string | null;
  hiddenSince?: Date | string | null;
}

export interface CatalogItemToHide {
  retailerId: string;
  availability: 'out of stock';
  visibility: 'staging';
  sourceType?: string;
  sourceId?: string;
}

export interface EvaluateHideInput {
  previouslyManaged: readonly ManagedCatalogItemInput[];
  desiredActiveItems: Map<string, unknown> | Set<string>;
  managedTotalCount?: number;
  now?: Date;
}

export interface EvaluateHideResult {
  shouldBrake: boolean;
  brakeReason?: 'MASS_HIDE_RATIO_EXCEEDED' | 'MASS_HIDE_COUNT_EXCEEDED' | null;
  itemsToHide: CatalogItemToHide[];
  eligibleForDeletePlan: ManagedCatalogItemInput[];
}

/**
 * Evaluates managed catalog items that are no longer active/present in the catalog.
 * Follows Owner Decision D1:
 * - Inactive & deleted items: Send availability 'out of stock' + visibility 'staging' automatically on sync.
 * - Permanent deletion remains approval-gated (eligible for delete plan only after >= 30 days hidden).
 * - Mass-change brake: if a sync run hides > 20% or > 50 managed items, halt and require admin approval.
 */
export function evaluateManagedCatalogHideTransitions(input: EvaluateHideInput): EvaluateHideResult {
  const {
    previouslyManaged,
    desiredActiveItems,
    managedTotalCount = previouslyManaged.length,
    now = new Date(),
  } = input;

  const isDesired = (id: string): boolean => {
    if (desiredActiveItems instanceof Set) {
      return desiredActiveItems.has(id);
    }
    if (desiredActiveItems && typeof desiredActiveItems.has === 'function') {
      return desiredActiveItems.has(id);
    }
    return false;
  };

  const itemsToHide: CatalogItemToHide[] = [];
  const eligibleForDeletePlan: ManagedCatalogItemInput[] = [];

  const minHiddenMs = HARD_DELETE_MIN_DAYS_HIDDEN * 24 * 60 * 60 * 1000;
  const currentTimestamp = now.getTime();

  for (const item of previouslyManaged) {
    if (item.status === 'DELETED') {
      continue;
    }

    const currentlyActiveInFeed = isDesired(item.retailerId);
    if (!currentlyActiveInFeed) {
      // It is not active in current catalog feed: should be staged out of stock
      itemsToHide.push({
        retailerId: item.retailerId,
        availability: 'out of stock',
        visibility: 'staging',
        sourceType: item.sourceType,
        sourceId: item.sourceId,
      });

      // Check if eligible for hard deletion plan (hidden for >= 30 days)
      if (item.hiddenSince) {
        const hiddenTimestamp = new Date(item.hiddenSince).getTime();
        if (!isNaN(hiddenTimestamp) && currentTimestamp - hiddenTimestamp >= minHiddenMs) {
          eligibleForDeletePlan.push(item);
        }
      }
    }
  }

  const hideCount = itemsToHide.length;
  let shouldBrake = false;
  let brakeReason: 'MASS_HIDE_RATIO_EXCEEDED' | 'MASS_HIDE_COUNT_EXCEEDED' | null = null;

  if (managedTotalCount > 0 && hideCount / managedTotalCount > MAX_MASS_HIDE_RATIO) {
    shouldBrake = true;
    brakeReason = 'MASS_HIDE_RATIO_EXCEEDED';
  } else if (hideCount > MAX_MASS_HIDE_COUNT) {
    shouldBrake = true;
    brakeReason = 'MASS_HIDE_COUNT_EXCEEDED';
  }

  return {
    shouldBrake,
    brakeReason,
    itemsToHide,
    eligibleForDeletePlan,
  };
}
