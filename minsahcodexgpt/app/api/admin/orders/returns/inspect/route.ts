// app/api/admin/orders/returns/inspect/route.ts
// Pillar 4 & 7 & Refinement 7: Delivery Return Quality Inspection, Transit Scrap & Vendor Defect Queue Engine

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { recordStockMovement } from '@/lib/inventory/stock-service';

export const dynamic = 'force-dynamic';

// GET: Fetch pending vendor defect claims awaiting runner supplier exchange
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

    // Find all stock movements of type VENDOR_DEFECT_CLAIM
    const defectClaims = await prisma.stockMovement.findMany({
      where: {
        type: 'VENDOR_DEFECT_CLAIM',
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            costPrice: true,
            lastCostPrice: true,
            quantity: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    const defectItems = await prisma.orderItem.findMany({
      where: {
        itemStatus: 'RETURNED_DEFECTIVE',
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalDefectClaims: defectClaims.length,
        defectClaims: defectClaims.map((claim) => ({
          id: claim.id,
          referenceId: claim.referenceId,
          productId: claim.productId,
          productName: claim.product.name,
          sku: claim.product.sku,
          costPrice: claim.costPriceAtTime != null ? Number(claim.costPriceAtTime) : null,
          notes: claim.notes,
          createdAt: claim.createdAt,
        })),
        defectItems: defectItems.map((item) => ({
          id: item.id,
          orderNumber: item.order.orderNumber,
          orderId: item.order.id,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          returnReason: item.returnReason,
        })),
      },
    });
  } catch (err: any) {
    console.error('[return-inspect-api] GET Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch vendor defect queue' },
      { status: 500 }
    );
  }
}

