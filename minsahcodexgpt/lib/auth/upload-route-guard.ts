import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from '@/lib/auth/admin-permissions';
import {
  adminHasAnyPermission,
  getVerifiedAdmin,
} from '@/lib/auth/admin-request';

export const PRODUCT_UPLOAD_PERMISSIONS: AdminPermission[] = [
  ADMIN_PERMISSIONS.PRODUCTS_CREATE,
  ADMIN_PERMISSIONS.PRODUCTS_EDIT,
];

export const CONTENT_UPLOAD_PERMISSIONS: AdminPermission[] = [
  ADMIN_PERMISSIONS.CONTENT_MANAGE,
];

export const CATALOG_MEDIA_UPLOAD_PERMISSIONS: AdminPermission[] = [
  ADMIN_PERMISSIONS.CONTENT_MANAGE,
  ADMIN_PERMISSIONS.PRODUCTS_CREATE,
  ADMIN_PERMISSIONS.PRODUCTS_EDIT,
];

export async function requireAdminUploadPermission(
  request: NextRequest,
  permissions: AdminPermission[] = CONTENT_UPLOAD_PERMISSIONS
): Promise<NextResponse | null> {
  const admin = await getVerifiedAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!adminHasAnyPermission(admin, permissions)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }

  return null;
}
