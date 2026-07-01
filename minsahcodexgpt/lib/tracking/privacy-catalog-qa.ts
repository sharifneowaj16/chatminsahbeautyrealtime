import 'server-only';

import prisma from '@/lib/prisma';
import { getMetaContentId } from '@/lib/tracking/meta-content-id';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(value), 1), MAX_LIMIT);
}

function decimalToNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'toString' in value) {
    return Number(value.toString());
  }
  return 0;
}

function isEnvTrue(name: string) {
  return process.env[name] === 'true';
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://minsahbeauty.cloud'
  ).replace(/\/$/, '');
}

function normalizeHost(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function hasArrayItems(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function jsonHasShadeData(value: unknown) {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

export type CatalogQaProductIssue = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  contentId: string;
  price: number;
  salePrice: number | null;
  quantity: number;
  variantCount: number;
  defaultImageUrl: string | null;
  canonicalUrl: string | null;
  issues: string[];
  severity: 'WARN' | 'CRITICAL';
};

export type PrivacyCatalogQaSnapshot = {
  ok: boolean;
  checkedAt: string;
  env: {
    privacyPolicyUrl: string;
    privacyContactEmailConfigured: boolean;
    trackingDisclosureVerified: boolean;
    cookieDisclosureVerified: boolean;
    consentModeRequired: boolean;
    consentModeVerified: boolean;
    browserConsentGateEnabled: boolean;
    internalTrafficFilterConfigured: boolean;
    clarityEnabled: boolean;
    clarityProjectConfigured: boolean;
    clarityMaskingVerified: boolean;
    metaCatalogConnected: boolean;
    metaCatalogQaVerified: boolean;
  };
  metrics: {
    activeProducts: number;
    productsScanned: number;
    catalogIssueProducts: number;
    criticalCatalogIssueProducts: number;
    missingImageProducts: number;
    missingCanonicalUrlProducts: number;
    canonicalHostMismatchProducts: number;
    missingSkuProducts: number;
    missingPriceProducts: number;
    activeOutOfStockProducts: number;
    variantProducts: number;
    variantMappingRiskProducts: number;
  };
  catalogIssueRows: CatalogQaProductIssue[];
  issues: string[];
  instructions: string[];
};

export async function buildPrivacyCatalogQaSnapshot(options?: {
  limit?: number;
}): Promise<PrivacyCatalogQaSnapshot> {
  const limit = clampLimit(options?.limit);
  const checkedAt = new Date();
  const siteUrl = getSiteUrl();
  const siteHost = normalizeHost(siteUrl);

  const privacyPolicyUrl = `${siteUrl}/privacy-policy`;
  const trackingDisclosureVerified = isEnvTrue('TRACKING_DISCLOSURE_VERIFIED');
  const cookieDisclosureVerified = isEnvTrue('COOKIE_DISCLOSURE_VERIFIED');
  const consentModeRequired = isEnvTrue('CONSENT_MODE_REQUIRED');
  const consentModeVerified = isEnvTrue('CONSENT_MODE_VERIFIED');
  const browserConsentGateEnabled = process.env.NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT === 'true';
  const internalTrafficFilterConfigured = Boolean(
    process.env.ANALYTICS_INTERNAL_IPS || process.env.INTERNAL_TRAFFIC_IPS || process.env.STAFF_IPS
  );
  const clarityEnabled = process.env.NEXT_PUBLIC_CLARITY_ENABLED === 'true';
  const clarityProjectConfigured = Boolean(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID);
  const clarityMaskingVerified = isEnvTrue('CLARITY_SENSITIVE_MASKING_VERIFIED');
  const metaCatalogConnected = isEnvTrue('META_CATALOG_CONNECTED');
  const metaCatalogQaVerified = isEnvTrue('META_CATALOG_QA_VERIFIED');
  const privacyContactEmailConfigured = Boolean(
    process.env.PRIVACY_CONTACT_EMAIL || process.env.DATA_DELETION_EMAIL || process.env.SUPPORT_EMAIL
  );

  const [activeProducts, products] = await Promise.all([
    prisma.product.count({ where: { isActive: true, deletedAt: null } }),
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ deliveredOrderCount: 'desc' }, { orderCount: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        sku: true,
        name: true,
        slug: true,
        price: true,
        salePrice: true,
        quantity: true,
        trackInventory: true,
        allowBackorder: true,
        canonicalUrl: true,
        shadeOptions: true,
        productGroupJsonLd: true,
        merchantListingJsonLd: true,
        variants: { select: { id: true, sku: true, price: true, quantity: true } },
        images: {
          orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { url: true },
        },
      },
    }),
  ]);

  const issueRows = products.map((product) => {
    const issues: string[] = [];
    const price = decimalToNumber(product.price);
    const salePrice = product.salePrice === null ? null : decimalToNumber(product.salePrice);
    const defaultImageUrl = product.images[0]?.url ?? null;
    const canonicalHost = normalizeHost(product.canonicalUrl);
    const variantCount = product.variants.length;
    const hasVariants = variantCount > 0 || jsonHasShadeData(product.shadeOptions);

    if (!product.sku?.trim()) issues.push('Missing SKU/catalog ID fallback.');
    if (price <= 0 && (!salePrice || salePrice <= 0)) issues.push('Missing or invalid BDT price.');
    if (!defaultImageUrl) issues.push('Missing product image.');
    if (!product.canonicalUrl) issues.push('Missing canonical URL.');
    if (product.canonicalUrl && siteHost && canonicalHost && canonicalHost !== siteHost) {
      issues.push('Canonical URL host does not match production site host.');
    }
    if (product.trackInventory && product.quantity <= 0 && !product.allowBackorder) {
      issues.push('Active product is out of stock; feed availability should be unavailable.');
    }
    if (hasVariants && !product.productGroupJsonLd && !hasArrayItems(product.variants)) {
      issues.push('Variant/shade mapping risk: product_group metadata is incomplete.');
    }
    if (hasVariants && variantCount > 0 && product.variants.some((variant) => !variant.sku?.trim())) {
      issues.push('One or more variants are missing SKU/catalog IDs.');
    }
    if (!product.merchantListingJsonLd) {
      issues.push('Merchant listing structured data is missing.');
    }

    const critical = issues.some((issue) =>
      issue.includes('Missing product image') ||
      issue.includes('Missing or invalid') ||
      issue.includes('Missing SKU')
    );

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      contentId: getMetaContentId({ productId: product.id, sku: product.sku }),
      price,
      salePrice,
      quantity: product.quantity,
      variantCount,
      defaultImageUrl,
      canonicalUrl: product.canonicalUrl,
      issues,
      severity: critical ? 'CRITICAL' : 'WARN',
    } satisfies CatalogQaProductIssue;
  }).filter((row) => row.issues.length > 0);

  const missingImageProducts = issueRows.filter((row) => row.issues.some((issue) => issue.includes('Missing product image'))).length;
  const missingCanonicalUrlProducts = issueRows.filter((row) => row.issues.some((issue) => issue.includes('Missing canonical URL'))).length;
  const canonicalHostMismatchProducts = issueRows.filter((row) => row.issues.some((issue) => issue.includes('Canonical URL host'))).length;
  const missingSkuProducts = issueRows.filter((row) => row.issues.some((issue) => issue.includes('Missing SKU'))).length;
  const missingPriceProducts = issueRows.filter((row) => row.issues.some((issue) => issue.includes('Missing or invalid'))).length;
  const activeOutOfStockProducts = issueRows.filter((row) => row.issues.some((issue) => issue.includes('out of stock'))).length;
  const variantMappingRiskProducts = issueRows.filter((row) => row.issues.some((issue) => issue.includes('Variant/shade'))).length;
  const variantProducts = products.filter((product) => product.variants.length > 0 || jsonHasShadeData(product.shadeOptions)).length;

  const issues = [
    !trackingDisclosureVerified ? 'Tracking disclosure is not marked verified.' : null,
    !cookieDisclosureVerified ? 'Cookie/tracking disclosure is not marked verified.' : null,
    consentModeRequired && !consentModeVerified ? 'Consent mode is required but not marked verified.' : null,
    consentModeRequired && !browserConsentGateEnabled ? 'Consent mode is required but browser opt-in gate is not enabled.' : null,
    !internalTrafficFilterConfigured ? 'Internal/staff IP filter is not configured.' : null,
    clarityEnabled && !clarityProjectConfigured ? 'Clarity is enabled but project ID is missing.' : null,
    clarityEnabled && !clarityMaskingVerified ? 'Clarity sensitive input masking is not marked verified.' : null,
    !metaCatalogConnected ? 'Meta Catalog is not marked connected.' : null,
    !metaCatalogQaVerified ? 'Meta Catalog QA is not marked verified.' : null,
    issueRows.length > 0 ? `${issueRows.length} active product(s) have catalog readiness warnings.` : null,
  ].filter((issue): issue is string => Boolean(issue));

  return {
    ok: issues.length === 0,
    checkedAt: checkedAt.toISOString(),
    env: {
      privacyPolicyUrl,
      privacyContactEmailConfigured,
      trackingDisclosureVerified,
      cookieDisclosureVerified,
      consentModeRequired,
      consentModeVerified,
      browserConsentGateEnabled,
      internalTrafficFilterConfigured,
      clarityEnabled,
      clarityProjectConfigured,
      clarityMaskingVerified,
      metaCatalogConnected,
      metaCatalogQaVerified,
    },
    metrics: {
      activeProducts,
      productsScanned: products.length,
      catalogIssueProducts: issueRows.length,
      criticalCatalogIssueProducts: issueRows.filter((row) => row.severity === 'CRITICAL').length,
      missingImageProducts,
      missingCanonicalUrlProducts,
      canonicalHostMismatchProducts,
      missingSkuProducts,
      missingPriceProducts,
      activeOutOfStockProducts,
      variantProducts,
      variantMappingRiskProducts,
    },
    catalogIssueRows: issueRows.slice(0, limit),
    issues,
    instructions: [
      'Verify /privacy-policy contains cookie/tracking disclosure for Meta Pixel/CAPI, GA4, and Clarity.',
      'Set TRACKING_DISCLOSURE_VERIFIED=true and COOKIE_DISCLOSURE_VERIFIED=true only after legal/content QA passes.',
      'If consent is required, set NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT=true and verify deny/allow behavior before setting CONSENT_MODE_VERIFIED=true.',
      'Configure ANALYTICS_INTERNAL_IPS/INTERNAL_TRAFFIC_IPS/STAFF_IPS so staff/developer traffic is excluded from product analytics and public CAPI.',
      'Enable Clarity only after sensitive checkout/account/admin fields are masked in Clarity project settings; then set CLARITY_SENSITIVE_MASKING_VERIFIED=true.',
      'Connect Meta Catalog and confirm Catalog item IDs match Browser Pixel/CAPI content_ids.',
      'Fix products with missing image, SKU/catalog ID, invalid price, canonical URL, or variant/shade mapping warnings before scaling dynamic ads.',
    ],
  };
}
