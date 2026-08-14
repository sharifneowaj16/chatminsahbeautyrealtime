-- Meta v6 Phase 09: Admin Operations Center approval and immutable mutation audit.
CREATE TYPE "MetaAdminActionRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "MetaAdminApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTING', 'EXECUTED', 'FAILED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "MetaAdminAuditOutcome" AS ENUM ('SUCCEEDED', 'FAILED', 'DENIED');

CREATE TABLE "MetaAdminApproval" (
  "id" TEXT NOT NULL,
  "actionKey" TEXT NOT NULL,
  "risk" "MetaAdminActionRisk" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "payloadHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "MetaAdminApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "rejectedById" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3),
  "executionStartedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "failureData" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaAdminApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaAdminAudit" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actionKey" TEXT NOT NULL,
  "risk" "MetaAdminActionRisk" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "approvalId" TEXT,
  "outcome" "MetaAdminAuditOutcome" NOT NULL,
  "beforeData" JSONB,
  "afterData" JSONB,
  "reason" TEXT,
  "requestId" TEXT,
  "traceId" TEXT,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "errorData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaAdminAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetaAdminApproval_status_expiresAt_idx" ON "MetaAdminApproval"("status", "expiresAt");
CREATE INDEX "MetaAdminApproval_actionKey_status_idx" ON "MetaAdminApproval"("actionKey", "status");
CREATE INDEX "MetaAdminApproval_resourceType_resourceId_idx" ON "MetaAdminApproval"("resourceType", "resourceId");
CREATE INDEX "MetaAdminApproval_requestedById_requestedAt_idx" ON "MetaAdminApproval"("requestedById", "requestedAt");
CREATE INDEX "MetaAdminAudit_actorId_createdAt_idx" ON "MetaAdminAudit"("actorId", "createdAt");
CREATE INDEX "MetaAdminAudit_actionKey_createdAt_idx" ON "MetaAdminAudit"("actionKey", "createdAt");
CREATE INDEX "MetaAdminAudit_resourceType_resourceId_idx" ON "MetaAdminAudit"("resourceType", "resourceId");
CREATE INDEX "MetaAdminAudit_approvalId_idx" ON "MetaAdminAudit"("approvalId");
CREATE INDEX "MetaAdminAudit_outcome_createdAt_idx" ON "MetaAdminAudit"("outcome", "createdAt");

ALTER TABLE "MetaAdminApproval" ADD CONSTRAINT "MetaAdminApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MetaAdminApproval" ADD CONSTRAINT "MetaAdminApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaAdminApproval" ADD CONSTRAINT "MetaAdminApproval_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaAdminAudit" ADD CONSTRAINT "MetaAdminAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MetaAdminAudit" ADD CONSTRAINT "MetaAdminAudit_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "MetaAdminApproval"("id") ON DELETE SET NULL ON UPDATE CASCADE;
