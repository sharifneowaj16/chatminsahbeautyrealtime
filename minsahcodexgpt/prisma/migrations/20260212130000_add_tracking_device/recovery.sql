-- Recovery / Rollback for: 20260212130000_add_tracking_device
BEGIN;

DROP INDEX IF EXISTS "TrackingDevice_deviceId_idx";

DROP INDEX IF EXISTS "TrackingDevice_userId_idx";

DROP INDEX IF EXISTS "TrackingDevice_userId_key";

DROP INDEX IF EXISTS "TrackingDevice_deviceId_key";

DROP TABLE IF EXISTS "TrackingDevice" CASCADE;

COMMIT;
