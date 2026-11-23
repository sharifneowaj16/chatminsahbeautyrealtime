-- Auth Security Redesign: Instant Session Revocation & Fast Phone/OTP Indexes
-- Migration: 20261123233000_auth_security_redesign

-- 1. Add tokenVersion & passwordChangedAt on User for instant multi-device session revocation
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);

-- 2. Index User.phone for fast phone login and OTP lookup
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");

-- 3. Composite index on OtpRequest for fast active OTP verification
CREATE INDEX IF NOT EXISTS "OtpRequest_phone_purpose_expiresAt_idx"
  ON "OtpRequest"("phone", "purpose", "expiresAt");
