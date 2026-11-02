-- Recovery / Rollback for: 20260216000000_add_search_click_tracking
BEGIN;

DROP INDEX IF EXISTS "search_click_metrics_clicks_idx";

DROP INDEX IF EXISTS "search_click_metrics_productId_idx";

DROP INDEX IF EXISTS "search_click_metrics_query_idx";

DROP INDEX IF EXISTS "search_click_metrics_query_productId_key";

DROP INDEX IF EXISTS "search_click_events_clickedAt_idx";

DROP INDEX IF EXISTS "search_click_events_sessionId_idx";

DROP INDEX IF EXISTS "search_click_events_userId_idx";

DROP INDEX IF EXISTS "search_click_events_productId_idx";

DROP INDEX IF EXISTS "search_click_events_query_idx";

DROP TABLE IF EXISTS "search_click_metrics" CASCADE;

DROP TABLE IF EXISTS "search_click_events" CASCADE;

COMMIT;
