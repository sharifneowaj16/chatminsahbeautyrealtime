import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const ignoreDirs = new Set([
  '.git',
  '.next',
  'node_modules',
  'generated',
  'coverage',
  'out',
  'build',
]);

const secretFileNames = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'credentials.json',
  'secrets.json',
]);

const sensitiveFileExtensions = new Set(['.pem', '.key', '.p12', '.pfx']);

const suspiciousPatterns = [
  {
    name: 'OpenAI/API-style secret',
    pattern: /\b(sk-[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{20,})\b/,
  },
  {
    name: 'hardcoded Pathao integration UUID',
    pattern: /f3992ecc-59da-4cbe-a049-a13da2018d51/i,
  },
  {
    name: 'public WS auth signing secret',
    pattern: /NEXT_PUBLIC_WS_AUTH_SECRET/,
  },
  {
    name: 'known demo password',
    pattern: /YourSuperSecurePassword123!|ChangeThisImmediately123!/,
  },
  {
    name: 'tracking cron placeholder',
    pattern: /TRACKING_HEALTH_CRON_SECRET=change-me/,
  },
  {
    name: 'real env assignment placeholder mismatch',
    pattern: /(META_CAPI_ACCESS_TOKEN|GA4_API_SECRET|JWT_SECRET|JWT_REFRESH_SECRET|NEXTAUTH_SECRET|PAYMENT_WEBHOOK_SECRET|WS_AUTH_SECRET|REPLY_API_SECRET)=\s*$/,
    allow: (file) => file.endsWith('.env.example'),
  },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

const phase1LegacyPaymentFiles = {
  'app/api/payments/card/create/route.ts': '/api/payments/card/create',
  'app/api/payments/cod/create/route.ts': '/api/payments/cod/create',
  'app/api/payments/bkash/execute/route.ts': '/api/payments/bkash/execute',
};

const phase1LegacyPageFile = 'app/checkout/payment/card/page.tsx';

const phase2DisabledPaymentRoutes = {
  'app/api/payments/rocket/create/route.ts': '/api/payments/rocket/create',
};

const phase2DisabledPaymentPages = {
  'app/checkout/payment/rocket/page.tsx': '/checkout',
};

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function isSourceFile(relative) {
  return sourceExtensions.has(path.extname(relative));
}

function assertPhase1LegacyPaymentLock(files, issues) {
  const relativeFileSet = new Set(files.map(rel));

  for (const [relative, routePath] of Object.entries(phase1LegacyPaymentFiles)) {
    if (!relativeFileSet.has(relative)) {
      continue;
    }

    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    if (!text.includes('legacyPaymentRouteGone')) {
      issues.push(`Legacy payment route is not hard-disabled: ${relative}`);
    }
    if (!text.includes('export async function POST') || !text.includes('export async function GET')) {
      issues.push(`Legacy payment route must reject direct GET and POST calls: ${relative}`);
    }
    if (!text.includes(routePath)) {
      issues.push(`Legacy payment route response must identify disabled route: ${relative}`);
    }
  }

  if (relativeFileSet.has(phase1LegacyPageFile)) {
    const text = fs.readFileSync(path.join(root, phase1LegacyPageFile), 'utf8');
    if (!text.includes("redirect('/checkout')") && !text.includes('redirect("/checkout")')) {
      issues.push(`Legacy card payment page must redirect to canonical checkout: ${phase1LegacyPageFile}`);
    }
    for (const forbidden of ['cardNumber', 'cardData', 'cvv', '/api/payments/card/create']) {
      if (text.includes(forbidden)) {
        issues.push(`Legacy card payment page still contains raw-card/bypass code (${forbidden}): ${phase1LegacyPageFile}`);
      }
    }
  }

  const allowedReferenceFiles = new Set([
    ...Object.keys(phase1LegacyPaymentFiles),
    'lib/payments/README.md',
    'Security Fix.md',
    'minsah_phase1_payment_bypass_lock_report.md',
    'scripts/security-audit.mjs',
  ]);

  for (const file of files) {
    const relative = rel(file);
    if (!isSourceFile(relative)) continue;
    if (allowedReferenceFiles.has(relative)) continue;

    const text = fs.readFileSync(file, 'utf8');
    for (const routePath of Object.values(phase1LegacyPaymentFiles)) {
      if (text.includes(routePath)) {
        issues.push(`Source code references disabled legacy payment route ${routePath}: ${relative}`);
      }
    }
    if (text.includes('/checkout/payment/card')) {
      issues.push(`Source code references disabled card payment page: ${relative}`);
    }
  }

  for (const file of files) {
    const relative = rel(file);
    if (!isSourceFile(relative)) continue;
    if (relative === 'scripts/security-audit.mjs') continue;

    const text = fs.readFileSync(file, 'utf8');
    for (const forbidden of ['cardNumber', 'cardData', 'cvv']) {
      if (text.includes(forbidden)) {
        issues.push(`Raw card collection identifier is not allowed in production source (${forbidden}): ${relative}`);
      }
    }
  }
}


function assertPhase2CanonicalPaymentContract(files, issues) {
  const relativeFileSet = new Set(files.map(rel));

  const requiredFiles = [
    'lib/payments/canonical-payment-contract.ts',
    'app/api/orders/route.ts',
    'app/api/payments/verified/route.ts',
    'app/api/admin/orders/route.ts',
    'app/api/admin/orders/[id]/route.ts',
    'app/checkout/payment-complete/page.tsx',
  ];

  for (const relative of requiredFiles) {
    if (!relativeFileSet.has(relative)) {
      issues.push(`Phase 2 canonical payment contract file is missing: ${relative}`);
    }
  }

  for (const [relative, routePath] of Object.entries(phase2DisabledPaymentRoutes)) {
    if (!relativeFileSet.has(relative)) {
      continue;
    }

    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    if (!text.includes('legacyPaymentRouteGone')) {
      issues.push(`Phase 2 unsupported payment route is not hard-disabled: ${relative}`);
    }
    if (!text.includes('export async function POST') || !text.includes('export async function GET')) {
      issues.push(`Phase 2 unsupported payment route must reject direct GET and POST calls: ${relative}`);
    }
    if (!text.includes(routePath)) {
      issues.push(`Phase 2 unsupported payment route response must identify disabled route: ${relative}`);
    }
  }

  for (const [relative, redirectPath] of Object.entries(phase2DisabledPaymentPages)) {
    if (!relativeFileSet.has(relative)) {
      continue;
    }
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    if (!text.includes(`redirect('${redirectPath}')`) && !text.includes(`redirect("${redirectPath}")`)) {
      issues.push(`Phase 2 unsupported payment page must redirect to canonical checkout: ${relative}`);
    }
  }

  const contractPath = path.join(root, 'lib/payments/canonical-payment-contract.ts');
  if (fs.existsSync(contractPath)) {
    const text = fs.readFileSync(contractPath, 'utf8');
    for (const required of [
      'validateVerifiedPaymentContract',
      'COD_PAYMENT_CANNOT_USE_VERIFIED_ONLINE_FLOW',
      'UNSUPPORTED_ONLINE_PAYMENT_METHOD',
      'PAYMENT_GATEWAY_METHOD_MISMATCH',
      "new Set(['bkash', 'nagad'])",
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 2 canonical payment contract missing ${required}: lib/payments/canonical-payment-contract.ts`);
      }
    }
  }

  const orderRoute = path.join(root, 'app/api/orders/route.ts');
  if (fs.existsSync(orderRoute)) {
    const text = fs.readFileSync(orderRoute, 'utf8');
    for (const required of ['UNSUPPORTED_PAYMENT_METHOD', 'isCanonicalOnlinePaymentMethod', 'isCodPaymentMethod']) {
      if (!text.includes(required)) {
        issues.push(`Checkout order route does not enforce production payment method allowlist (${required}): app/api/orders/route.ts`);
      }
    }
    for (const forbidden of ['gpay', 'rocket', 'card']) {
      if (text.includes(`paymentMethod === '${forbidden}'`) || text.includes(`paymentMethod: '${forbidden}'`)) {
        issues.push(`Checkout order route contains unsupported production payment method ${forbidden}: app/api/orders/route.ts`);
      }
    }
  }

  const verifiedRoute = path.join(root, 'app/api/payments/verified/route.ts');
  if (fs.existsSync(verifiedRoute)) {
    const text = fs.readFileSync(verifiedRoute, 'utf8');
    for (const required of [
      'verifySignature',
      'validateVerifiedPaymentContract',
      'PAYMENT_PAID_AT_IN_FUTURE',
      'amountMatched',
      'currencyMatched',
      "paymentStatus: 'COMPLETED'",
      'enqueueMetaCapiPurchase',
      'enqueueGa4Purchase',
      'createOnlineBrowserPurchaseToken',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Verified payment route missing canonical contract guard (${required}): app/api/payments/verified/route.ts`);
      }
    }
  }

  for (const relative of ['app/api/admin/orders/route.ts', 'app/api/admin/orders/[id]/route.ts']) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('ADMIN_ONLINE_PAYMENT_COMPLETION_BLOCKED')) {
      issues.push(`Admin order route can manually complete online payment without Phase 2 guard: ${relative}`);
    }
    if (!text.includes('isPaidLikePaymentStatus')) {
      issues.push(`Admin order route does not use canonical paid-status helper: ${relative}`);
    }
  }

  const allowedPurchasePixelFiles = new Set([
    'app/checkout/payment-complete/page.tsx',
  ]);
  const allowedOnlinePurchaseApiCallFiles = new Set([
    'app/checkout/payment-complete/page.tsx',
  ]);
  const allowedDisabledPaymentReferences = new Set([
    ...Object.keys(phase2DisabledPaymentRoutes),
    ...Object.keys(phase2DisabledPaymentPages),
    'scripts/security-audit.mjs',
    'lib/payments/README.md',
    'docs/production/phase-2-canonical-payment-purchase-contract.md',
  ]);

  for (const file of files) {
    const relative = rel(file);
    if (!isSourceFile(relative)) continue;
    const text = fs.readFileSync(file, 'utf8');

    if (!allowedPurchasePixelFiles.has(relative)) {
      if (/fbq\s*\(\s*['"]track['"]\s*,\s*['"]Purchase['"]/.test(text)) {
        issues.push(`Browser Pixel Purchase may only be fired from signed payment-complete bridge: ${relative}`);
      }
    }

    if (
      !allowedOnlinePurchaseApiCallFiles.has(relative) &&
      /fetch\s*\(\s*['"]\/api\/tracking\/meta\/online-purchase['"]/.test(text)
    ) {
      issues.push(`Online browser Purchase claim API may only be called from signed payment-complete bridge: ${relative}`);
    }

    if (!allowedDisabledPaymentReferences.has(relative)) {
      for (const routePath of Object.values(phase2DisabledPaymentRoutes)) {
        if (text.includes(routePath)) {
          issues.push(`Source code references disabled unsupported payment route ${routePath}: ${relative}`);
        }
      }
      for (const pagePath of Object.keys(phase2DisabledPaymentPages).map((x) => `/${path.dirname(x).replace(/^app\//, '')}`)) {
        if (text.includes(pagePath)) {
          issues.push(`Source code references disabled unsupported payment page ${pagePath}: ${relative}`);
        }
      }
    }
  }

  const cartContext = path.join(root, 'contexts/CartContext.tsx');
  if (fs.existsSync(cartContext)) {
    const text = fs.readFileSync(cartContext, 'utf8');
    for (const forbidden of ["type: 'rocket'", "type: 'gpay'", "type: 'card'"]) {
      const uncommented = text
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
      if (uncommented.includes(forbidden)) {
        issues.push(`Unsupported payment method is still active in CartContext (${forbidden}): contexts/CartContext.tsx`);
      }
    }
  }
}



function assertPhase3MetaCatalogMapping(files, issues) {
  const relativeFileSet = new Set(files.map(rel));
  const helperPath = 'lib/tracking/meta-content-id.ts';

  if (!relativeFileSet.has(helperPath)) {
    issues.push(`Phase 3 Meta catalog mapping helper is missing: ${helperPath}`);
    return;
  }

  const helperText = fs.readFileSync(path.join(root, helperPath), 'utf8');
  for (const required of [
    'buildMetaCatalogContentIds',
    'buildMetaCatalogContents',
    'getMetaCatalogContentType',
    'getMetaParentProductId',
    "return items.some(hasMetaVariantSelection) ? 'product_group' : 'product'",
    'Production rule for Minsah Beauty',
  ]) {
    if (!helperText.includes(required)) {
      issues.push(`Phase 3 Meta catalog helper missing required contract (${required}): ${helperPath}`);
    }
  }

  const productPriorityIndex = helperText.indexOf('getMetaParentProductId(item)');
  const variantPriorityIndex = helperText.indexOf('getMetaVariantId(item)');
  if (productPriorityIndex === -1 || variantPriorityIndex === -1 || productPriorityIndex > variantPriorityIndex) {
    issues.push(`Phase 3 content ID priority must prefer parent Product.id before variant ID: ${helperPath}`);
  }

  const requiredConsumers = {
    'lib/tracking/ecommerce.ts': ['buildMetaCatalogContentIds', 'buildMetaCatalogContents', 'getMetaCatalogContentType'],
    'lib/tracking/meta-capi-cod-purchase.ts': ['buildMetaCatalogContentIds', 'buildMetaCatalogContents', 'getMetaCatalogContentType'],
    'app/api/tracking/meta/online-purchase/route.ts': ['buildMetaCatalogContentIds', 'buildMetaCatalogContents', 'getMetaCatalogContentType'],
    'lib/tracking/ga4-measurement-protocol.ts': ['buildMetaCatalogContents', 'getMetaContentId'],
  };

  for (const [relative, requiredTokens] of Object.entries(requiredConsumers)) {
    if (!relativeFileSet.has(relative)) {
      issues.push(`Phase 3 required tracking consumer is missing: ${relative}`);
      continue;
    }
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    for (const token of requiredTokens) {
      if (!text.includes(token)) {
        issues.push(`Phase 3 ${relative} does not use canonical catalog mapping helper (${token}).`);
      }
    }
  }

  for (const relative of ['lib/tracking/ecommerce.ts', 'lib/tracking/meta-capi-cod-purchase.ts', 'app/api/tracking/meta/online-purchase/route.ts']) {
    if (!relativeFileSet.has(relative)) continue;
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    if (/content_type:\s*['"]product['"]/.test(text)) {
      issues.push(`Phase 3 tracking payload still hardcodes content_type product instead of canonical product/product_group helper: ${relative}`);
    }
    if (/content_ids:\s*contents\.map\(\(item\)\s*=>\s*item\.id\)/.test(text)) {
      issues.push(`Phase 3 tracking payload derives content_ids from contents instead of canonical catalog IDs: ${relative}`);
    }
  }

  const publicCapiPath = 'app/api/facebook-capi/route.ts';
  if (relativeFileSet.has(publicCapiPath)) {
    const text = fs.readFileSync(path.join(root, publicCapiPath), 'utf8');
    for (const token of ['item_group_id', 'variant_id', 'variant_sku', 'item_variant', 'shade']) {
      if (!text.includes(token)) {
        issues.push(`Phase 3 public CAPI route drops variant/catalog metadata (${token}): ${publicCapiPath}`);
      }
    }
  }

  const cartContextPath = 'contexts/CartContext.tsx';
  if (relativeFileSet.has(cartContextPath)) {
    const text = fs.readFileSync(path.join(root, cartContextPath), 'utf8');
    if (!text.includes('apiItem.variant?.sku ?? apiItem.product.sku')) {
      issues.push(`Phase 3 cart context must preserve variant/product SKU for tracking diagnostics: ${cartContextPath}`);
    }
  }
}


function assertPhase4ExternalIdAlignment(files, issues) {
  const relativeFileSet = new Set(files.map(rel));
  const helperPath = 'lib/tracking/meta-external-id.ts';

  if (!relativeFileSet.has(helperPath)) {
    issues.push(`Phase 4 Meta external_id helper is missing: ${helperPath}`);
    return;
  }

  const helperText = fs.readFileSync(path.join(root, helperPath), 'utf8');
  for (const required of [
    'normalizeMetaExternalIdValue',
    'String(value).trim().toLowerCase()',
    'chooseCanonicalMetaExternalId',
    'buildVisitorMetaExternalId',
    'buildUserMetaExternalId',
    'buildOrderMetaExternalId',
    'Prefer visitor:<mb_vid>',
  ]) {
    if (!helperText.includes(required)) {
      issues.push(`Phase 4 Meta external_id helper missing required contract (${required}): ${helperPath}`);
    }
  }

  const orderAttributionPath = 'lib/tracking/order-attribution.ts';
  if (relativeFileSet.has(orderAttributionPath)) {
    const text = fs.readFileSync(path.join(root, orderAttributionPath), 'utf8');
    for (const required of [
      'chooseCanonicalMetaExternalId',
      'normalizeMetaExternalIdValue(readCookie(request, VISITOR_ID_COOKIE))',
      'visitorId,',
      'userId: options.userId',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 4 order attribution does not persist canonical visitor-first external_id (${required}): ${orderAttributionPath}`);
      }
    }
    if (/options\.userId\s*\?\s*`user:\$\{options\.userId\}`/.test(text)) {
      issues.push(`Phase 4 order attribution still prefers userId over mb_vid, causing Browser/CAPI mismatch: ${orderAttributionPath}`);
    }
  }

  const publicCapiPath = 'app/api/facebook-capi/route.ts';
  if (relativeFileSet.has(publicCapiPath)) {
    const text = fs.readFileSync(path.join(root, publicCapiPath), 'utf8');
    if (!text.includes("normalizeMetaExternalId(payload.externalId, 'visitor')")) {
      issues.push(`Phase 4 public CAPI route must normalize external_id before hashing: ${publicCapiPath}`);
    }
    if (!text.includes("normalizeMetaExternalId(request.cookies.get('mb_vid')?.value, 'visitor')")) {
      issues.push(`Phase 4 public CAPI route must normalize mb_vid fallback before hashing: ${publicCapiPath}`);
    }
  }

  const purchasePath = 'lib/tracking/meta-capi-cod-purchase.ts';
  if (relativeFileSet.has(purchasePath)) {
    const text = fs.readFileSync(path.join(root, purchasePath), 'utf8');
    if (!text.includes("normalizeMetaExternalId(order.externalId, 'visitor')")) {
      issues.push(`Phase 4 Purchase CAPI must normalize persisted external_id before hashing: ${purchasePath}`);
    }
    if (/sha256\(order\.externalId\.trim\(\)\)/.test(text)) {
      issues.push(`Phase 4 Purchase CAPI still hashes trim-only external_id instead of lowercase+trim normalized value: ${purchasePath}`);
    }
  }

  for (const relative of ['lib/facebook/pixel.tsx', 'lib/tracking/pixels/FacebookPixel.tsx']) {
    if (!relativeFileSet.has(relative)) continue;
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    for (const required of [
      'buildVisitorMetaExternalId',
      'function mbNormalizeMetaExternalId',
      'String(input).trim().toLowerCase()',
      'new TextEncoder().encode(normalizedInput)',
      "mbSetCookie('mb_vid', mbVid, 15552000)",
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 4 browser Pixel does not normalize/hash external_id consistently (${required}): ${relative}`);
      }
    }
    if (/new TextEncoder\(\)\.encode\(input\)/.test(text)) {
      issues.push(`Phase 4 browser Pixel still hashes raw input instead of normalized external_id: ${relative}`);
    }
  }

  const managerPath = 'lib/tracking/manager.ts';
  if (relativeFileSet.has(managerPath)) {
    const text = fs.readFileSync(path.join(root, managerPath), 'utf8');
    if (!text.includes("externalId: buildVisitorMetaExternalId(getCookieValue('mb_vid'))")) {
      issues.push(`Phase 4 tracking manager must send canonical visitor externalId to public CAPI: ${managerPath}`);
    }
  }

  const attributionCapturePath = 'lib/tracking/pixels/AttributionCookieCapture.tsx';
  if (relativeFileSet.has(attributionCapturePath)) {
    const text = fs.readFileSync(path.join(root, attributionCapturePath), 'utf8');
    if (!text.includes('normalizeMetaExternalIdValue(getCookieValue(VISITOR_COOKIE))')) {
      issues.push(`Phase 4 attribution cookie capture must normalize legacy mb_vid cookies: ${attributionCapturePath}`);
    }
  }

  const proxyPath = 'proxy.ts';
  if (relativeFileSet.has(proxyPath)) {
    const text = fs.readFileSync(path.join(root, proxyPath), 'utf8');
    if (!text.includes('normalizeMetaExternalIdValue(existingVisitorId)')) {
      issues.push(`Phase 4 proxy must normalize mb_vid before checkout attribution reads it: ${proxyPath}`);
    }
  }
}


function assertPhase5ProductAnalyticsCounters(files, issues) {
  const relativeFileSet = new Set(files.map(rel));
  const helperPath = 'lib/analytics/product-metrics.ts';
  const apiPath = 'app/api/product-analytics/route.ts';

  for (const requiredFile of [helperPath, apiPath]) {
    if (!relativeFileSet.has(requiredFile)) {
      issues.push(`Phase 5 product analytics file is missing: ${requiredFile}`);
    }
  }

  const schemaPath = 'prisma/schema.prisma';
  if (relativeFileSet.has(schemaPath)) {
    const text = fs.readFileSync(path.join(root, schemaPath), 'utf8');
    for (const required of [
      'model ProductViewDedup',
      '@@unique([productId, visitorKeyHash])',
      'productViewDedups  ProductViewDedup[]',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 5 schema missing durable product-view dedup contract (${required}): ${schemaPath}`);
      }
    }
  }

  if (relativeFileSet.has(helperPath)) {
    const text = fs.readFileSync(path.join(root, helperPath), 'utf8');
    for (const required of [
      'PRODUCT_VIEW_DEDUP_SECONDS = 30 * 60',
      'analytics:product-view',
      "'NX'",
      'dbDedupProductView',
      'productViewDedup.create',
      'visitorKeyHash',
      'viewCount: 1',
      'uniqueViewCount: 1',
      'productDailyMetric.upsert',
      'recordProductOrderCreatedInTransaction',
      'String(value).trim()',
      'toLowerCase()',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 5 product metrics helper missing required production contract (${required}): ${helperPath}`);
      }
    }
  }

  if (relativeFileSet.has(apiPath)) {
    const text = fs.readFileSync(path.join(root, apiPath), 'utf8');
    for (const required of [
      'recordProductView',
      'recordProductMetricAction',
      "action === 'view'",
      "action === 'add_to_cart'",
      "action === 'checkout_start'",
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 5 product analytics API missing action handler (${required}): ${apiPath}`);
      }
    }
  }

  const ecommercePath = 'lib/tracking/ecommerce.ts';
  if (relativeFileSet.has(ecommercePath)) {
    const text = fs.readFileSync(path.join(root, ecommercePath), 'utf8');
    for (const required of [
      "fetch('/api/product-analytics'",
      "action: 'view'",
      "action: 'add_to_cart'",
      "action: 'checkout_start'",
      'keepalive',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 5 ecommerce tracking does not write product counters (${required}): ${ecommercePath}`);
      }
    }
  }

  const orderRoute = 'app/api/orders/route.ts';
  if (relativeFileSet.has(orderRoute)) {
    const text = fs.readFileSync(path.join(root, orderRoute), 'utf8');
    if (!text.includes('recordProductOrderCreatedInTransaction(tx, orderItems)')) {
      issues.push(`Phase 5 order route does not update product order/revenue counters in the order transaction: ${orderRoute}`);
    }
  }

  const productAnalyticsRoute = 'app/api/admin/analytics/products/route.ts';
  if (relativeFileSet.has(productAnalyticsRoute)) {
    const text = fs.readFileSync(path.join(root, productAnalyticsRoute), 'utf8');
    for (const required of ['const metricProducts = await prisma.product.findMany', 'productDailyMetrics', 'bucket.views = metricTotals.views || product.viewCount']) {
      if (!text.includes(required)) {
        issues.push(`Phase 5 admin product analytics does not include products with counters but no orders (${required}): ${productAnalyticsRoute}`);
      }
    }
  }
}


function assertPhase6ConsentAndTrafficFilters(files, issues) {
  const relativeFileSet = new Set(files.map(rel));

  const requiredFiles = [
    'lib/tracking/tracking-consent.ts',
    'lib/tracking/client-traffic-filter.ts',
    'lib/tracking/traffic-filter.ts',
    'lib/tracking/pixels/TrackingConsentManager.tsx',
    'lib/tracking/pixels/AllPixels.tsx',
    'lib/tracking/pixels/ClarityPixel.tsx',
    'app/privacy-policy/page.tsx',
    'ENVIRONMENT_VARIABLES_PRODUCTION.md',
  ];

  for (const relative of requiredFiles) {
    if (!relativeFileSet.has(relative)) {
      issues.push(`Phase 6 consent/internal/bot filter file is missing: ${relative}`);
    }
  }

  const schemaPath = 'prisma/schema.prisma';
  if (relativeFileSet.has(schemaPath)) {
    const text = fs.readFileSync(path.join(root, schemaPath), 'utf8');
    for (const required of [
      'trackingConsent       String?',
      'nonEssentialTrackingAllowed Boolean @default(true)',
      'trackingFilteredReason String?',
      '@@index([trackingConsent])',
      '@@index([nonEssentialTrackingAllowed])',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 Order schema missing checkout-time consent/filter field (${required}): ${schemaPath}`);
      }
    }
  }

  const consentMigration = 'prisma/migrations/20260701000000_add_order_tracking_consent/migration.sql';
  if (!relativeFileSet.has(consentMigration)) {
    issues.push(`Phase 6 order consent migration is missing: ${consentMigration}`);
  }

  const attributionPath = 'lib/tracking/order-attribution.ts';
  if (relativeFileSet.has(attributionPath)) {
    const text = fs.readFileSync(path.join(root, attributionPath), 'utf8');
    for (const required of [
      'TRACKING_CONSENT_COOKIE',
      'getServerTrackingConsentFromCookie',
      'canLoadNonEssentialTracking',
      'trackingConsent,',
      'nonEssentialTrackingAllowed,',
      "trackingFilteredReason: nonEssentialTrackingAllowed ? undefined : 'CONSENT_DENIED'",
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 order attribution does not persist checkout-time consent (${required}): ${attributionPath}`);
      }
    }
  }

  const consentPath = 'lib/tracking/tracking-consent.ts';
  if (relativeFileSet.has(consentPath)) {
    const text = fs.readFileSync(path.join(root, consentPath), 'utf8');
    for (const required of [
      "TRACKING_CONSENT_COOKIE = 'mb_tracking_consent'",
      'NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT',
      "normalizeTrackingConsent",
      "String(value ?? '').trim().toLowerCase()",
      "canLoadNonEssentialTracking",
      "setClientTrackingConsent",
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 tracking consent helper missing contract (${required}): ${consentPath}`);
      }
    }
  }

  const clientFilterPath = 'lib/tracking/client-traffic-filter.ts';
  if (relativeFileSet.has(clientFilterPath)) {
    const text = fs.readFileSync(path.join(root, clientFilterPath), 'utf8');
    for (const required of [
      'canRunClientTracking',
      'getClientTrackingBlockReason',
      'hasInternalTrafficMarker',
      'isLikelyAutomatedClient',
      "minsah_staff",
      "mb_internal_traffic",
      "BOT_UA_PATTERN",
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 client traffic filter missing contract (${required}): ${clientFilterPath}`);
      }
    }
  }

  const serverFilterPath = 'lib/tracking/traffic-filter.ts';
  if (relativeFileSet.has(serverFilterPath)) {
    const text = fs.readFileSync(path.join(root, serverFilterPath), 'utf8');
    for (const required of [
      'classifyTrackingRequest',
      'shouldSkipServerTrackingRequest',
      'shouldSkipProductAnalyticsRequest',
      'classifyStoredOrderTraffic',
      'ANALYTICS_INTERNAL_IPS',
      'INTERNAL_TRAFFIC_IPS',
      'STAFF_IPS',
      'INTERNAL_TRAFFIC_HEADER_SECRET',
      'CONSENT_DENIED',
      'BOT_TRAFFIC',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 server traffic filter missing contract (${required}): ${serverFilterPath}`);
      }
    }
  }

  const consentManagerPath = 'lib/tracking/pixels/TrackingConsentManager.tsx';
  if (relativeFileSet.has(consentManagerPath)) {
    const text = fs.readFileSync(path.join(root, consentManagerPath), 'utf8');
    for (const required of [
      'TrackingConsentModeScript',
      'TrackingConsentBanner',
      "gtag('consent', 'default'",
      "gtag('consent', 'update'",
      "updateConsent('denied')",
      "updateConsent('granted')",
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 consent UI/mode missing contract (${required}): ${consentManagerPath}`);
      }
    }
  }

  const allPixelsPath = 'lib/tracking/pixels/AllPixels.tsx';
  if (relativeFileSet.has(allPixelsPath)) {
    const text = fs.readFileSync(path.join(root, allPixelsPath), 'utf8');
    for (const required of [
      'canRunClientTracking',
      'getClientTrackingBlockReason',
      'TrackingConsentBanner',
      'TrackingConsentModeScript',
      'if (!trackingAllowed)',
      '<AttributionCookieCapture />',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 AllPixels does not gate non-essential pixels (${required}): ${allPixelsPath}`);
      }
    }
    const blockedSectionIndex = text.indexOf('if (!trackingAllowed)');
    const attributionIndex = text.indexOf('<AttributionCookieCapture />');
    if (blockedSectionIndex === -1 || attributionIndex === -1 || attributionIndex < blockedSectionIndex) {
      issues.push(`Phase 6 AttributionCookieCapture must not run before the trackingAllowed gate: ${allPixelsPath}`);
    }
  }

  const managerPath = 'lib/tracking/manager.ts';
  if (relativeFileSet.has(managerPath)) {
    const text = fs.readFileSync(path.join(root, managerPath), 'utf8');
    for (const required of ['canRunClientTracking', 'getClientTrackingBlockReason', 'if (!canRunClientTracking())']) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 tracking manager can still fire after consent/internal/bot block (${required}): ${managerPath}`);
      }
    }
  }

  const productMetricsPath = 'lib/analytics/product-metrics.ts';
  if (relativeFileSet.has(productMetricsPath)) {
    const text = fs.readFileSync(path.join(root, productMetricsPath), 'utf8');
    if (!text.includes('shouldSkipProductAnalyticsRequest')) {
      issues.push(`Phase 6 product metrics do not use shared traffic filter: ${productMetricsPath}`);
    }
  }

  const productAnalyticsRoute = 'app/api/product-analytics/route.ts';
  if (relativeFileSet.has(productAnalyticsRoute)) {
    const text = fs.readFileSync(path.join(root, productAnalyticsRoute), 'utf8');
    if (!text.includes('shouldSkipProductAnalyticsRequest')) {
      issues.push(`Phase 6 product analytics API does not skip internal/bot/consent-denied traffic: ${productAnalyticsRoute}`);
    }
  }

  const publicCapiPath = 'app/api/facebook-capi/route.ts';
  if (relativeFileSet.has(publicCapiPath)) {
    const text = fs.readFileSync(path.join(root, publicCapiPath), 'utf8');
    if (!text.includes('shouldSkipServerTrackingRequest') || !text.includes('Event skipped by production traffic/privacy filter')) {
      issues.push(`Phase 6 public CAPI route does not skip internal/bot/consent-denied traffic: ${publicCapiPath}`);
    }
  }

  for (const relative of ['lib/tracking/meta-capi-cod-purchase.ts', 'lib/tracking/ga4-measurement-protocol.ts']) {
    if (!relativeFileSet.has(relative)) continue;
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    if (!text.includes('classifyStoredOrderTraffic')) {
      issues.push(`Phase 6 server-side Purchase sender does not apply stored-order internal/test filter: ${relative}`);
    }
  }

  const clarityPath = 'lib/tracking/pixels/ClarityPixel.tsx';
  if (relativeFileSet.has(clarityPath)) {
    const text = fs.readFileSync(path.join(root, clarityPath), 'utf8');
    for (const required of ['data-clarity-mask', 'input[type="email"]', 'input[type="tel"]', 'input[name*="address" i]', 'MutationObserver']) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 Clarity sensitive masking missing selector/observer (${required}): ${clarityPath}`);
      }
    }
  }

  const privacyPolicyPath = 'app/privacy-policy/page.tsx';
  if (relativeFileSet.has(privacyPolicyPath)) {
    const text = fs.readFileSync(path.join(root, privacyPolicyPath), 'utf8');
    for (const required of ['Meta Pixel', 'Meta Conversions API', 'Google Analytics 4', 'Microsoft', 'If you decline', 'Staff, test, internal, and obvious bot traffic']) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 privacy policy missing disclosure (${required}): ${privacyPolicyPath}`);
      }
    }
  }

  const privacyAliasPath = 'app/privacy/page.tsx';
  if (relativeFileSet.has(privacyAliasPath)) {
    const text = fs.readFileSync(path.join(root, privacyAliasPath), 'utf8');
    if (!text.includes("redirect('/privacy-policy')") && !text.includes('redirect("/privacy-policy")')) {
      issues.push(`Phase 6 /privacy must redirect to canonical /privacy-policy to avoid stale disclosure: ${privacyAliasPath}`);
    }
  }

  const envDocPath = 'ENVIRONMENT_VARIABLES_PRODUCTION.md';
  if (relativeFileSet.has(envDocPath)) {
    const text = fs.readFileSync(path.join(root, envDocPath), 'utf8');
    for (const required of ['NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT', 'ANALYTICS_INTERNAL_IPS', 'INTERNAL_TRAFFIC_HEADER_SECRET']) {
      if (!text.includes(required)) {
        issues.push(`Phase 6 production env docs missing variable (${required}): ${envDocPath}`);
      }
    }
  }
}


