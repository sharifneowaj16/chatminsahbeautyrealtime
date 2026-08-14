import { NextRequest, NextResponse } from 'next/server';
import { adminUnauthorizedResponse, getVerifiedAdmin, requireSuperAdmin } from '@/app/api/admin/_utils';
import { getMetaReadiness } from '@/lib/meta-business/config';
import { getMetaBusinessPreferences, saveMetaBusinessPreferences } from '@/lib/meta-business/preferences';
import { metaErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { buildMetaConnectionBootstrapReadiness } from '@/lib/meta/connection/readiness';
import { getLatestMetaConnectionReadiness } from '@/lib/meta/connection/repository';

export async function GET(request: NextRequest) {
  if (!(await getVerifiedAdmin(request))) return adminUnauthorizedResponse();
  try {
    const bootstrap = buildMetaConnectionBootstrapReadiness();
    const [preferences, connection] = await Promise.all([
      getMetaBusinessPreferences(),
      getLatestMetaConnectionReadiness(bootstrap.connectionName).catch(() => null),
    ]);
    return NextResponse.json({
      readiness: getMetaReadiness(),
      connection: connection ?? bootstrap,
      preferences,
    });
  } catch (error) {
    return metaErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (guard.response) return guard.response;
  try {
    const body = await readJsonObject(request);
    const preferences = await saveMetaBusinessPreferences(body);
    return NextResponse.json({ preferences, readiness: getMetaReadiness() });
  } catch (error) {
    return metaErrorResponse(error);
  }
}
