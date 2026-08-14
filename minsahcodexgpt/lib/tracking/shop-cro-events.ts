import 'server-only';

import prisma from '@/lib/prisma';
import { getTrackingFailureLogRetentionMetadata } from '@/lib/tracking/failure-retention';

export const SHOP_CRO_SCHEMA_VERSION = 'shop_cro_v1';

export const SHOP_CRO_EVENT_NAMES = [
  'view_item_list',
  'select_item',
  'search',
  'filter_open',
  'sort_open',
  'filter_apply',
  'sort_apply',
  'add_to_cart',
  'buy_now_click',
  'wishlist_add',
  'empty_result',
  'clear_filter',
  'page_change',
] as const;

export type ShopCroEventName = (typeof SHOP_CRO_EVENT_NAMES)[number];

const SHOP_CRO_EVENT_SET = new Set<string>(SHOP_CRO_EVENT_NAMES);
const MAX_ITEMS = 20;
const MAX_STRING = 180;

export type SanitizedShopCroItem = {
  item_id: string;
  item_name: string;
  brand?: string;
  category?: string;
  price: number;
  discount?: number;
  position?: number;
  list_name?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'unknown';
  variant_id?: string;
};

export type SanitizedShopCroEvent = {
  event_name: ShopCroEventName;
  event_id: string;
  schema_version: typeof SHOP_CRO_SCHEMA_VERSION;
  timestamp: Date;
  source: string;
  currency: 'BDT';
  list_name?: string;
  search_term?: string;
  sort_value?: string;
  filter_name?: string;
  filter_value?: string;
  total_products?: number;
  page?: number;
  intent_only: boolean;
  value?: number;
  filters: Record<string, string | number | boolean | null>;
  items: SanitizedShopCroItem[];
  metadata: Record<string, string | number | boolean | null>;
};

function cleanString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, MAX_STRING);
}

function cleanOptionalString(value: unknown): string | undefined {
  const cleaned = cleanString(value);
  return cleaned || undefined;
}

function cleanNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function cleanPositiveInt(value: unknown): number | undefined {
  const numeric = Math.floor(cleanNumber(value, NaN));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function cleanRecord(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 30)
      .map(([key, raw]) => {
        const safeKey = key.replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 60);
        if (!safeKey) return null;
        if (typeof raw === 'boolean') return [safeKey, raw] as const;
        if (typeof raw === 'number' && Number.isFinite(raw)) return [safeKey, raw] as const;
        if (raw == null) return [safeKey, null] as const;
        return [safeKey, cleanString(String(raw), '').slice(0, MAX_STRING)] as const;
      })
      .filter(Boolean) as Array<readonly [string, string | number | boolean | null]>
  );
}

function normalizeAvailability(value: unknown): 'in_stock' | 'out_of_stock' | 'unknown' {
  const cleaned = cleanString(value, 'unknown').toLowerCase();
  if (cleaned === 'in_stock' || cleaned === 'available') return 'in_stock';
  if (cleaned === 'out_of_stock' || cleaned === 'sold_out') return 'out_of_stock';
  return 'unknown';
}

function sanitizeItems(value: unknown): SanitizedShopCroItem[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_ITEMS).map((rawItem) => {
    const item = rawItem && typeof rawItem === 'object' ? rawItem as Record<string, unknown> : {};
    return {
      item_id: cleanString(item.item_id ?? item.id ?? item.productId, 'unknown'),
      item_name: cleanString(item.item_name ?? item.name, 'Unknown product'),
      brand: cleanOptionalString(item.brand ?? item.item_brand),
      category: cleanOptionalString(item.category ?? item.item_category),
      price: cleanNumber(item.price),
      discount: item.discount == null ? undefined : cleanNumber(item.discount),
      position: cleanPositiveInt(item.position ?? item.index),
      list_name: cleanOptionalString(item.list_name ?? item.item_list_name),
      availability: normalizeAvailability(item.availability),
      variant_id: cleanOptionalString(item.variant_id ?? item.variantId),
    };
  });
}

