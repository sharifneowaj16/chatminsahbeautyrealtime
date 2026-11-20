import { money } from './pricing.ts';
import type { CatalogSale } from './types.ts';

export type SaleResolution = {
  sale?: CatalogSale;
  state: 'none' | 'future' | 'active' | 'expired' | 'invalid';
  error?: string;
};

export function resolveCatalogSale(input: {
  regularPrice: unknown;
  salePrice: unknown;
  offerStartDate?: Date | null;
  offerEndDate?: Date | null;
  currency?: string;
  now: Date;
}): SaleResolution {
  if (input.salePrice == null || input.salePrice === '') return { state: 'none' };
  const regular = Number(input.regularPrice);
  const sale = Number(input.salePrice);

  // If salePrice is 0 or >= regularPrice, simply treat as no active sale instead of dropping the product from Meta Catalog!
  if (!Number.isFinite(regular) || !Number.isFinite(sale) || regular <= 0 || sale <= 0 || sale >= regular) {
    return { state: 'none' };
  }

  // Evergreen sale: when admin sets salePrice without start/end dates, it is immediately active
  if (!input.offerStartDate && !input.offerEndDate) {
    return {
      state: 'active',
      sale: {
        price: money(sale, input.currency),
      },
    };
  }

  const start = input.offerStartDate ?? new Date(0);
  const end = input.offerEndDate ?? new Date(input.now.getTime() + 365 * 86400 * 1000);

  if (start >= end) {
    return {
      state: 'active',
      sale: {
        price: money(sale, input.currency),
      },
    };
  }

  if (end <= input.now) return { state: 'expired' };

  return {
    state: start > input.now ? 'future' : 'active',
    sale: {
      price: money(sale, input.currency),
      effectiveDate: `${start.toISOString()}/${end.toISOString()}`,
    },
  };
}
