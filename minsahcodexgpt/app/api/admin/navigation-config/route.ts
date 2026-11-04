import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import {
  getMobileNavigationConfig,
  saveMobileNavigationConfig,
} from '@/lib/navigation/config-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(
    request,
    ADMIN_PERMISSIONS.SETTINGS_VIEW
  );
  if (response) return response;

  try {
    const config = await getMobileNavigationConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve navigation configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminPermission(
    request,
    ADMIN_PERMISSIONS.SETTINGS_EDIT || ADMIN_PERMISSIONS.SETTINGS_VIEW
  );
  if (response) return response;

  try {
    const body = await request.json();
    const saved = await saveMobileNavigationConfig(body);
    return NextResponse.json({ success: true, config: saved });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update navigation configuration' },
      { status: 500 }
    );
  }
}

