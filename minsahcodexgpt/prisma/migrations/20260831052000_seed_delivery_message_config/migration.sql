-- Ensure SiteConfig table and indices exist
CREATE TABLE IF NOT EXISTS "SiteConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteConfig_key_key" ON "SiteConfig"("key");
CREATE INDEX IF NOT EXISTS "SiteConfig_key_idx" ON "SiteConfig"("key");

-- Seed/merge default delivery message configuration into SiteConfig
-- If key exists, it merges message1, message2, message3 while preserving existing customized values
INSERT INTO "SiteConfig" ("id", "key", "value", "updatedAt")
VALUES (
    'cm_delivery_msg_config_default',
    'deliveryMessageConfig',
    jsonb_build_object(
        'enabled', true,
        'height', '40px',
        'message1', jsonb_build_object(
            'text', '✨ এই প্রোডাক্টে সারা বাংলাদেশে ফ্রি ডেলিভারি।',
            'backgroundColor', '#d3fa99',
            'textColor', '#1c3a13',
            'active', true
        ),
        'message2', jsonb_build_object(
            'text', '🎁 New customer delivery offer: ঢাকার ভিতরে ফ্রি, ঢাকার বাইরে ৳60 (৳500+ order), ৳1100+ হলে সারা বাংলাদেশে ফ্রি।',
            'backgroundColor', '#d3fa99',
            'textColor', '#1c3a13',
            'active', true
        ),
        'message3', jsonb_build_object(
            'text', '👑 Welcome Back! আপনার জন্য প্রতিটি অর্ডারে ডেলিভারি চার্জে ৫০% বিশেষ ছাড়।',
            'backgroundColor', '#d3fa99',
            'textColor', '#1c3a13',
            'active', true
        )
    ),
    NOW()
)
ON CONFLICT ("key") DO UPDATE
SET
    "value" = CASE
        WHEN "SiteConfig"."value" IS NULL OR "SiteConfig"."value" = '{}'::jsonb THEN EXCLUDED."value"
        ELSE EXCLUDED."value" || "SiteConfig"."value" || jsonb_build_object(
            'message1', COALESCE("SiteConfig"."value"->'message1', EXCLUDED."value"->'message1'),
            'message2', COALESCE("SiteConfig"."value"->'message2', EXCLUDED."value"->'message2'),
            'message3', COALESCE("SiteConfig"."value"->'message3', EXCLUDED."value"->'message3')
        )
    END,
    "updatedAt" = NOW();
