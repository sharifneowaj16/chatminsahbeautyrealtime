import { NextRequest, NextResponse } from 'next/server';
import {
  SHOP_MERCHANDISING_CACHE_CONTROL,
  getShopMerchandisingSections,
  sanitizeShopMerchandisingContext,
} from '@/lib/shopMerchandising';
import { getShopPayloadHeaders } from '@/lib/shopPerformance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const context = sanitizeShopMerchandisingContext(request.nextUrl.searchParams);
    const sections = await getShopMerchandisingSections(context);
    const payload = {
      success: true,
      source: 'server_catalog_merchandising',
      context: {
        q: context.q || null,
        category: context.category || null,
        brand: context.brand || null,
        sort: context.sort || null,
        minPrice: context.minPrice || null,
        maxPrice: context.maxPrice || null,
        inStock: context.inStock === true,
        excludedProductCount: context.excludeIds?.length || 0,
      },
      meta: {
        sectionCount: sections.length,
        personalized: sections.some((section) => section.personalized),
        strategy: sections.some((section) => section.personalized)
          ? 'contextual_catalog_merchandising'
          : 'catalog_performance_merchandising',
      },
      sections,
    };

    return NextResponse.json(payload, {
      headers: getShopPayloadHeaders(payload, {
        'Cache-Control': SHOP_MERCHANDISING_CACHE_CONTROL,
        'X-Shop-Merchandising-Source': 'server_catalog',
      }),
    });
  } catch (error) {
    console.error('GET /api/shop/merchandising error:', error);
    return NextResponse.json(
      {
        success: false,
        source: 'server_catalog_merchandising',
        sections: [],
        error: 'Failed to load shop merchandising',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Shop-Merchandising-Source': 'server_catalog',
        },
      }
    );
  }
}
