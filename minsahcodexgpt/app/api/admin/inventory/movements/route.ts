// app/api/admin/inventory/movements/route.ts
// Stock Movement Audit Ledger API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              quantity: true,
            },
          },
        },
      }),
    ]);

    const adminIds = Array.from(
      new Set(movements.map((m) => m.createdByAdminId).filter(Boolean))
    ) as string[];

    const admins = adminIds.length > 0
      ? await prisma.adminUser.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const adminMap = new Map(admins.map((a) => [a.id, a]));

    return NextResponse.json({
      success: true,
      data: {
        movements: movements.map((m) => ({
          id: m.id,
          productId: m.productId,
          productName: m.product.name,
          sku: m.product.sku,
          currentStock: m.product.quantity,
          delta: m.delta,
          type: m.type,
          referenceId: m.referenceId,
          costPriceAtTime: m.costPriceAtTime ? Number(m.costPriceAtTime) : null,
          notes: m.notes,
          createdAt: m.createdAt.toISOString(),
          createdByAdminId: m.createdByAdminId,
          createdByAdminName: (m.createdByAdminId && adminMap.get(m.createdByAdminId)?.name) || m.createdByAdminId || 'System',
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('[stock-movements] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch stock movements' },
      { status: 500 }
    );
  }
}
