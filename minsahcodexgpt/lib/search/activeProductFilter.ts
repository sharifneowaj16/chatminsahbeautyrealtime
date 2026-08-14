/**
 * Phase 20 search hardening helpers.
 *
 * Search must only expose sellable products: active, non-deleted, published/active,
 * and public-visible. Prisma only has isActive/deletedAt today, so ES status and
 * visibility are computed in productTransformer.ts.
 */

export const ACTIVE_SEARCH_STATUSES = ['active', 'published'] as const;
export const PUBLIC_SEARCH_VISIBILITY = 'public' as const;

export const ACTIVE_PRODUCT_PRISMA_WHERE = {
  isActive: true,
  deletedAt: null,
} as const;

export function buildActiveProductESFilters(): any[] {
  return [
    { term: { isActive: true } },
    { bool: { must_not: [{ exists: { field: 'deletedAt' } }] } },
    { terms: { status: [...ACTIVE_SEARCH_STATUSES] } },
    { term: { visibility: PUBLIC_SEARCH_VISIBILITY } },
  ];
}

export function isActiveSearchHit(source?: {
  isActive?: boolean;
  deletedAt?: string | Date | null;
  status?: string | null;
  visibility?: string | null;
}): boolean {
  if (!source) return false;
  const status = source.status ?? 'active';
  const visibility = source.visibility ?? PUBLIC_SEARCH_VISIBILITY;

  return (
    source.isActive === true &&
    source.deletedAt == null &&
    ACTIVE_SEARCH_STATUSES.includes(status as (typeof ACTIVE_SEARCH_STATUSES)[number]) &&
    visibility === PUBLIC_SEARCH_VISIBILITY
  );
}
