-- P3009 Recovery / Repair SQL for 20261123233000_auth_security_redesign
BEGIN;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");

CREATE INDEX IF NOT EXISTS "OtpRequest_phone_purpose_expiresAt_idx"
  ON "OtpRequest"("phone", "purpose", "expiresAt");

COMMIT;
