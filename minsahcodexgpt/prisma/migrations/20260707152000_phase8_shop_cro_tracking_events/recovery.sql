-- Recovery / Rollback for: 20260707152000_phase8_shop_cro_tracking_events
BEGIN;

DROP INDEX IF EXISTS "ShopTrackingEvent_createdAt_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_occurredAt_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_intentOnly_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_filterName_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_sortValue_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_searchTerm_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_listName_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_source_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_eventId_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_eventName_idx";

DROP INDEX IF EXISTS "ShopTrackingEvent_eventId_key";

DROP TABLE IF EXISTS "ShopTrackingEvent" CASCADE;

COMMIT;