function assertPhase7Ga4ReferralRouteQa(files, issues) {
  const relativeFileSet = new Set(files.map(rel));

  const requiredFiles = [
    'lib/tracking/payment-gateway-referrals.ts',
    'lib/tracking/pixels/GoogleAnalyticsRouteTracker.tsx',
    'lib/tracking/pixels/GoogleAnalytics.tsx',
    'lib/tracking/pixels/AttributionCookieCapture.tsx',
    'lib/tracking/ga4-qa.ts',
    'docs/production/phase-7-ga4-referral-route-qa.md',
  ];

  for (const relative of requiredFiles) {
    if (!relativeFileSet.has(relative)) {
      issues.push(`Phase 7 GA4 referral/route QA file is missing: ${relative}`);
    }
  }

  const referralHelper = 'lib/tracking/payment-gateway-referrals.ts';
  if (relativeFileSet.has(referralHelper)) {
    const text = fs.readFileSync(path.join(root, referralHelper), 'utf8');
    for (const required of [
      'PAYMENT_GATEWAY_REFERRAL_DOMAINS',
      'PAYMENT_RETURN_MARKER_COOKIE',
      'GA4_EXTRA_PAYMENT_REFERRAL_DOMAINS',
      'isPaymentGatewayReferralUrl',
      'isPaymentReturnPath',
      'GA4_PAYMENT_REFERRAL_EXCLUSIONS_VERIFIED',
      'GA4_APP_ROUTER_PAGEVIEW_VERIFIED',
      'GA4_PAYMENT_RETURN_SOURCE_VERIFIED',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 7 payment gateway referral helper missing required contract (${required}): ${referralHelper}`);
      }
    }
  }

  const gaPath = 'lib/tracking/pixels/GoogleAnalytics.tsx';
  if (relativeFileSet.has(gaPath)) {
    const text = fs.readFileSync(path.join(root, gaPath), 'utf8');
    for (const required of ['GoogleAnalyticsRouteTracker', 'send_page_view: false', 'ga4-purchase-guard']) {
      if (!text.includes(required)) {
        issues.push(`Phase 7 GA4 pixel must disable auto page_view and install route tracker (${required}): ${gaPath}`);
      }
    }
    if (text.includes('send_page_view: true')) {
      issues.push(`Phase 7 GA4 pixel still enables auto page_view, which can duplicate App Router page views: ${gaPath}`);
    }
  }

  const routeTracker = 'lib/tracking/pixels/GoogleAnalyticsRouteTracker.tsx';
  if (relativeFileSet.has(routeTracker)) {
    const text = fs.readFileSync(path.join(root, routeTracker), 'utf8');
    for (const required of [
      'usePathname',
      'useSearchParams',
      'lastPageKey',
      "window.gtag('event', 'page_view'",
      'ignore_referrer',
      'mb_referrer_ignored',
      'PAYMENT_RETURN_MARKER_COOKIE',
      'SENSITIVE_URL_PARAMS',
      'clearCookie(PAYMENT_RETURN_MARKER_COOKIE)',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 7 GA4 route tracker missing required behavior (${required}): ${routeTracker}`);
      }
    }
  }

  const attributionPath = 'lib/tracking/pixels/AttributionCookieCapture.tsx';
  if (relativeFileSet.has(attributionPath)) {
    const text = fs.readFileSync(path.join(root, attributionPath), 'utf8');
    for (const required of [
      'isPaymentGatewayReferralUrl',
      'isPaymentReturnPath',
      'LAST_NON_GATEWAY_REFERRER_COOKIE',
      'Payment gateway return referrers must never become first-touch/last-touch attribution',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 7 attribution capture does not protect GA4 source from payment gateway referrals (${required}): ${attributionPath}`);
      }
    }
  }

  const orderAttributionPath = 'lib/tracking/order-attribution.ts';
  if (relativeFileSet.has(orderAttributionPath)) {
    const text = fs.readFileSync(path.join(root, orderAttributionPath), 'utf8');
    if (!text.includes('sanitizeNonGatewayReferrer') || !text.includes('isPaymentGatewayReferralUrl(sanitized)')) {
      issues.push(`Phase 7 order attribution must ignore payment gateway referrers before saving order.referrer: ${orderAttributionPath}`);
    }
  }

  const bridgePath = 'app/checkout/payment-bridge/route.ts';
  if (relativeFileSet.has(bridgePath)) {
    const text = fs.readFileSync(path.join(root, bridgePath), 'utf8');
    for (const required of ['PAYMENT_RETURN_MARKER_COOKIE', 'PAYMENT_RETURN_MARKER_MAX_AGE_SECONDS', 'httpOnly: false']) {
      if (!text.includes(required)) {
        issues.push(`Phase 7 payment bridge must set short-lived payment-return marker for GA4 referrer handling (${required}): ${bridgePath}`);
      }
    }
  }

  const ga4QaPath = 'lib/tracking/ga4-qa.ts';
  if (relativeFileSet.has(ga4QaPath)) {
    const text = fs.readFileSync(path.join(root, ga4QaPath), 'utf8');
    for (const required of ['appRouterPageViewVerified', 'paymentReturnSourceVerified', 'crossDomainCheckVerified']) {
      if (!text.includes(required)) {
        issues.push(`Phase 7 GA4 QA snapshot missing deploy gate flag (${required}): ${ga4QaPath}`);
      }
    }
  }

  const productionQaPath = 'lib/tracking/production-qa.ts';
  if (relativeFileSet.has(productionQaPath)) {
    const text = fs.readFileSync(path.join(root, productionQaPath), 'utf8');
    for (const required of ['buildGa4QaSnapshot', 'ga4_attribution', 'GA4_APP_ROUTER_PAGEVIEW_READY', 'GA4_PAYMENT_RETURN_SOURCE_READY']) {
      if (!text.includes(required)) {
        issues.push(`Phase 7 production QA deploy gate missing GA4 attribution check (${required}): ${productionQaPath}`);
      }
    }
  }

  const envDocPath = 'ENVIRONMENT_VARIABLES_PRODUCTION.md';
  if (relativeFileSet.has(envDocPath)) {
    const text = fs.readFileSync(path.join(root, envDocPath), 'utf8');
    for (const required of ['GA4_EXTRA_PAYMENT_REFERRAL_DOMAINS', 'GA4_APP_ROUTER_PAGEVIEW_VERIFIED', 'GA4_PAYMENT_RETURN_SOURCE_VERIFIED', 'GA4_CROSS_DOMAIN_CHECK_VERIFIED']) {
      if (!text.includes(required)) {
        issues.push(`Phase 7 production env docs missing GA4 QA variable (${required}): ${envDocPath}`);
      }
    }
  }
}


function assertPhase8FullQaRegressionLocks(files, issues) {
  const relativeFileSet = new Set(files.map(rel));

  const requiredFiles = [
    'lib/tracking/full-production-qa-matrix.ts',
    'scripts/phase8-static-contract-check.mjs',
    'docs/production/phase-8-full-qa-regression-locks.md',
    'PRODUCTION_QA.md',
    'app/admin/production-qa/page.tsx',
    'lib/tracking/production-qa.ts',
  ];

  for (const relative of requiredFiles) {
    if (!relativeFileSet.has(relative)) {
      issues.push(`Phase 8 full QA/regression lock file missing: ${relative}`);
    }
  }

  const matrixPath = 'lib/tracking/full-production-qa-matrix.ts';
  if (relativeFileSet.has(matrixPath)) {
    const text = fs.readFileSync(path.join(root, matrixPath), 'utf8');
    for (const required of [
      'FULL_PRODUCTION_QA_MATRIX',
      'QA_LEGACY_PAYMENT_LOCK_VERIFIED',
      'QA_CANONICAL_ONLINE_PURCHASE_VERIFIED',
      'QA_COD_PHONE_CONFIRMED_PURCHASE_VERIFIED',
      'QA_PURCHASE_DEDUP_REFRESH_RETRY_VERIFIED',
      'QA_META_CATALOG_VARIANT_MAPPING_VERIFIED',
      'QA_EXTERNAL_ID_PARITY_VERIFIED',
      'QA_PRODUCT_VIEW_DEDUP_VERIFIED',
      'QA_CONSENT_DENIED_GATE_VERIFIED',
      'QA_INTERNAL_BOT_FILTER_VERIFIED',
      'QA_GA4_APP_ROUTER_PAGEVIEW_VERIFIED',
      'QA_GA4_PAYMENT_REFERRAL_VERIFIED',
      'QA_SENSITIVE_PAYMENT_URL_SANITIZED_VERIFIED',
      'QA_QUEUE_RETRY_DEAD_LETTER_VERIFIED',
      'QA_TRACKING_HEALTH_CRON_ALERT_VERIFIED',
      'QA_EXTERNAL_META_SETUP_VERIFIED',
      'QA_BACKEND_META_GA4_RECONCILIATION_VERIFIED',
      'QA_PREDEPLOY_SCRIPTS_VERIFIED',
      'getFullQaMatrixSummary',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 8 QA matrix missing required full-flow evidence flag/contract (${required}): ${matrixPath}`);
      }
    }

    const flagCount = (text.match(/envKey:\s*'QA_[A-Z0-9_]+_VERIFIED'/g) ?? []).length;
    if (flagCount < 16) {
      issues.push(`Phase 8 QA matrix has insufficient full-flow coverage; found ${flagCount} QA flags.`);
    }
  }

  const productionQaPath = 'lib/tracking/production-qa.ts';
  if (relativeFileSet.has(productionQaPath)) {
    const text = fs.readFileSync(path.join(root, productionQaPath), 'utf8');
    for (const required of [
      'FULL_PRODUCTION_QA_MATRIX',
      'getFullQaMatrixSummary',
      'getQaStepVerification',
      'Required manual QA evidence is not marked verified',
      'manualQaRequiredVerified',
      'manualQaMissingRequired',
      'PHASE8_REGRESSION_LOCKS_AVAILABLE',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 8 production QA gate does not enforce full matrix (${required}): ${productionQaPath}`);
      }
    }

    if (!text.includes("blockerCheck(\n          'manual_qa'")) {
      issues.push(`Phase 8 required manual QA steps must create BLOCKER checks, not only warnings: ${productionQaPath}`);
    }
  }

  const adminPagePath = 'app/admin/production-qa/page.tsx';
  if (relativeFileSet.has(adminPagePath)) {
    const text = fs.readFileSync(path.join(root, adminPagePath), 'utf8');
    for (const required of [
      'Full Phase 8 QA matrix',
      'ga4_attribution',
      'manualQaRequiredVerified',
      '{step.envKey}=true',
      'Optional evidence URL env',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 8 admin QA page missing matrix/evidence UI (${required}): ${adminPagePath}`);
      }
    }
  }

  const packagePath = 'package.json';
  if (relativeFileSet.has(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, packagePath), 'utf8'));
    const scripts = pkg.scripts ?? {};
    const expectedScripts = {
      'qa:phase8-static': 'node scripts/phase8-static-contract-check.mjs',
      'qa:predeploy': 'npm run audit:security && npm run qa:phase8-static && npm run qa:admin-api-security && npm run qa:telegram-security && npm run typecheck && npm run build && npm run qa:production',
    };
    for (const [name, expected] of Object.entries(expectedScripts)) {
      if (scripts[name] !== expected) {
        issues.push(`Phase 8 package script ${name} must be exactly: ${expected}`);
      }
    }
  }

  const qaDocPath = 'PRODUCTION_QA.md';
  if (relativeFileSet.has(qaDocPath)) {
    const text = fs.readFileSync(path.join(root, qaDocPath), 'utf8');
    for (const required of [
      'npm run qa:predeploy',
      'QA_LEGACY_PAYMENT_LOCK_VERIFIED',
      'QA_CANONICAL_ONLINE_PURCHASE_VERIFIED',
      'QA_COD_PHONE_CONFIRMED_PURCHASE_VERIFIED',
      'QA_META_CATALOG_VARIANT_MAPPING_VERIFIED',
      'QA_BACKEND_META_GA4_RECONCILIATION_VERIFIED',
      'If `/admin/production-qa` returns `BLOCKED`, do not deploy.',
    ]) {
      if (!text.includes(required)) {
        issues.push(`Phase 8 PRODUCTION_QA.md missing release evidence instruction (${required}).`);
      }
    }
  }
}


