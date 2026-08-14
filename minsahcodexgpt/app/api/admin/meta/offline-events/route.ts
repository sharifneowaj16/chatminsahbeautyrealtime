import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/app/api/admin/_utils';
import { uploadOfflineConversions, type OfflineConversionInput } from '@/lib/meta-business/offline';
import { metaErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { withMetaSyncLog } from '@/lib/meta-business/logging';

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request); if (guard.response) return guard.response;
  try {
    const body = await readJsonObject(request);
    if (!Array.isArray(body.events) || body.events.length === 0) throw new Error('events array is required');
    const events = body.events as OfflineConversionInput[];
    const result = await withMetaSyncLog({ operation: 'UPLOAD_OFFLINE_CONVERSIONS', requestData: { eventCount: events.length }, run: () => uploadOfflineConversions(events), count: () => events.length });
    return NextResponse.json({ upload: result });
  } catch (error) { return metaErrorResponse(error); }
}
