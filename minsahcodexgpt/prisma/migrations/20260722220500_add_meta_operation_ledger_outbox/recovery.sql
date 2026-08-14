-- Safe only before Phase 25 operation/outbox consumers depend on these records.
-- After production writes exist, preserve the ledger and use a forward-fix migration.

BEGIN;
DROP TRIGGER IF EXISTS "MetaOutboxMessage_protect_immutable_fields" ON "MetaOutboxMessage";
DROP FUNCTION IF EXISTS "meta_outbox_protect_immutable_fields"();
DROP TRIGGER IF EXISTS "MetaOperation_protect_immutable_fields" ON "MetaOperation";
DROP FUNCTION IF EXISTS "meta_operation_protect_immutable_fields"();
DROP TRIGGER IF EXISTS "MetaOperationEvent_no_delete" ON "MetaOperationEvent";
DROP TRIGGER IF EXISTS "MetaOperationEvent_no_update" ON "MetaOperationEvent";
DROP FUNCTION IF EXISTS "meta_operation_event_append_only"();
DROP TABLE IF EXISTS "MetaOutboxMessage";
DROP TABLE IF EXISTS "MetaOperationEvent";
DROP TABLE IF EXISTS "MetaOperation";
DROP TYPE IF EXISTS "MetaOutboxMessageState";
DROP TYPE IF EXISTS "MetaOperationEventType";
DROP TYPE IF EXISTS "MetaOperationStatus";
COMMIT;
