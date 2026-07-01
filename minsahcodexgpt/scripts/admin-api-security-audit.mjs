import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const adminApiRoot = path.join(root, 'app/api/admin');

const allowedAuthRoutes = new Set([
  'app/api/admin/auth/login/route.ts',
  'app/api/admin/auth/logout/route.ts',
  'app/api/admin/auth/me/route.ts',
  'app/api/admin/auth/refresh/route.ts',
]);

const acceptedGuardTokens = [
  'requireAdmin(',
  'requireAdminPermission(',
  'requireSuperAdmin(',
  'getVerifiedAdmin(',
  'verifyAdminAccessToken(',
  'adminUnauthorizedResponse(',
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function isExplicitlyDisabled(text) {
  return /status\s*:\s*410/.test(text) || text.includes('legacyRouteGone') || text.includes('legacyPaymentRouteGone');
}

function hasGuard(text) {
  return acceptedGuardTokens.some((token) => text.includes(token));
}

const issues = [];
const files = walk(adminApiRoot);

for (const file of files) {
  const relative = rel(file);
  const text = fs.readFileSync(file, 'utf8');

  if (allowedAuthRoutes.has(relative)) continue;
  if (isExplicitlyDisabled(text)) continue;

  if (!hasGuard(text)) {
    issues.push(`Admin API route has no backend auth guard or explicit 410: ${relative}`);
  }
}

const siteConfig = path.join(root, 'app/api/admin/site-config/route.ts');
if (fs.existsSync(siteConfig)) {
  const text = fs.readFileSync(siteConfig, 'utf8');
  for (const required of [
    'requireAdminPermission',
    'ADMIN_PERMISSIONS.SETTINGS_VIEW',
    'ADMIN_PERMISSIONS.SETTINGS_EDIT',
  ]) {
    if (!text.includes(required)) {
      issues.push(`Site config route missing required admin permission guard (${required}).`);
    }
  }
}

const elasticsearch = path.join(root, 'app/api/admin/elasticsearch/route.ts');
if (fs.existsSync(elasticsearch)) {
  const text = fs.readFileSync(elasticsearch, 'utf8');
  if (!text.includes('requireSuperAdmin')) {
    issues.push('Elasticsearch admin route must be SUPER_ADMIN-only via requireSuperAdmin.');
  }
  if (text.includes('requireAdminPermission') && !text.includes('requireSuperAdmin')) {
    issues.push('Elasticsearch admin route must not use a weaker permission guard than SUPER_ADMIN.');
  }
}

const utilsPath = path.join(root, 'app/api/admin/_utils.ts');
if (fs.existsSync(utilsPath)) {
  const text = fs.readFileSync(utilsPath, 'utf8');
  for (const required of ['requireAdmin', 'requireAdminPermission', 'requireSuperAdmin', 'adminForbiddenResponse']) {
    if (!text.includes(`function ${required}`) && !text.includes(`const ${required}`)) {
      issues.push(`Admin API utility missing shared guard: ${required}`);
    }
  }
} else {
  issues.push('Admin API utility file missing: app/api/admin/_utils.ts');
}

if (issues.length) {
  console.error(JSON.stringify({ ok: false, issueCount: issues.length, issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, adminRoutesScanned: files.length }, null, 2));
