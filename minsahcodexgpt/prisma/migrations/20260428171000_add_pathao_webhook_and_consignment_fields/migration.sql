ALTER TABLE "Order"
ADD COLUMN "pathaoConsignmentId" TEXT,
ADD COLUMN "pathaoTrackingCode" TEXT,
ADD COLUMN "pathaoSentAt" TIMESTAMP(3);

CREATE INDEX "Order_pathaoConsignmentId_idx" ON "Order"("pathaoConsignmentId");
CREATE INDEX "Order_pathaoTrackingCode_idx" ON "Order"("pathaoTrackingCode");

CREATE TABLE "PathaoWebhookEvent" (
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

CREATE UNIQUE INDEX "PathaoWebhookEvent_eventKey_key" ON "PathaoWebhookEvent"("eventKey");
CREATE INDEX "PathaoWebhookEvent_eventType_receivedAt_idx" ON "PathaoWebhookEvent"("eventType", "receivedAt");
CREATE INDEX "PathaoWebhookEvent_orderRef_idx" ON "PathaoWebhookEvent"("orderRef");
CREATE INDEX "PathaoWebhookEvent_consignmentId_idx" ON "PathaoWebhookEvent"("consignmentId");
CREATE INDEX "PathaoWebhookEvent_processingStatus_receivedAt_idx" ON "PathaoWebhookEvent"("processingStatus", "receivedAt");

ALTER TABLE "PathaoWebhookEvent"
ADD CONSTRAINT "PathaoWebhookEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
