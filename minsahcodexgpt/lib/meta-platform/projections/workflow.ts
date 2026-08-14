import type { MetaOperationStatus } from '../operations/types';
import type { MetaWorkflowStore } from '../workflows/store';
import { META_PROVIDER_JOB_STATUSES, type MetaProviderJobStatus, type MetaWorkflowProjection } from '../workflows/types';

export async function buildMetaWorkflowProjection(input: {
  readonly workflowId: string;
  readonly operationStatus: MetaOperationStatus;
  readonly store: MetaWorkflowStore;
}): Promise<MetaWorkflowProjection> {
  const workflow = await input.store.getWorkflow(input.workflowId);
  if (!workflow) throw new Error('META_WORKFLOW_NOT_FOUND');
  const [steps, providerJobs, reconciliations] = await Promise.all([
    input.store.listWorkflowSteps(workflow.id),
    input.store.listProviderJobs(workflow.id),
    input.store.listReconciliations(workflow.id),
  ]);
  const providerCounts = Object.fromEntries(META_PROVIDER_JOB_STATUSES.map((status) => [status, 0])) as Record<MetaProviderJobStatus, number>;
  for (const job of providerJobs) providerCounts[job.status] += 1;
  const pendingReconciliations = reconciliations.filter((item) => ['PENDING', 'RUNNING', 'NEEDS_REVIEW'].includes(item.status)).length;
  const unknownSteps = steps.filter((step) => step.status === 'UNKNOWN').length;
  return Object.freeze({
    operationId: workflow.operationId,
    workflowId: workflow.id,
    workflowStatus: workflow.status,
    ...(workflow.currentStepKey ? { currentStepKey: workflow.currentStepKey } : {}),
    version: workflow.version,
    completedSteps: steps.filter((step) => ['SUCCEEDED', 'COMPENSATED', 'SKIPPED'].includes(step.status)).length,
    totalSteps: steps.length,
    unknownSteps,
    failedSteps: steps.filter((step) => step.status === 'FAILED').length,
    pendingReconciliations,
    providerJobs: Object.freeze(providerCounts),
    replayable: ['PERMANENT_FAILURE', 'QUARANTINED', 'CANCELLED'].includes(input.operationStatus)
      && pendingReconciliations === 0
      && unknownSteps === 0,
    updatedAt: workflow.updatedAt,
  });
}
