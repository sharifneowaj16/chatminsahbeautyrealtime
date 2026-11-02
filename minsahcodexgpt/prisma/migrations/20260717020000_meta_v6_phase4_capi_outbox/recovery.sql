-- Recovery / Rollback for: 20260717020000_meta_v6_phase4_capi_outbox
BEGIN;

DROP INDEX IF EXISTS "MetaEventOutboxStatusEvent_status_createdAt_idx";

DROP INDEX IF EXISTS "MetaEventOutboxStatusEvent_outboxId_createdAt_idx";

DROP INDEX IF EXISTS "MetaEventOutbox_createdAt_idx";

DROP INDEX IF EXISTS "MetaEventOutbox_sourceType_sourceId_idx";

DROP INDEX IF EXISTS "MetaEventOutbox_orderId_idx";

DROP INDEX IF EXISTS "MetaEventOutbox_leaseExpiresAt_idx";

DROP INDEX IF EXISTS "MetaEventOutbox_status_nextAttemptAt_idx";

DROP INDEX IF EXISTS "MetaEventOutbox_provider_eventName_eventId_key";

DROP TABLE IF EXISTS "MetaEventOutboxStatusEvent" CASCADE;

DROP TABLE IF EXISTS "MetaEventOutbox" CASCADE;

DROP TYPE IF EXISTS "MetaEventOutboxStatus" CASCADE;

COMMIT;
