import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/app/api/admin/_utils';
import { metaErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { createDefaultMetaSocialQueueAdapter } from '@/lib/meta-platform/server';
import {
  cleanupMetaTestLeadsProduction,
  createMetaTestLeadProduction,
} from '@/lib/meta-platform/domains/leads/test-lead-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (guard.response) return guard.response;
  try {
    const body = await readJsonObject(request);
    const adapter = await createDefaultMetaSocialQueueAdapter();
    const evidence = await createMetaTestLeadProduction({
      formId: requiredString(body.formId, 'formId'),
      pageId: typeof body.pageId === 'string' ? body.pageId.trim() || undefined : undefined,
      adapter,
    });
    return NextResponse.json({ accepted: true, evidence }, { status: 202 });
  } catch (error) {
    return metaErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (guard.response) return guard.response;
  try {
    const body = await readJsonObject(request).catch((): Record<string, unknown> => ({}));
    const result = await cleanupMetaTestLeadsProduction({
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      olderThan: typeof body.olderThan === 'string' && !Number.isNaN(Date.parse(body.olderThan)) ? new Date(body.olderThan) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return metaErrorResponse(error);
  }
}