function assertPhase9AdminPanelSecurityHardening(files, issues) {
  const relativeFileSet = new Set(files.map(rel));
  const routeFiles = files
    .map(rel)
    .filter((relative) => relative.startsWith('app/api/admin/') && relative.endsWith('/route.ts'));

  const authRouteExemptions = new Set([
    'app/api/admin/auth/login/route.ts',
    'app/api/admin/auth/logout/route.ts',
    'app/api/admin/auth/me/route.ts',
    'app/api/admin/auth/refresh/route.ts',
  ]);

  const guardTokens = [
    'requireAdmin(',
    'requireAdminPermission(',
    'requireSuperAdmin(',
    'getVerifiedAdmin(',
    'verifyAdminAccessToken(',
    'adminUnauthorizedResponse(',
  ];

  for (const relative of routeFiles) {
    if (authRouteExemptions.has(relative)) continue;
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const disabled = /status\s*:\s*410/.test(text) || text.includes('legacyRouteGone') || text.includes('legacyPaymentRouteGone');
    const guarded = guardTokens.some((token) => text.includes(token));
    if (!disabled && !guarded) {
      issues.push(`Phase 9 admin API route lacks backend auth guard or explicit 410: ${relative}`);
    }
  }

  const utilsPath = 'app/api/admin/_utils.ts';
  if (!relativeFileSet.has(utilsPath)) {
    issues.push(`Phase 9 shared admin guard utility missing: ${utilsPath}`);
  } else {
    const text = fs.readFileSync(path.join(root, utilsPath), 'utf8');
    for (const required of ['requireAdmin', 'requireAdminPermission', 'requireSuperAdmin', 'adminForbiddenResponse']) {
      if (!text.includes(required)) {
        issues.push(`Phase 9 shared admin guard utility missing ${required}: ${utilsPath}`);
      }
    }
  }

  const siteConfigPath = 'app/api/admin/site-config/route.ts';
  if (relativeFileSet.has(siteConfigPath)) {
    const text = fs.readFileSync(path.join(root, siteConfigPath), 'utf8');
    for (const required of ['requireAdminPermission', 'ADMIN_PERMISSIONS.SETTINGS_VIEW', 'ADMIN_PERMISSIONS.SETTINGS_EDIT']) {
      if (!text.includes(required)) {
        issues.push(`Phase 9 site-config route missing permission guard (${required}): ${siteConfigPath}`);
      }
    }
  }

  const elasticsearchPath = 'app/api/admin/elasticsearch/route.ts';
  if (relativeFileSet.has(elasticsearchPath)) {
    const text = fs.readFileSync(path.join(root, elasticsearchPath), 'utf8');
    if (!text.includes('requireSuperAdmin')) {
      issues.push(`Phase 9 Elasticsearch admin route must be SUPER_ADMIN-only: ${elasticsearchPath}`);
    }
  }

  const auditScriptPath = 'scripts/admin-api-security-audit.mjs';
  if (!relativeFileSet.has(auditScriptPath)) {
    issues.push(`Phase 9 standalone admin API security audit missing: ${auditScriptPath}`);
  }

  const packagePath = 'package.json';
  if (relativeFileSet.has(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, packagePath), 'utf8'));
    const scripts = pkg.scripts ?? {};
    if (scripts['qa:admin-api-security'] !== 'node scripts/admin-api-security-audit.mjs') {
      issues.push('Phase 9 package script qa:admin-api-security must run node scripts/admin-api-security-audit.mjs');
    }
    if (!String(scripts['qa:predeploy'] || '').includes('npm run qa:admin-api-security')) {
      issues.push('Phase 9 predeploy script must include npm run qa:admin-api-security');
    }
  }

  const docPath = 'docs/production/phase-9-admin-panel-security-hardening.md';
  if (!relativeFileSet.has(docPath)) {
    issues.push(`Phase 9 admin hardening production doc missing: ${docPath}`);
  }
}

