CREATE TABLE "MetaCatalogBatch" (
  "id" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "itemCount" INTEGER NOT NULL DEFAULT 0,
  "responseData" JSONB,
  "errorData" JSONB,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "MetaCatalogBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MetaCatalogBatch_handle_key" ON "MetaCatalogBatch"("handle");
CREATE INDEX "MetaCatalogBatch_catalogId_idx" ON "MetaCatalogBatch"("catalogId");
CREATE INDEX "MetaCatalogBatch_status_idx" ON "MetaCatalogBatch"("status");
CREATE INDEX "MetaCatalogBatch_submittedAt_idx" ON "MetaCatalogBatch"("submittedAt");
