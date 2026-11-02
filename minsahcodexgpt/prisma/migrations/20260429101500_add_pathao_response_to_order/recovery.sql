-- Recovery / Rollback for: 20260429101500_add_pathao_response_to_order
BEGIN;

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "pathaoResponse";

COMMIT;
