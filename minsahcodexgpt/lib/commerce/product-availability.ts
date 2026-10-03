import {
  availableQuantity,
  resolveCatalogAvailability,
  type AvailabilityInput,
} from '../meta/catalog/domain/availability.ts';
import type { CatalogAvailability } from '../meta/catalog/domain/types.ts';

export type ProductAvailabilitySnapshot = {
  availability: CatalogAvailability;
  schemaAvailability: string;
  availableQuantity: number;
  includeInUpdates: boolean;
  canPurchase: boolean;
  isPreorder: boolean;
  preorderAvailableOn?: string | null;
  allowBackorder: boolean;
};

export function mapCatalogToSchemaAvailability(availability: CatalogAvailability): string {
  switch (availability) {
    case 'in stock':
      return 'https://schema.org/InStock';
    case 'out of stock':
      return 'https://schema.org/OutOfStock';
    case 'preorder':
      return 'https://schema.org/PreOrder';
    case 'available for order':
      return 'https://schema.org/BackOrder';
    case 'discontinued':
      return 'https://schema.org/Discontinued';
    default:
      return 'https://schema.org/OutOfStock';
  }
}

export function resolveProductAvailability(input: {
  isActive: boolean;
  deletedAt?: Date | string | null;
  availabilityMode?: string | null;
  preorderAvailableOn?: Date | string | null;
  trackInventory?: boolean;
  quantity?: number | null;
  reservedQuantity?: number | null;
  allowBackorder?: boolean;
}): ProductAvailabilitySnapshot {
  const isActive = Boolean(input.isActive);
  const deletedAt = input.deletedAt ? new Date(input.deletedAt) : null;
  const trackInventory = input.trackInventory ?? true;
  const quantity = Number(input.quantity ?? 0);
  const reservedQuantity = Number(input.reservedQuantity ?? 0);
  const allowBackorder = Boolean(input.allowBackorder);
  const preorderAvailableOn = input.preorderAvailableOn ? new Date(input.preorderAvailableOn) : null;

  const catalogInput: AvailabilityInput = {
    isActive,
    deletedAt,
    availabilityMode: input.availabilityMode,
    preorderAvailableOn,
    trackInventory,
    quantity,
    reservedQuantity,
    allowBackorder,
  };

  const catalogResult = resolveCatalogAvailability(catalogInput);
  const qty = availableQuantity({ trackInventory, quantity, reservedQuantity });

  // Purchase eligibility: active, not deleted, and either untracked, has quantity, backorderable, or preorder
  const canPurchase =
    isActive &&
    !deletedAt &&
    catalogResult.availability !== 'discontinued' &&
    catalogResult.availability !== 'out of stock';

  return {
    availability: catalogResult.availability,
    schemaAvailability: mapCatalogToSchemaAvailability(catalogResult.availability),
    availableQuantity: qty,
    includeInUpdates: catalogResult.includeInUpdates,
    canPurchase,
    isPreorder: catalogResult.availability === 'preorder',
    preorderAvailableOn: preorderAvailableOn ? preorderAvailableOn.toISOString() : null,
    allowBackorder,
  };
}
