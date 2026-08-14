import type { TrackingEventData } from '@/types/tracking';
import {
  buildMetaCatalogData,
  buildMetaViewContentCatalogData,
  type MetaCatalogItemSource,
} from '@/lib/tracking/meta-content-id';
import { buildMetaBrowserEvent } from './payload';
import type {
  MetaBrowserCommerceEventName,
  MetaBrowserEventEnvelope,
} from './types';

export type MetaBrowserCommerceItem = MetaCatalogItemSource;

function finiteMoney(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

function itemQuantity(item: MetaBrowserCommerceItem) {
  const parsed = Number(item.quantity ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.trunc(parsed)) : 1;
}

/** Merchandise subtotal policy: selected item price × quantity; shipping is excluded. */
export function calculateMetaCommerceValue(items: MetaBrowserCommerceItem[]) {
  return finiteMoney(items.reduce((sum, item) => {
    const price = finiteMoney(item.item_price ?? item.price);
    return sum + price * itemQuantity(item);
  }, 0));
}

export function buildMetaCommercePayload(input: {
  eventName: MetaBrowserCommerceEventName;
  items: MetaBrowserCommerceItem[];
  value?: number;
  currency?: string;
  viewContentHasVariants?: boolean;
  extra?: TrackingEventData;
}): TrackingEventData {
  const catalog =
    input.eventName === 'ViewContent' && input.items.length === 1
      ? buildMetaViewContentCatalogData(input.items[0], {
          hasVariants: Boolean(input.viewContentHasVariants),
        })
      : buildMetaCatalogData(input.items);
  const value = input.value === undefined
    ? calculateMetaCommerceValue(input.items)
    : finiteMoney(input.value);
  const numItems = input.items.reduce((sum, item) => sum + itemQuantity(item), 0);

  return {
    ...(input.extra ?? {}),
    ...(catalog ?? {}),
    value,
    currency: (input.currency || 'BDT').trim().toUpperCase(),
    num_items: numItems,
  };
}

export function buildMetaCommerceBrowserEvent(input: {
  eventName: MetaBrowserCommerceEventName;
  eventId?: string | null;
  items: MetaBrowserCommerceItem[];
  value?: number;
  currency?: string;
  viewContentHasVariants?: boolean;
  extra?: TrackingEventData;
}): MetaBrowserEventEnvelope {
  return buildMetaBrowserEvent({
    eventName: input.eventName,
    eventId: input.eventId,
    payload: buildMetaCommercePayload(input),
  });
}
