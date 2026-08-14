#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
}
function includes(file, fragment) {
  return read(file).includes(fragment);
}
function routeHasAdminUploadGuard(file) {
  const source = read(file);
  return source.includes("@/lib/auth/upload-route-guard")
    && source.includes('requireAdminUploadPermission(request')
    && source.includes('if (guard) return guard;');
}

const adminMediaRoutes = [
  'app/api/media/route.ts',
  'app/api/upload/banner/route.ts',
  'app/api/upload/blog/route.ts',
  'app/api/upload/brand/route.ts',
  'app/api/upload/category/route.ts',
  'app/api/upload/product/route.ts',
];

for (const route of adminMediaRoutes) {
  check(`${route} has route-level admin upload guard`, routeHasAdminUploadGuard(route));
}

check(
  'media library GET/POST/DELETE are guarded',
  ['export async function GET', 'export async function POST', 'export async function DELETE'].every((fn) => {
    const source = read('app/api/media/route.ts');
    const start = source.indexOf(fn);
    const next = source.indexOf('try {', start);
    const segment = source.slice(start, next);
    return segment.includes('requireAdminUploadPermission(request, CONTENT_UPLOAD_PERMISSIONS)')
      && segment.includes('if (guard) return guard;');
  })
);

check(
  'generic /api/upload remains admin protected',
  includes('app/api/upload/route.ts', 'getVerifiedAdmin(request)')
    && includes('app/api/upload/route.ts', 'adminHasAnyPermission(admin')
    && includes('app/api/upload/route.ts', 'ADMIN_PERMISSIONS.PRODUCTS_CREATE')
    && includes('app/api/upload/route.ts', 'ADMIN_PERMISSIONS.PRODUCTS_EDIT')
);

check(
  'product upload requires product create/edit permission',
  includes('app/api/upload/product/route.ts', 'PRODUCT_UPLOAD_PERMISSIONS')
);

check(
  'content upload routes require content/catalog permission constants',
  includes('app/api/upload/banner/route.ts', 'CONTENT_UPLOAD_PERMISSIONS')
    && includes('app/api/upload/blog/route.ts', 'CONTENT_UPLOAD_PERMISSIONS')
    && includes('app/api/upload/category/route.ts', 'CONTENT_UPLOAD_PERMISSIONS')
    && includes('app/api/upload/brand/route.ts', 'CATALOG_MEDIA_UPLOAD_PERMISSIONS')
);

check(
  'avatar upload requires authenticated user',
  includes('app/api/upload/avatar/route.ts', 'getAuthenticatedUserId(request)')
    && includes('app/api/upload/avatar/route.ts', "return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })")
);

check(
  'avatar upload rejects arbitrary userId overwrite',
  includes('app/api/upload/avatar/route.ts', 'requestedUserId && requestedUserId !== authenticatedUserId')
    && includes('app/api/upload/avatar/route.ts', 'Cannot upload avatar for another user')
    && includes('app/api/upload/avatar/route.ts', 'const userId = requestedUserId || authenticatedUserId')
);

check(
  'returns evidence upload remains user-authenticated and path-scoped',
  includes('app/api/returns/upload/route.ts', 'getAuthenticatedUserId(request)')
    && includes('app/api/returns/upload/route.ts', 'returns/${userId}')
    && includes('app/api/returns/upload/route.ts', 'key.startsWith(`returns/${userId}/`)')
);

check(
  'admin media UI uses adminFetch session-aware requests',
  includes('app/admin/media/page.tsx', "import { adminFetch } from '@/lib/adminFetch';")
    && includes('app/admin/media/page.tsx', 'adminFetch(`/api/media${params}`)')
    && includes('app/admin/media/page.tsx', "adminFetch('/api/media', { method: 'POST'")
    && includes('app/admin/media/page.tsx', 'adminFetch(`/api/media?key=${encodeURIComponent(key)}`')
);

const failed = checks.filter((item) => !item.ok);
const result = {
  ok: failed.length === 0,
  passed: checks.length - failed.length,
  failed: failed.length,
  issues: failed.map((item) => item.name),
};

console.log(JSON.stringify(result, null, 2));

if (failed.length) {
  process.exit(1);
}
