-- Recovery / Rollback for: 20260428164000_add_pathao_status_to_order
BEGIN;

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "pathaoStatus";

COMMIT;