export function isShopCroEventName(eventName: unknown): eventName is ShopCroEventName {
  return typeof eventName === 'string' && SHOP_CRO_EVENT_SET.has(eventName);
}

export function sanitizeShopCroEvent(input: {
  event?: unknown;
  data?: unknown;
  timestamp?: unknown;
  sessionId?: unknown;
  deviceId?: unknown;
}): SanitizedShopCroEvent | null {
  if (!isShopCroEventName(input.event)) return null;

  const data = input.data && typeof input.data === 'object' ? input.data as Record<string, unknown> : {};
  const eventId = cleanString(data.event_id, `${input.event}_${Date.now()}`);
  const timestampNumber = cleanNumber(input.timestamp ?? data.timestamp, Date.now());
  const items = sanitizeItems(data.items);
  const filters = cleanRecord(data.filters);
  const metadata = cleanRecord({
    source: data.source,
    session_id_present: Boolean(input.sessionId),
    device_id_present: Boolean(input.deviceId),
    suggestion_type: data.suggestion_type,
  });

  return {
    event_name: input.event,
    event_id: eventId,
    schema_version: SHOP_CRO_SCHEMA_VERSION,
    timestamp: new Date(timestampNumber),
    source: cleanString(data.source, 'shop'),
    currency: 'BDT',
    list_name: cleanOptionalString(data.item_list_name ?? data.list_name),
    search_term: cleanOptionalString(data.search_term ?? data.search_string),
    sort_value: cleanOptionalString(data.sort_value),
    filter_name: cleanOptionalString(data.filter_name),
    filter_value: cleanOptionalString(data.filter_value),
    total_products: cleanPositiveInt(data.total_products),
    page: cleanPositiveInt(data.page),
    intent_only: input.event === 'buy_now_click' ? data.intent_only === true : Boolean(data.intent_only),
    value: data.value == null ? undefined : cleanNumber(data.value),
    filters,
    items,
    metadata,
  };
}

export async function persistShopCroEvent(event: SanitizedShopCroEvent) {
  try {
    await prisma.shopTrackingEvent.create({
      data: {
        eventName: event.event_name,
        eventId: event.event_id,
        schemaVersion: event.schema_version,
        source: event.source,
        listName: event.list_name,
        searchTerm: event.search_term,
        sortValue: event.sort_value,
        filterName: event.filter_name,
        filterValue: event.filter_value,
        totalProducts: event.total_products,
        page: event.page,
        intentOnly: event.intent_only,
        value: event.value,
        currency: event.currency,
        filters: event.filters,
        items: event.items,
        metadata: event.metadata,
        occurredAt: event.timestamp,
      },
    });

    return { ok: true as const };
  } catch (error) {
    await logShopCroPersistenceFailure(event, error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Unknown shop CRO persistence error',
    };
  }
}

async function logShopCroPersistenceFailure(event: SanitizedShopCroEvent, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown shop CRO persistence error';
  const retention = getTrackingFailureLogRetentionMetadata({
    provider: 'SHOP_CRO',
    errorCode: 'SHOP_CRO_PERSISTENCE_FAILED',
    errorMessage: message,
    finalFailed: false,
  });

  try {
    await prisma.metaCapiFailure.create({
      data: {
        eventName: event.event_name,
        eventId: event.event_id,
        provider: 'SHOP_CRO',
        schemaVersion: event.schema_version,
        errorCode: 'SHOP_CRO_PERSISTENCE_FAILED',
        errorMessage: message.slice(0, 2000),
        finalFailed: false,
        failureCategory: retention.failureCategory,
        cleanupAfter: retention.cleanupAfter,
        safePayload: {
          eventName: event.event_name,
          eventId: event.event_id,
          itemCount: event.items.length,
          hasFilters: Object.keys(event.filters).length > 0,
          source: event.source,
        },
      },
    });
  } catch {
    // Tracking failure logging must never block storefront UX or route response.
  }
}
