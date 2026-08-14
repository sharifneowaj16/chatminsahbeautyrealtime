import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { listMetaJobAudits } from '@/lib/jobs/audit-repository';
import { replayMetaDeadLetter } from '@/lib/jobs/dead-letter';
import { META_QUEUE_NAMES } from '@/lib/jobs/job-types';
import { projectMetaJobFailureForAdmin } from '@/lib/meta-platform/queue';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_VIEW);
  if (response) return response;
  const limit = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50), 200));
  const jobs = await listMetaJobAudits({
    status: 'DEAD_LETTER',
    queueName: META_QUEUE_NAMES.SOCIAL,
    limit,
  });
  return NextResponse.json({
    count: jobs.length,
    jobs: jobs.map((job) => ({
      id: job.id,
      jobName: job.jobName,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastError: projectMetaJobFailureForAdmin(job.lastError),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    })),
    owner: 'main-app-bullmq',
  });
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_OPERATE);
  if (response) return response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const auditId = typeof body.auditId === 'string' ? body.auditId : '';
  const approvalId = typeof body.approvalId === 'string' ? body.approvalId : '';
  const reason = typeof body.reason === 'string' ? body.reason : 'Manual social dead-letter replay';
  if (!auditId || !approvalId) {
    return NextResponse.json({ error: 'auditId and approvalId are required' }, { status: 400 });
  }
  const replay = await replayMetaDeadLetter({
    auditId,
    approvalId,
    requestedBy: admin.adminId,
    reason,
  });
  return NextResponse.json(replay, { status: replay.ok ? 202 : 409 });
}
