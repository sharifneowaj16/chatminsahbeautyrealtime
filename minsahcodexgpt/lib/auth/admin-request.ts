import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import {
  getAdminPermissions,
  type AdminPermission,
} from '@/lib/auth/admin-permissions';

export type VerifiedAdmin = {
  adminId: string;
  email: string;
  role: string;
  name: string;
  permissions: AdminPermission[];
};

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

export function getAdminAccessToken(request: NextRequest): string | null {
  return getBearerToken(request) || request.cookies.get('admin_access_token')?.value || null;
}

export async function getVerifiedAdmin(
  request: NextRequest
): Promise<VerifiedAdmin | null> {
  const accessToken = getAdminAccessToken(request);
  if (!accessToken) {
    return null;
  }

  const payload = await verifyAdminAccessToken(accessToken);
  if (!payload) {
    return null;
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      status: true,
    },
  });
  if (!admin || admin.status !== 'ACTIVE') {
    return null;
  }

  return {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
    permissions: getAdminPermissions(admin.role),
  };
}

export function adminHasPermission(
  admin: VerifiedAdmin,
  permission: AdminPermission
): boolean {
  return admin.permissions.includes(permission);
}

export function adminHasAnyPermission(
  admin: VerifiedAdmin,
  permissions: AdminPermission[]
): boolean {
  return permissions.some((permission) => admin.permissions.includes(permission));
}
