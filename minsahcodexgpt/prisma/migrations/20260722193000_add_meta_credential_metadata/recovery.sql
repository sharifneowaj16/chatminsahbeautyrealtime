-- Safe only before a consumer depends on Phase 22 credential metadata.
-- After metadata is populated or consumed, preserve it and use a forward-fix migration instead.

BEGIN;
DROP TABLE IF EXISTS "MetaCredentialMetadata";
DROP TYPE IF EXISTS "MetaCredentialRole";
COMMIT;
