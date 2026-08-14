-- Recovery is safe only before Phase 27 workflow/reconciliation/replay consumers are enabled.
-- After durable records exist, preserve them and ship a reviewed forward-fix migration.
DROP TRIGGER IF EXISTS "MetaReplay_protect_immutable_fields" ON "MetaReplay";
DROP TRIGGER IF EXISTS "MetaReconciliation_protect_immutable_fields" ON "MetaReconciliation";
DROP TRIGGER IF EXISTS "MetaProviderJob_protect_immutable_fields" ON "MetaProviderJob";
DROP TRIGGER IF EXISTS "MetaWorkflowStep_protect_immutable_fields" ON "MetaWorkflowStep";
DROP TRIGGER IF EXISTS "MetaWorkflow_protect_immutable_fields" ON "MetaWorkflow";
DROP FUNCTION IF EXISTS "meta_replay_protect_immutable_fields"();
DROP FUNCTION IF EXISTS "meta_reconciliation_protect_immutable_fields"();
DROP FUNCTION IF EXISTS "meta_provider_job_protect_immutable_fields"();
DROP FUNCTION IF EXISTS "meta_workflow_step_protect_immutable_fields"();
DROP FUNCTION IF EXISTS "meta_workflow_protect_immutable_fields"();
DROP TABLE IF EXISTS "MetaWorkflowLock";
DROP TABLE IF EXISTS "MetaReplay";
DROP TABLE IF EXISTS "MetaReconciliation";
DROP TABLE IF EXISTS "MetaProviderJob";
DROP TABLE IF EXISTS "MetaWorkflowStep";
DROP TABLE IF EXISTS "MetaWorkflow";
DROP TYPE IF EXISTS "MetaReplayStatus";
DROP TYPE IF EXISTS "MetaReconciliationStatus";
DROP TYPE IF EXISTS "MetaProviderJobStatus";
DROP TYPE IF EXISTS "MetaWorkflowStepStatus";
DROP TYPE IF EXISTS "MetaWorkflowStatus";
