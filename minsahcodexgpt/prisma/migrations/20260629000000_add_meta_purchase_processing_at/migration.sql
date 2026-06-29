ALTER TABLE "Order" ADD COLUMN "metaPurchaseProcessingAt" TIMESTAMP(3);

CREATE INDEX "Order_metaPurchaseProcessingAt_idx" ON "Order"("metaPurchaseProcessingAt");
