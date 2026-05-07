import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';
import {
  AdminProductError,
  adminProductDetailInclude,
  deleteAdminProduct,
  formatAdminProductDetail,
  updateAdminProduct,
} from '@/lib/admin-products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_VIEW)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const product = await prisma.product.findFirst({
      where: { AND: [{ OR: [{ id }, { slug: id }] }, { deletedAt: null }] },
      include: adminProductDetailInclude,
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product: formatAdminProductDetail(product) });
  } catch (error) {
    console.error('GET /api/admin/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_EDIT)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const product = await updateAdminProduct(id, await request.json());

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
      },
    });
  } catch (error) {
    if (error instanceof AdminProductError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('PUT /api/admin/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_DELETE)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const result = await deleteAdminProduct(id);

    return NextResponse.json({ success: true, archived: result.archived });
  } catch (error) {
    if (error instanceof AdminProductError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('DELETE /api/admin/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
