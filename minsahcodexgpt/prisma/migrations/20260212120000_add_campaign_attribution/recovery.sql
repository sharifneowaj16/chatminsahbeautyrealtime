-- Recovery / Rollback for: 20260212120000_add_campaign_attribution
BEGIN;

DROP INDEX IF EXISTS "CampaignAttribution_deviceId_idx";

DROP INDEX IF EXISTS "CampaignAttribution_userId_idx";

DROP INDEX IF EXISTS "CampaignAttribution_deviceId_key";

DROP INDEX IF EXISTS "CampaignAttribution_userId_key";

DROP TABLE IF EXISTS "CampaignAttribution" CASCADE;

COMMIT;
