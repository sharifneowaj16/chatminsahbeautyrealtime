import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const issues = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    issues.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function assertIncludes(text, token, message) {
  if (!text.includes(token)) issues.push(message);
}

function assertNotExists(relativePath, message) {
  if (fs.existsSync(path.join(root, relativePath))) issues.push(message);
}

const categoriesRoute = read('app/api/categories/route.ts');
const categoryIdRoute = read('app/api/categories/[id]/route.ts');
const categoriesContext = read('contexts/CategoriesContext.tsx');
const adminCategoriesPage = read('app/admin/categories/page.tsx');

assertIncludes(
  categoriesRoute,
  "import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';",
  'Categories route must import admin permissions.'
);
assertIncludes(
  categoriesRoute,
  "import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';",
  'Categories route must use the shared admin request verifier.'
);
assertIncludes(
  categoriesRoute,
  'ADMIN_PERMISSIONS.CONTENT_MANAGE',
  'Categories route must require CONTENT_MANAGE permission.'
);
assertIncludes(
  categoriesRoute,
  "searchParams.get('activeOnly') === 'false'",
  'Categories GET must explicitly detect activeOnly=false.'
);
assertIncludes(
  categoriesRoute,
  'requestedInactiveCategories',
  'Categories GET must gate inactive/admin category listing.'
);
assertIncludes(
  categoriesRoute,
  'const adminResponse = await requireCategoryAdmin(request);',
  'Categories POST/GET admin-only branches must call requireCategoryAdmin.'
);
assertIncludes(
  categoriesRoute,
  'const nestedWhere = activeOnly ? { isActive: true } : undefined;',
  'Public category GET must filter inactive child categories as well as roots.'
);

assertIncludes(
  categoryIdRoute,
  "import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';",
  'Category detail route must import admin permissions.'
);
assertIncludes(
  categoryIdRoute,
  "import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';",
  'Category detail route must use the shared admin request verifier.'
);
assertIncludes(
  categoryIdRoute,
  'ADMIN_PERMISSIONS.CONTENT_MANAGE',
  'Category detail route must require CONTENT_MANAGE permission.'
);
assertIncludes(
  categoryIdRoute,
  'export async function DELETE(',
  'Category detail route must still expose DELETE for authorized admins.'
);
assertIncludes(
  categoryIdRoute,
  'export async function PUT(',
  'Category detail route must still expose PUT for authorized admins.'
);

const idRouteAdminGuardCalls = (categoryIdRoute.match(/requireCategoryAdmin\(request\)/g) || []).length;
if (idRouteAdminGuardCalls < 2) {
  issues.push('PUT and DELETE must both call requireCategoryAdmin(request).');
}

assertIncludes(
  categoryIdRoute,
  'tx.product.updateMany',
  'Category update must unlink products from removed descendant categories before deleting them.'
);
assertNotExists(
  'app/app/api/categories/[id]/route.ts',
  'Duplicate legacy/mislocated category delete route must be removed.'
);

assertIncludes(
  categoriesContext,
  "credentials: 'include'",
  'Admin category context must send admin auth cookies when loading activeOnly=false.'
);
assertIncludes(
  adminCategoriesPage,
  "credentials: 'include'",
  'Admin category save/delete fetches must send admin auth cookies.'
);

if (issues.length) {
  console.error(JSON.stringify({ ok: false, issueCount: issues.length, issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checks: {
    categoryPostGuarded: true,
    categoryPutGuarded: true,
    categoryDeleteGuarded: true,
    inactiveCategoryListingGuarded: true,
    inactiveChildrenFilteredFromPublicGet: true,
    duplicateLegacyRouteRemoved: true,
    adminFetchesUseCredentials: true,
  },
}, null, 2));
