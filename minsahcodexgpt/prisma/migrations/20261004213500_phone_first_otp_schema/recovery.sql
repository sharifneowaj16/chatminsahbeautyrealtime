-- Rollback for phone_first_otp_schema

-- ১. OtpRequest টেবিল ও এর ইনডেক্স ড্রপ করা
DROP TABLE IF EXISTS "OtpRequest";

-- ২. User থেকে verifiedPhone ইউনিক ইনডেক্স ও কলাম ড্রপ করা
DROP INDEX IF EXISTS "User_verifiedPhone_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "verifiedPhone";

-- ৩. User.email আবার NOT NULL করা
-- সতর্কবার্তা: email আবার NOT NULL করতে হলে আগে email-null user ঠিক করতে হবে, নাহলে rollback ফেল করবে।
-- যেমন: UPDATE "User" SET "email" = 'user_' || id || '@fallback.minsahbeauty.local' WHERE "email" IS NULL;
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
