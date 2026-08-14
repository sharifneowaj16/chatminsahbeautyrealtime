import { NextRequest, NextResponse } from 'next/server';
import { BehaviorTracker } from '@/lib/tracking/behavior';
import { TRACKING_EVENTS } from '@/types/tracking';
import prisma from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { buildMetaCatalogData } from '@/lib/tracking/meta-content-id';
import { getServerMetaCatalogIdSource } from '@/lib/tracking/meta-content-id-server';
import {
  attachTrackingCookies,
  buildTrackingIdentity,
  enforceClickRateLimits,
  findActiveClickableProduct,
  isDuplicateClick,
  recordValidatedSearchClick,
  sanitizeClickPayload,
  type PublicClickTrackingPayload,
} from '@/lib/search/click-tracking';

// ========================================
// TRACK SEARCH RESULT CLICK
// ========================================
export async function POST(request: NextRequest) {
  const identity = buildTrackingIdentity(request);

  try {
    const body = await request.json() as PublicClickTrackingPayload;
    const sanitized = sanitizeClickPayload(body);

    if (!sanitized.ok) {
      const response = NextResponse.json(
        { success: false, error: sanitized.error },
        { status: sanitized.status }
      );
      attachTrackingCookies(response, identity);
      return response;
    }

    const rateLimit = await enforceClickRateLimits(identity);
    if (!rateLimit.ok) {
      const response = NextResponse.json(
        {
          success: false,
          error: rateLimit.error,
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: rateLimit.status,
          headers: { 'Retry-After': rateLimit.retryAfter.toString() },
        }
      );
      attachTrackingCookies(response, identity);
      return response;
    }

    const click = sanitized.value;

    const activeProduct = await findActiveClickableProduct(click.productId);
    if (!activeProduct) {
      const response = NextResponse.json(
        { success: false, error: 'Invalid or inactive productId' },
        { status: 400 }
      );
      attachTrackingCookies(response, identity);
      return response;
    }

    // ✅ Get user ID if authenticated
    let userId: string | null = null;
    const token = request.cookies.get('auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (token) {
      const payload = await verifyAccessToken(token);
      userId = payload?.userId ?? null;
    }

    const duplicate = await isDuplicateClick({
      query: click.query,
      productId: click.productId,
      userId,
      deviceIdHash: identity.deviceIdHash,
      sessionIdHash: identity.sessionIdHash,
    });

    if (duplicate) {
      const response = NextResponse.json({
        success: true,
        deduped: true,
        message: 'Duplicate click ignored',
        data: { query: click.query, productId: click.productId, position: click.position },
      });
      attachTrackingCookies(response, identity);
      return response;
    }

    const eventValue = click.price ?? Number(activeProduct.price?.toString?.() ?? 0);
    const catalogData = buildMetaCatalogData(
      [{
        productId: activeProduct.id,
        productSku: activeProduct.sku,
        quantity: 1,
        price: eventValue,
      }],
      getServerMetaCatalogIdSource()
    );

    // No-op server-side (window check inside); safe for legacy behavior.
    BehaviorTracker.trackEvent(TRACKING_EVENTS.VIEW_CONTENT, {
      ...(catalogData ?? {}),
      content_name: click.productName || activeProduct.name,
      content_category: click.category || activeProduct.category?.name || undefined,
      value: eventValue,
      currency: 'BDT',
    });

    await recordValidatedSearchClick({
      click,
      userId,
      identity,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Click tracked successfully',
      data: {
        query: click.query,
        productId: click.productId,
        position: click.position,
        resultCount: click.resultCount,
        deduped: false,
      },
    });
    attachTrackingCookies(response, identity);
    return response;

  } catch (error: any) {
    console.error('❌ Click tracking error:', error);
    const response = NextResponse.json(
      { success: false, error: 'Click tracking failed', message: error.message },
      { status: 500 }
    );
    attachTrackingCookies(response, identity);
    return response;
  }
}

// ========================================
// GET CLICK-THROUGH RATE (CTR) ANALYTICS
// ========================================
export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(
    request,
    ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    { message: 'Search click analytics are restricted to admin users with analytics access.' }
  );
  if (response) return response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '20');

    // ✅ Top queries by total clicks (aggregate view)
    if (!query && !productId) {
      const topMetrics = await prisma.searchClickMetrics.groupBy({
        by: ['query'],
        _sum: { clicks: true, conversions: true, revenue: true },
        _count: { productId: true },
        orderBy: { _sum: { clicks: 'desc' } },
        take: limit,
      });

      return NextResponse.json({
        success: true,
        type: 'top_queries',
        data: topMetrics.map(m => ({
          query: m.query,
          uniqueProductsClicked: m._count.productId,
          totalClicks: m._sum.clicks ?? 0,
          totalConversions: m._sum.conversions ?? 0,
          totalRevenue: m._sum.revenue ?? 0,
        })),
      });
    }

    // ✅ Metrics for a specific search query
    if (query) {
      const queryMetrics = await prisma.searchClickMetrics.findMany({
        where: { query: query.toLowerCase().trim() },
        orderBy: { clicks: 'desc' },
        take: limit,
        include: {
          product: {
            select: { id: true, name: true, slug: true, price: true },
          }
        }
      });

      const totalClicks = queryMetrics.reduce((sum, m) => sum + m.clicks, 0);
      const avgResultCount = queryMetrics[0]?.resultCount ?? 1;
      const ctr = avgResultCount > 0 ? (totalClicks / avgResultCount) * 100 : 0;

      return NextResponse.json({
        success: true,
        type: 'query_metrics',
        query,
        metrics: {
          totalClicks,
          uniqueProductsClicked: queryMetrics.length,
          avgResultCount,
          ctr: Math.round(ctr * 100) / 100,
          topClickedProducts: queryMetrics.map(m => ({
            productId: m.productId,
            productName: m.product?.name,
            productSlug: m.product?.slug,
            clicks: m.clicks,
            conversions: m.conversions,
            revenue: m.revenue,
            avgPosition: m.avgPosition,
          })),
        }
      });
    }

    // ✅ Metrics for a specific product across all queries
    if (productId) {
      const productMetrics = await prisma.searchClickMetrics.findMany({
        where: { productId },
        orderBy: { clicks: 'desc' },
        take: limit,
      });

      const totalClicks = productMetrics.reduce((sum, m) => sum + m.clicks, 0);
      const totalConversions = productMetrics.reduce((sum, m) => sum + m.conversions, 0);
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      return NextResponse.json({
        success: true,
        type: 'product_metrics',
        productId,
        metrics: {
          totalClicks,
          totalConversions,
          conversionRate: Math.round(conversionRate * 100) / 100,
          queriesThatLeadHere: productMetrics.map(m => ({
            query: m.query,
            clicks: m.clicks,
            conversions: m.conversions,
            avgPosition: m.avgPosition,
          })),
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Provide query or productId parameter' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ CTR analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics', message: error.message },
      { status: 500 }
    );
  }
}

// ========================================
// PUBLIC CONVERSION UPDATE REMOVED
// ========================================
export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Public search conversion updates are disabled. Search conversions are attributed only by verified order/payment flows.',
      code: 'SEARCH_CONVERSION_CLIENT_UPDATE_DISABLED',
    },
    { status: 410 }
  );
}
