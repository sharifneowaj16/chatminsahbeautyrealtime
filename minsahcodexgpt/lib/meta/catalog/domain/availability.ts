import type { CatalogAvailability } from './types';

export type AvailabilityInput = {
  isActive: boolean;
  deletedAt?: Date | null;
  availabilityMode?: string | null;
  preorderAvailableOn?: Date | null;
  trackInventory: boolean;
  quantity: number;
  reservedQuantity: number;
  allowBackorder: boolean;
};

export function availableQuantity(input: Pick<AvailabilityInput, 'trackInventory' | 'quantity' | 'reservedQuantity'>) {
  if (!input.trackInventory) return 999_999;
  return Math.max(0, Math.trunc(input.quantity) - Math.trunc(input.reservedQuantity));
}

export function resolveCatalogAvailability(input: AvailabilityInput): {
  includeInUpdates: boolean;
  availability: CatalogAvailability;
  availabilityDate?: string;
  quantityToSellOnFacebook: number;
} {
  const quantityToSellOnFacebook = availableQuantity(input);
  if (!input.isActive || input.deletedAt) {
    return { includeInUpdates: false, availability: 'out of stock', quantityToSellOnFacebook };
  }

  const mode = input.availabilityMode?.trim().toUpperCase() ?? 'STANDARD';
  if (mode === 'DISCONTINUED') {
    return { includeInUpdates: true, availability: 'discontinued', quantityToSellOnFacebook };
  }
  if (mode === 'PREORDER') {
    return {
      includeInUpdates: true,
      availability: 'preorder',
      availabilityDate: input.preorderAvailableOn?.toISOString(),
      quantityToSellOnFacebook,
    };
  }
  if (!input.trackInventory || quantityToSellOnFacebook > 0) {
    return { includeInUpdates: true, availability: 'in stock', quantityToSellOnFacebook };
  }
  if (input.allowBackorder) {
    return { includeInUpdates: true, availability: 'available for order', quantityToSellOnFacebook };
  }
  return { includeInUpdates: true, availability: 'out of stock', quantityToSellOnFacebook };
}
