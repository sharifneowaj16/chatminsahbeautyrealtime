-- Phase 30 pre-consumer recovery only.
-- Do not apply after durable delete plans or item retry history are relied on;
-- preserve data and ship a reviewed forward-fix instead.
DROP TRIGGER IF EXISTS "MetaCatalogDeletePlan_protect_request" ON "MetaCatalogDeletePlan";
DROP FUNCTION IF EXISTS "meta_catalog_delete_plan_protect_request"();
ALTER TABLE "MetaCatalogBatch" DROP CONSTRAINT IF EXISTS "MetaCatalogBatch_deletePlanId_fkey";
DROP INDEX IF EXISTS "MetaCatalogBatchItem_batch_provider_idx";
DROP INDEX IF EXISTS "MetaCatalogBatchItem_retryOf_idx";
DROP INDEX IF EXISTS "MetaCatalogBatch_deletePlan_status_idx";
DROP TABLE IF EXISTS "MetaCatalogDeletePlan";
ALTER TABLE "MetaCatalogBatchItem"
  DROP COLUMN IF EXISTS "retryOfBatchItemId",
  DROP COLUMN IF EXISTS "attempt",
  DROP COLUMN IF EXISTS "providerIndex";
ALTER TABLE "MetaCatalogBatch"
  DROP COLUMN IF EXISTS "deletePlanId",
  DROP COLUMN IF EXISTS "operationKind";
DROP TYPE IF EXISTS "MetaCatalogDeletePlanStatus";
