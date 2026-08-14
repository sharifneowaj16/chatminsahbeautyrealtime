-- Recovery is safe only before any Phase 21 consumer depends on this table.
-- After references are written, retain data and use a reviewed forward-fix migration instead.
BEGIN;
DROP TABLE IF EXISTS "MetaExternalReference";
DROP TYPE IF EXISTS "MetaExternalReferenceSource";
DROP TYPE IF EXISTS "MetaAssetType";
DROP TYPE IF EXISTS "MetaPlatformEnvironment";
COMMIT;
