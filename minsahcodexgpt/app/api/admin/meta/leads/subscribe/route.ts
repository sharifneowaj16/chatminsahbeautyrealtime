import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/app/api/admin/_utils';
import { subscribeMetaPageLeadgenProduction } from '@/lib/meta-platform/domains/pages/runtime';
import { metaErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { withMetaSyncLog } from '@/lib/meta-business/logging';

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request); if (guard.response) return guard.response;
  try {
    const body = await readJsonObject(request);
    const pageId = typeof body.pageId === 'string' ? body.pageId : undefined;
    const result = await withMetaSyncLog({ operation: 'SUBSCRIBE_PAGE_LEADGEN_WEBHOOK', resourceId: pageId, requestData: { pageId: pageId ?? null, subscribedFields: ['leadgen'] }, run: () => subscribeMetaPageLeadgenProduction(pageId) });
    return NextResponse.json({ subscription: result });
  } catch (error) { return metaErrorResponse(error); }
}
