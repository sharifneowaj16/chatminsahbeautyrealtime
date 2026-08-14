CREATE TABLE "MetaBusinessSyncLock" (
  "key" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaBusinessSyncLock_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "MetaBusinessSyncLock_expiresAt_idx" ON "MetaBusinessSyncLock"("expiresAt");

CREATE TABLE "MetaCatalogSyncItem" (
  "id" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "lastSubmittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaCatalogSyncItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MetaCatalogSyncItem_catalogId_retailerId_key" ON "MetaCatalogSyncItem"("catalogId", "retailerId");
CREATE INDEX "MetaCatalogSyncItem_catalogId_idx" ON "MetaCatalogSyncItem"("catalogId");
CREATE INDEX "MetaCatalogSyncItem_lastSubmittedAt_idx" ON "MetaCatalogSyncItem"("lastSubmittedAt");
