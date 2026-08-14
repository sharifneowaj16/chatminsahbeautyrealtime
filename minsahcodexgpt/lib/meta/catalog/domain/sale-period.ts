import { money } from './pricing';
import type { CatalogSale } from './types';

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
  if (!Number.isFinite(regular) || !Number.isFinite(sale) || regular < 0 || sale < 0 || sale >= regular) {
    return { state: 'invalid', error: 'Sale price must be non-negative and lower than base price.' };
  }
  if (!input.offerStartDate || !input.offerEndDate) {
    return { state: 'invalid', error: 'Sale price requires both offerStartDate and offerEndDate.' };
  }
  if (input.offerStartDate >= input.offerEndDate) {
    return { state: 'invalid', error: 'Sale start must be before sale end.' };
  }
  if (input.offerEndDate <= input.now) return { state: 'expired' };

  return {
    state: input.offerStartDate > input.now ? 'future' : 'active',
    sale: {
      price: money(sale, input.currency),
      effectiveDate: `${input.offerStartDate.toISOString()}/${input.offerEndDate.toISOString()}`,
    },
  };
}
