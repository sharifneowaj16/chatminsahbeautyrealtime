CREATE TABLE "SteadfastWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'steadfast',
  "eventType" TEXT NOT NULL,
  "invoice" TEXT,
  "consignmentId" TEXT,
  "trackingCode" TEXT,
  "status" TEXT,
  "trackingMessage" TEXT,
  "payload" JSONB NOT NULL,
  "orderId" TEXT,
  "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
  "error" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SteadfastWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SteadfastWebhookEvent_eventKey_key" ON "SteadfastWebhookEvent"("eventKey");
CREATE INDEX "SteadfastWebhookEvent_eventType_receivedAt_idx" ON "SteadfastWebhookEvent"("eventType", "receivedAt");
CREATE INDEX "SteadfastWebhookEvent_invoice_idx" ON "SteadfastWebhookEvent"("invoice");
CREATE INDEX "SteadfastWebhookEvent_consignmentId_idx" ON "SteadfastWebhookEvent"("consignmentId");
CREATE INDEX "SteadfastWebhookEvent_trackingCode_idx" ON "SteadfastWebhookEvent"("trackingCode");
CREATE INDEX "SteadfastWebhookEvent_processingStatus_receivedAt_idx" ON "SteadfastWebhookEvent"("processingStatus", "receivedAt");

ALTER TABLE "SteadfastWebhookEvent"
ADD CONSTRAINT "SteadfastWebhookEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
