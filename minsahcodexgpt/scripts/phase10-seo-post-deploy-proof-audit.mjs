#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const productionMode = args.has('--production') || process.env.NODE_ENV === 'production';
const failures = [];
const checks = [];

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function check(name, condition, details = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, details });
  if (!ok) failures.push(`${name}${details ? ` — ${details}` : ''}`);
}

function scriptIncludes(pkg, scriptName, parts) {
  const script = pkg.scripts?.[scriptName] || '';
  return parts.every((part) => script.includes(part));
}

function getEnv(name) {
  return (process.env[name] || '').trim();
}

function isPlaceholder(value) {
  if (!value) return true;
  return /todo|replace|example|your[-_\s]?|000000|^bangladesh$|^bd$|^n\/a$|^none$|^null$/i.test(value.trim());
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value) {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15 && !/000000/.test(digits);
}

const pkg = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
const robots = exists('app/robots.ts') ? read('app/robots.ts') : '';
const sitemap = exists('app/sitemap.ts') ? read('app/sitemap.ts') : '';
const layout = exists('app/layout.tsx') ? read('app/layout.tsx') : '';
const contact = exists('app/contact/page.tsx') ? read('app/contact/page.tsx') : '';
const footer = exists('app/components/Footer.tsx') ? read('app/components/Footer.tsx') : '';
const businessProfile = exists('lib/businessProfile.ts') ? read('lib/businessProfile.ts') : '';
const envExample = exists('.env.example') ? read('.env.example') : '';
const doc = exists('docs/production/phase-10-seo-post-deploy-proof.md')
  ? read('docs/production/phase-10-seo-post-deploy-proof.md')
  : '';

check('Phase 10 production SEO doc exists', exists('docs/production/phase-10-seo-post-deploy-proof.md'));
check('SEO 100 audit script exists', exists('scripts/seo-100-static-audit.mjs'));
check('Phase 10 audit script registered', scriptIncludes(pkg, 'qa:phase10-seo-postdeploy', ['phase10-seo-post-deploy-proof-audit.mjs']));
check('qa:predeploy includes Phase 10 SEO proof', scriptIncludes(pkg, 'qa:predeploy', ['npm run qa:phase10-seo-postdeploy']));
check('qa:predeploy still includes SEO 100 static audit or Phase 10 proof', scriptIncludes(pkg, 'qa:predeploy', ['qa:phase10-seo-postdeploy']));

check('robots.ts exists', Boolean(robots));
check('robots.ts does not block /_next/', !robots.includes("'/_next/'") && !robots.includes('"/_next/"'));
for (const route of ['/admin/', '/api/', '/account/', '/checkout/', '/cart/', '/login/', '/register/', '/reset-password/', '/forgot-password/', '/wishlist/', '/favourites/']) {
  check(`robots.ts blocks private route ${route}`, robots.includes(`'${route}'`) || robots.includes(`"${route}"`));
}
check('robots.ts exposes sitemap', robots.includes('sitemap:'));
check('robots.ts exposes host', robots.includes('host:'));

check('sitemap.ts exists', Boolean(sitemap));
for (const route of ['/shop', '/categories', '/brands', '/about', '/contact', '/faq', '/flash-sale']) {
  check(`sitemap includes public route ${route}`, sitemap.includes(`absoluteUrl('${route}')`) || sitemap.includes(`absoluteUrl("${route}")`) || route === '/' && sitemap.includes('siteUrl'));
}
for (const privateRoute of ['/search', '/cart', '/checkout', '/login', '/register', '/account', '/wishlist', '/favourites', '/admin', '/test']) {
  check(`sitemap excludes private/noindex route ${privateRoute}`, !sitemap.includes(`absoluteUrl('${privateRoute}')`) && !sitemap.includes(`absoluteUrl("${privateRoute}")`));
}
check('sitemap only includes active products', sitemap.includes('isActive: true') && sitemap.includes('deletedAt: null'));
check('sitemap respects product sitemap indexing payload', sitemap.includes('shouldIndexFromSitemapPayload'));

for (const asset of ['public/images/og-default.jpg', 'public/images/logo.png']) {
  check(`${asset} exists`, exists(asset));
  if (exists(asset)) check(`${asset} is non-empty`, fs.statSync(path.join(root, asset)).size > 1024);
}

