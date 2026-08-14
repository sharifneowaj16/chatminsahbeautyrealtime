import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { createProductFeed, scheduleProductFeed, uploadProductFeed } from '@/lib/meta-business/catalog';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { assertHttpUrl, optionalTrimmedString, parseFeedAction, parseFeedSchedule } from '@/lib/meta-business/validation';

function safeFeedAuditPayload(input: Record<string, unknown>, action: string) {
  return {
    action,
    feedId: typeof input.feedId === 'string' ? input.feedId : null,
    catalogId: typeof input.catalogId === 'string' ? input.catalogId : null,
    name: typeof input.name === 'string' ? input.name : null,
    country: typeof input.country === 'string' ? input.country : null,
    locale: typeof input.locale === 'string' ? input.locale : null,
    defaultCurrency: typeof input.defaultCurrency === 'string' ? input.defaultCurrency : null,
    interval: typeof input.interval === 'string' ? input.interval : null,
    urlConfigured: typeof input.url === 'string' && input.url.trim().length > 0,
  };
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (guard.response) return guard.response;
  const admin = guard.admin!;
  try {
    const body = await readJsonObject(request);
    const action = parseFeedAction(body.action);
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_CATALOG_FEED_MUTATION', resourceType: 'META_CATALOG_FEED',
      resourceId: typeof body.feedId === 'string' ? body.feedId : typeof body.catalogId === 'string' ? body.catalogId : null,
      payload: safeFeedAuditPayload(body, action), reason: typeof body.reason === 'string' ? body.reason : `Catalog feed ${action}`,
      run: async () => {
        if (action === 'upload') return uploadProductFeed({
          feedId: requiredString(body.feedId, 'feedId'),
          url: assertHttpUrl(optionalTrimmedString(body.url, 'url', 2048), 'url'),
        });
        if (action === 'schedule') {
          const schedule = parseFeedSchedule(body);
          return scheduleProductFeed({
            feedId: requiredString(body.feedId, 'feedId'),
            url: assertHttpUrl(optionalTrimmedString(body.url, 'url', 2048), 'url'),
            ...schedule,
          });
        }
        return createProductFeed({
          catalogId: optionalTrimmedString(body.catalogId, 'catalogId'),
          name: requiredString(body.name, 'name'),
          country: optionalTrimmedString(body.country, 'country', 2)?.toUpperCase(),
          locale: optionalTrimmedString(body.locale, 'locale', 20),
          defaultCurrency: optionalTrimmedString(body.defaultCurrency, 'defaultCurrency', 3)?.toUpperCase(),
        });
      },
    });
    return NextResponse.json({ feed: executed.result, auditId: executed.auditId }, { status: action === 'create' ? 201 : 200 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
