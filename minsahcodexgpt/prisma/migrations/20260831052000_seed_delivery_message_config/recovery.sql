-- Recovery / Rollback for delivery message configuration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SiteConfig') THEN
        DELETE FROM "SiteConfig"
        WHERE "key" = 'deliveryMessageConfig'
          AND "id" = 'cm_delivery_msg_config_default';
    END IF;
END $$;