check('Root layout has metadataBase', layout.includes('metadataBase'));
check('Root layout has canonical metadata', layout.includes('alternates') && layout.includes('canonical'));
check('Root layout has OpenGraph image', layout.includes('openGraph') && layout.includes('/images/og-default.jpg'));
check('Root layout has Twitter image', layout.includes('twitter') && layout.includes('/images/og-default.jpg'));
check('Root layout emits Organization JSON-LD', layout.includes("'@type': 'Organization'"));
check('Root layout emits WebSite SearchAction JSON-LD', layout.includes("'@type': 'SearchAction'") && layout.includes('search_term_string'));

check('businessProfile helper exists', Boolean(businessProfile));
check('businessProfile detects placeholders', businessProfile.includes('isPlaceholderBusinessValue') && businessProfile.includes('PLACEHOLDER_PATTERNS'));
check('Footer uses businessProfile helper', footer.includes('getBusinessProfile'));
check('Contact page uses businessProfile helper', contact.includes('getBusinessProfile'));
check('Root layout uses businessProfile helper for Organization schema', layout.includes('getBusinessProfile'));
check('Organization sameAs is env-derived, not hardcoded fake social profile', !layout.includes('facebook.com/minsahbeauty') && !layout.includes('instagram.com/minsahbeauty'));
check('Footer/contact do not hardcode placeholder phone', !footer.includes('+880 1700 000000') && !contact.includes('+880 1700 000000'));
check('ContactPage JSON-LD includes contactPoint', contact.includes('contactPoint'));
check('ContactPage JSON-LD links to Organization entity', contact.includes("'@id': absoluteUrl('/#organization')"));

check('.env.example defines support email', envExample.includes('NEXT_PUBLIC_SUPPORT_EMAIL'));
check('.env.example requires verified phone placeholder replacement', envExample.includes('NEXT_PUBLIC_SUPPORT_PHONE=TODO_REPLACE_WITH_VERIFIED_BANGLADESH_SUPPORT_PHONE'));
check('.env.example requires verified address placeholder replacement', envExample.includes('NEXT_PUBLIC_BUSINESS_ADDRESS=TODO_REPLACE_WITH_VERIFIED_BUSINESS_ADDRESS'));
check('.env.example defines optional social profile URLs', envExample.includes('NEXT_PUBLIC_FACEBOOK_URL') && envExample.includes('NEXT_PUBLIC_INSTAGRAM_URL'));

for (const required of [
  'robots.txt',
  'sitemap.xml',
  'Google Search Console',
  'Bing Webmaster Tools',
  'Open Graph',
  'Rich Results',
  'noindex',
  'www',
  'NEXT_PUBLIC_SUPPORT_PHONE',
  'npm run qa:phase10-seo-postdeploy',
  '--production',
  'No-Go',
]) {
  check(`Phase 10 doc mentions ${required}`, doc.includes(required));
}

if (productionMode) {
  const appUrl = getEnv('NEXT_PUBLIC_APP_URL') || getEnv('NEXT_PUBLIC_SITE_URL') || getEnv('APP_URL');
  const supportEmail = getEnv('NEXT_PUBLIC_SUPPORT_EMAIL');
  const supportPhone = getEnv('NEXT_PUBLIC_SUPPORT_PHONE');
  const businessAddress = getEnv('NEXT_PUBLIC_BUSINESS_ADDRESS');
  const facebookUrl = getEnv('NEXT_PUBLIC_FACEBOOK_URL');
  const instagramUrl = getEnv('NEXT_PUBLIC_INSTAGRAM_URL');

  check('production app URL is HTTPS and public', isHttpsUrl(appUrl), `value=${appUrl || '<missing>'}`);
  check('production support email is valid and not placeholder', isEmail(supportEmail) && !isPlaceholder(supportEmail));
  check('production support phone is valid and not placeholder', isPhone(supportPhone) && !isPlaceholder(supportPhone));
  check('production business address is verified and not placeholder', !isPlaceholder(businessAddress));

  if (facebookUrl) check('production Facebook URL is HTTPS if set', isHttpsUrl(facebookUrl));
  if (instagramUrl) check('production Instagram URL is HTTPS if set', isHttpsUrl(instagramUrl));
}

const failed = checks.filter((check) => !check.ok);
const result = {
  ok: failed.length === 0,
  mode: productionMode ? 'production' : 'static',
  passed: checks.length - failed.length,
  failed: failed.length,
  issues: failed.map((check) => check.name),
};

if (process.env.AUDIT_JSON === '1') {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const check of checks) {
    console.log(`${check.ok ? '✅' : '❌'} ${check.name}${check.details ? ` — ${check.details}` : ''}`);
  }
  console.log(`\nPhase 10 SEO post-deploy proof audit (${result.mode} mode): ${result.passed}/${checks.length} checks passed.`);
}

if (!result.ok) process.exit(1);
