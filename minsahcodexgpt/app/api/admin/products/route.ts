import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';
import {
  AdminProductError,
  adminProductListInclude,
  buildAdminProductOrderBy,
  buildAdminProductWhere,
  createAdminProduct,
  formatAdminProductListItem,
} from '@/lib/admin-products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '25', 10);
  const limit = Math.min(200, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 25));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_VIEW)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPagination(searchParams);
    const where = buildAdminProductWhere(searchParams);
    const orderBy = buildAdminProductOrderBy(searchParams);

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: adminProductListInclude,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products: products.map(formatAdminProductListItem),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_CREATE)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const product = await createAdminProduct(await request.json());

    return NextResponse.json(
      {
        success: true,
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AdminProductError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('POST /api/admin/products error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
