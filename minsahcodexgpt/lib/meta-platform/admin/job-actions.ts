import 'server-only';

import { getMetaJobAuditById, updateMetaJobAudit } from '@/lib/jobs/audit-repository';
import { getMetaQueue } from '@/lib/jobs/queues';
import { getMetaAdminActionControls } from './jobs-dto';

export async function cancelMetaAdminJob(input: Readonly<{
  auditId: string;
  requestedBy: string;
}>) {
  const controls = getMetaAdminActionControls();
  if (!controls.cancel.enabled) {
    throw Object.assign(new Error(controls.cancel.reasonCode), { status: 423, code: controls.cancel.reasonCode });
  }
  const audit = await getMetaJobAuditById(input.auditId);
  if (!audit) throw Object.assign(new Error('JOB_AUDIT_NOT_FOUND'), { status: 404, code: 'JOB_AUDIT_NOT_FOUND' });
  if (!['QUEUED', 'RUNNING', 'RETRYING'].includes(audit.status)) {
    throw Object.assign(new Error('JOB_STATUS_NOT_CANCELLABLE'), { status: 409, code: 'JOB_STATUS_NOT_CANCELLABLE' });
  }
  if (!audit.externalJobId) {
    throw Object.assign(new Error('JOB_EXTERNAL_ID_MISSING'), { status: 409, code: 'JOB_EXTERNAL_ID_MISSING' });
  }
  const job = await getMetaQueue(audit.queueName).getJob(audit.externalJobId);
  if (job) await job.remove();
  await updateMetaJobAudit({
    auditId: audit.id,
    status: 'CANCELLED',
    error: { code: 'ADMIN_CANCELLED', requestedBy: input.requestedBy },
  });
  return Object.freeze({ sourceAuditId: audit.id, status: 'CANCELLED' as const, queueJobRemoved: Boolean(job) });
}