// POST: Inspect return or resolve vendor defect exchange
export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderItemId, condition, returnReason, adminNotes, action, productId, exchangeQty = 1 } = body;

    // Handle runner supplier defect exchange resolution
    if (action === 'RESOLVE_SUPPLIER_EXCHANGE') {
      if (!productId) {
        return NextResponse.json({ error: 'productId is required to resolve supplier exchange' }, { status: 400 });
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      const effectiveCost = product.lastCostPrice != null ? Number(product.lastCostPrice) : product.costPrice != null ? Number(product.costPrice) : null;
      const count = Number(exchangeQty) || 1;
      const nextQuantity = product.quantity + count;

      await prisma.product.update({
        where: { id: productId },
        data: { quantity: nextQuantity },
      });

      await recordStockMovement({
        productId,
        delta: count,
        type: 'VENDOR_DEFECT_EXCHANGED',
        referenceId: body.claimId || `SUPPLIER_REPLACEMENT_${Date.now()}`,
        costPriceAtTime: effectiveCost,
        notes: `Runner successfully exchanged defective item with wholesale supplier (+${count} units restocked). ${adminNotes || ''}`,
        createdByAdminId: payload.adminId ?? null,
      });

      return NextResponse.json({
        success: true,
        message: `Supplier replacement completed: +${count} ${product.name} restocked to inventory`,
        data: {
          productId,
          productName: product.name,
          newQuantity: nextQuantity,
        },
      });
    }

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Refinement 7: VENDOR_DEFECT added alongside GOOD, DAMAGED, EXPIRED
    const validConditions = ['GOOD', 'DAMAGED', 'EXPIRED', 'VENDOR_DEFECT'];
    if (!condition || !validConditions.includes(condition)) {
      return NextResponse.json(
        { error: 'condition must be one of: GOOD, DAMAGED, EXPIRED, VENDOR_DEFECT' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            where: orderItemId ? { id: orderItemId } : undefined,
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  quantity: true,
                  costPrice: true,
                  lastCostPrice: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (!order.items.length) {
        throw new Error('No matching order items found to inspect');
      }

      const inspectedItems: any[] = [];

      for (const item of order.items) {
        if (!item.productId || !item.product) {
          continue;
        }

        const effectiveCost =
          item.product.costPrice != null
            ? Number(item.product.costPrice)
            : item.product.lastCostPrice != null
              ? Number(item.product.lastCostPrice)
              : null;

        const nextItemStatus =
          condition === 'GOOD'
            ? 'RETURNED_GOOD'
            : condition === 'VENDOR_DEFECT'
              ? 'RETURNED_DEFECTIVE'
              : 'RETURNED_DAMAGED';

        const notes = adminNotes || returnReason || `Inspected as ${condition}`;

        // 1. Update OrderItem status
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            itemStatus: nextItemStatus,
            returnReason: returnReason || null,
          },
        });

        // 2. Inventory Handling
        if (condition === 'GOOD') {
          // Restock good condition item back into inventory
          const nextQuantity = item.product.quantity + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: nextQuantity },
          });

          await recordStockMovement(
            {
              productId: item.productId,
              delta: item.quantity,
              type: 'RETURN_RESTOCK',
              referenceId: order.orderNumber,
              costPriceAtTime: effectiveCost,
              notes: `Restocked good return from Order #${order.orderNumber} (+${item.quantity} units). ${notes}`,
              createdByAdminId: payload.adminId ?? null,
            },
            tx
          );

          inspectedItems.push({
            itemId: item.id,
            sku: item.sku,
            condition: 'GOOD',
            action: 'RESTOCKED',
            quantityRestocked: item.quantity,
            newProductStock: nextQuantity,
          });
        } else if (condition === 'VENDOR_DEFECT') {
          // Refinement 7: VENDOR DEFECT: held for supplier exchange, zero net scrap loss
          await recordStockMovement(
            {
              productId: item.productId,
              delta: 0, // No stock added until supplier replaces
              type: 'VENDOR_DEFECT_CLAIM',
              referenceId: order.orderNumber,
              costPriceAtTime: effectiveCost,
              notes: `Vendor defect item queued for runner supplier exchange (Order #${order.orderNumber}, ${item.quantity} units). ${notes}`,
              createdByAdminId: payload.adminId ?? null,
            },
            tx
          );

          inspectedItems.push({
            itemId: item.id,
            sku: item.sku,
            condition: 'VENDOR_DEFECT',
            action: 'QUEUED_FOR_SUPPLIER_EXCHANGE',
            quantityQueued: item.quantity,
            productStockUnchanged: item.product.quantity,
          });
        } else {
          // DAMAGED or EXPIRED: DO NOT RESTOCK. Record write-off loss.
          const movementType = condition === 'EXPIRED' ? 'EXPIRED_DISCARD' : 'DAMAGED_LOSS';
          const lossTotal = effectiveCost != null ? Number((effectiveCost * item.quantity).toFixed(2)) : 0;

          await recordStockMovement(
            {
              productId: item.productId,
              delta: 0, // No inventory added
              type: movementType,
              referenceId: order.orderNumber,
              costPriceAtTime: effectiveCost,
              notes: `Scrapped ${condition} return from Order #${order.orderNumber} (${item.quantity} units, loss: ৳${lossTotal}). ${notes}`,
              createdByAdminId: payload.adminId ?? null,
            },
            tx
          );

          inspectedItems.push({
            itemId: item.id,
            sku: item.sku,
            condition,
            action: 'WRITTEN_OFF_SCRAP',
            quantityScrapped: item.quantity,
            lossAmount: lossTotal,
            productStockUnchanged: item.product.quantity,
          });
        }
      }

      // Mark order returnedAt timestamp if not set
      if (!order.returnedAt) {
        await tx.order.update({
          where: { id: orderId },
          data: { returnedAt: new Date() },
        });
      }

      return {
        orderId,
        orderNumber: order.orderNumber,
        condition,
        itemsInspectedCount: inspectedItems.length,
        inspectedItems,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Return inspection completed for ${result.itemsInspectedCount} item(s) as ${condition}`,
      data: result,
    });
  } catch (err: any) {
    console.error('[return-inspect-api] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to inspect return items' },
      { status: 500 }
    );
  }
}
