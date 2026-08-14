-- Phase 8: Shop CRO analytics server reliability
-- Stores sanitized item-level shop analytics payloads without raw PII.

CREATE TABLE IF NOT EXISTS "ShopTrackingEvent" (
  "id" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL DEFAULT 'shop_cro_v1',
  "source" TEXT,
  "listName" TEXT,
  "searchTerm" TEXT,
  "sortValue" TEXT,
  "filterName" TEXT,
  "filterValue" TEXT,
  "totalProducts" INTEGER,
  "page" INTEGER,
  "intentOnly" BOOLEAN NOT NULL DEFAULT false,
  "value" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "filters" JSONB,
  "items" JSONB,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopTrackingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShopTrackingEvent_eventId_key" ON "ShopTrackingEvent"("eventId");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_eventName_idx" ON "ShopTrackingEvent"("eventName");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_eventId_idx" ON "ShopTrackingEvent"("eventId");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_source_idx" ON "ShopTrackingEvent"("source");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_listName_idx" ON "ShopTrackingEvent"("listName");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_searchTerm_idx" ON "ShopTrackingEvent"("searchTerm");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_sortValue_idx" ON "ShopTrackingEvent"("sortValue");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_filterName_idx" ON "ShopTrackingEvent"("filterName");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_intentOnly_idx" ON "ShopTrackingEvent"("intentOnly");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_occurredAt_idx" ON "ShopTrackingEvent"("occurredAt");
CREATE INDEX IF NOT EXISTS "ShopTrackingEvent_createdAt_idx" ON "ShopTrackingEvent"("createdAt");
