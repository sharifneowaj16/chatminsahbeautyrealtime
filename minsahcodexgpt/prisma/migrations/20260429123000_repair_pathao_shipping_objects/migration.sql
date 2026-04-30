ALTER TABLE "Address"
ADD COLUMN IF NOT EXISTS "pathaoCityId" INTEGER,
ADD COLUMN IF NOT EXISTS "pathaoZoneId" INTEGER,
ADD COLUMN IF NOT EXISTS "pathaoAreaId" INTEGER;

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "pathaoStatus" TEXT,
ADD COLUMN IF NOT EXISTS "pathaoConsignmentId" TEXT,
ADD COLUMN IF NOT EXISTS "pathaoTrackingCode" TEXT,
ADD COLUMN IF NOT EXISTS "pathaoSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "pathaoResponse" JSONB;

CREATE INDEX IF NOT EXISTS "Order_pathaoConsignmentId_idx" ON "Order"("pathaoConsignmentId");
CREATE INDEX IF NOT EXISTS "Order_pathaoTrackingCode_idx" ON "Order"("pathaoTrackingCode");

CREATE TABLE IF NOT EXISTS "PathaoWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'pathao',
  "eventType" TEXT NOT NULL,
  "orderRef" TEXT,
  "consignmentId" TEXT,
  "signature" TEXT,
  "payload" JSONB NOT NULL,
  "orderId" TEXT,
  "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
  "error" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PathaoWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathaoWebhookEvent_eventKey_key" ON "PathaoWebhookEvent"("eventKey");
CREATE INDEX IF NOT EXISTS "PathaoWebhookEvent_eventType_receivedAt_idx" ON "PathaoWebhookEvent"("eventType", "receivedAt");
CREATE INDEX IF NOT EXISTS "PathaoWebhookEvent_orderRef_idx" ON "PathaoWebhookEvent"("orderRef");
CREATE INDEX IF NOT EXISTS "PathaoWebhookEvent_consignmentId_idx" ON "PathaoWebhookEvent"("consignmentId");
CREATE INDEX IF NOT EXISTS "PathaoWebhookEvent_processingStatus_receivedAt_idx" ON "PathaoWebhookEvent"("processingStatus", "receivedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PathaoWebhookEvent_orderId_fkey'
  ) THEN
    ALTER TABLE "PathaoWebhookEvent"
    ADD CONSTRAINT "PathaoWebhookEvent_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
