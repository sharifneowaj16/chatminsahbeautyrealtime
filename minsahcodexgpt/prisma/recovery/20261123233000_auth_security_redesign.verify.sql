-- Read-only Verification SQL for 20261123233000_auth_security_redesign
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'User'
  AND column_name IN ('tokenVersion', 'passwordChangedAt');

SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('User_phone_idx', 'OtpRequest_phone_purpose_expiresAt_idx');

SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
FROM "_prisma_migrations"
WHERE migration_name = '20261123233000_auth_security_redesign';