function assertPhase10TelegramBotHardening(files, issues) {
  const relativeFileSet = new Set(files.map(rel));
  const requiredFiles = [
    'lib/telegram/auth.ts',
    'lib/telegram/action-tokens.ts',
    'lib/telegram/order-state.ts',
    'app/api/telegram/order-callback/route.ts',
    'lib/telegram-notify.ts',
    'scripts/telegram-security-audit.mjs',
    'docs/production/phase-10-telegram-bot-hardening.md',
    'prisma/migrations/20260701010000_add_telegram_action_security/migration.sql',
  ];

  for (const relative of requiredFiles) {
    if (!relativeFileSet.has(relative)) {
      issues.push(`Phase 10 Telegram hardening file missing: ${relative}`);
    }
  }

  const schemaPath = 'prisma/schema.prisma';
  if (relativeFileSet.has(schemaPath)) {
    const text = fs.readFileSync(path.join(root, schemaPath), 'utf8');
    for (const required of ['model TelegramActionToken', 'tokenHash      String    @unique', 'consumedAt     DateTime?', 'model TelegramActionLog', 'callbackQueryId  String?  @unique']) {
      if (!text.includes(required)) {
        issues.push(`Phase 10 schema missing Telegram action security contract (${required}): ${schemaPath}`);
      }
    }
  }

  const authPath = 'lib/telegram/auth.ts';
  if (relativeFileSet.has(authPath)) {
    const text = fs.readFileSync(path.join(root, authPath), 'utf8');
    for (const required of ['requireTelegramWebhookAuth', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_ADMIN_USER_IDS', 'telegramMisconfiguredResponse', 'x-telegram-bot-api-secret-token']) {
      if (!text.includes(required)) {
        issues.push(`Phase 10 Telegram auth missing fail-closed contract (${required}): ${authPath}`);
      }
    }
  }

  const tokenPath = 'lib/telegram/action-tokens.ts';
  if (relativeFileSet.has(tokenPath)) {
    const text = fs.readFileSync(path.join(root, tokenPath), 'utf8');
    for (const required of ['TELEGRAM_CALLBACK_PREFIX', 'createTelegramActionToken', 'parseTelegramCallbackToken', 'resolveTelegramActionToken', 'consumeTelegramActionToken', 'sha256']) {
      if (!text.includes(required)) {
        issues.push(`Phase 10 Telegram tokens missing tokenized callback contract (${required}): ${tokenPath}`);
      }
    }
  }

  const statePath = 'lib/telegram/order-state.ts';
  if (relativeFileSet.has(statePath)) {
    const text = fs.readFileSync(path.join(root, statePath), 'utf8');
    for (const required of ['canTelegramPhoneConfirm', 'canTelegramPhoneOff', 'canTelegramCancel', 'canTelegramPathaoSend', 'Paid online orders cannot be cancelled from Telegram', 'Pathao-dispatched orders cannot be cancelled from Telegram']) {
      if (!text.includes(required)) {
        issues.push(`Phase 10 Telegram state guard missing (${required}): ${statePath}`);
      }
    }
  }

  const callbackPath = 'app/api/telegram/order-callback/route.ts';
  if (relativeFileSet.has(callbackPath)) {
    const text = fs.readFileSync(path.join(root, callbackPath), 'utf8');
    for (const required of ['requireTelegramWebhookAuth', 'assertTelegramUserAllowed', 'parseTelegramCallbackToken', 'resolveTelegramActionToken', 'consumeTelegramActionToken', 'telegramActionLog.create', 'canTelegramPhoneConfirm', 'canTelegramCancel', 'canTelegramPathaoSend']) {
      if (!text.includes(required)) {
        issues.push(`Phase 10 Telegram callback route missing secure action contract (${required}): ${callbackPath}`);
      }
    }
    for (const forbidden of ['phone_confirm_', 'phone_off_', 'pathao_send_']) {
      if (text.includes(forbidden)) {
        issues.push(`Phase 10 Telegram callback route still accepts raw legacy callback prefix ${forbidden}: ${callbackPath}`);
      }
    }
  }

  const notifyPath = 'lib/telegram-notify.ts';
  if (relativeFileSet.has(notifyPath)) {
    const text = fs.readFileSync(path.join(root, notifyPath), 'utf8');
    for (const required of ['createTelegramActionToken', 'TELEGRAM_ORDER_ACTIONS.PHONE_CONFIRM', 'callback_data: phoneConfirm.callbackData']) {
      if (!text.includes(required)) {
        issues.push(`Phase 10 Telegram notifier missing tokenized buttons (${required}): ${notifyPath}`);
      }
    }
    for (const forbidden of ['phone_confirm_${', 'phone_off_${', 'cancel_${', 'pathao_send_${']) {
      if (text.includes(forbidden)) {
        issues.push(`Phase 10 Telegram notifier still emits raw orderId callback data ${forbidden}: ${notifyPath}`);
      }
    }
  }

  const giftPath = 'app/api/gift/[token]/order/route.ts';
  if (relativeFileSet.has(giftPath)) {
    const text = fs.readFileSync(path.join(root, giftPath), 'utf8');
    if (text.includes('TELEGRAM_BOT_TOKEN') || text.includes('TELEGRAM_CHAT_ID')) {
      issues.push(`Phase 10 gift Telegram route must not use ambiguous generic Telegram env names: ${giftPath}`);
    }
    if (!text.includes('escapeTelegramHtml')) {
      issues.push(`Phase 10 gift Telegram route must escape HTML before sending Telegram messages: ${giftPath}`);
    }
  }

  const matrixPath = 'lib/tracking/full-production-qa-matrix.ts';
  if (relativeFileSet.has(matrixPath)) {
    const text = fs.readFileSync(path.join(root, matrixPath), 'utf8');
    if (!text.includes('QA_TELEGRAM_BOT_HARDENING_VERIFIED')) {
      issues.push(`Phase 10 full QA matrix missing Telegram hardening evidence flag: ${matrixPath}`);
    }
  }

  const packagePath = 'package.json';
  if (relativeFileSet.has(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, packagePath), 'utf8'));
    const scripts = pkg.scripts ?? {};
    if (scripts['qa:telegram-security'] !== 'node scripts/telegram-security-audit.mjs') {
      issues.push('Phase 10 package script qa:telegram-security must run node scripts/telegram-security-audit.mjs');
    }
    if (!String(scripts['qa:predeploy'] || '').includes('npm run qa:telegram-security')) {
      issues.push('Phase 10 predeploy script must include npm run qa:telegram-security');
    }
  }
}

const files = walk(root);
const issues = [];

assertPhase1LegacyPaymentLock(files, issues);
assertPhase2CanonicalPaymentContract(files, issues);
assertPhase3MetaCatalogMapping(files, issues);
assertPhase4ExternalIdAlignment(files, issues);
assertPhase5ProductAnalyticsCounters(files, issues);
assertPhase6ConsentAndTrafficFilters(files, issues);
assertPhase7Ga4ReferralRouteQa(files, issues);
assertPhase8FullQaRegressionLocks(files, issues);
assertPhase9AdminPanelSecurityHardening(files, issues);
assertPhase10TelegramBotHardening(files, issues);

for (const file of files) {
  const relative = rel(file);
  if (relative === 'scripts/security-audit.mjs') continue;
  const base = path.basename(file);
  const ext = path.extname(file);

  if (secretFileNames.has(base) || sensitiveFileExtensions.has(ext)) {
    if (base !== '.env.example') {
      issues.push(`Sensitive file should not be packaged: ${relative}`);
    }
  }

  if (fs.statSync(file).size > 2_000_000) continue;
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const item of suspiciousPatterns) {
      if (item.pattern.test(line) && !item.allow?.(relative, line)) {
        issues.push(`${item.name}: ${relative}:${index + 1}`);
      }
    }
  });
}

if (issues.length) {
  console.error(JSON.stringify({ ok: false, issueCount: issues.length, issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, scannedFiles: files.length }, null, 2));
