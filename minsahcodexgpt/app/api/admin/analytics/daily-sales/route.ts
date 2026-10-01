// app/api/admin/analytics/daily-sales/route.ts
// Daily Sales & Net Profit Financial Intelligence Report Engine

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
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const rangeParam = searchParams.get('range') || '1d'; // '1d' | '7d' | '30d'

    let startDate: Date;
    let endDate: Date;

    if (dateParam) {
      startDate = new Date(`${dateParam}T00:00:00.000Z`);
      endDate = new Date(`${dateParam}T23:59:59.999Z`);
    } else {
      const now = new Date();
      if (rangeParam === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (rangeParam === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      }
      endDate = new Date();
    }

    // Query orders within window
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isTest: false,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                costPrice: true,
                lastCostPrice: true,
                price: true,
              },
            },
          },
        },
        payments: {
          select: {
            method: true,
            status: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch Runner Cash ledgers in this timeframe
    const runnerLedgers = await prisma.runnerCashLedger.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Pillar 7: Fetch Damaged & Expired write-off stock movements in this timeframe
    const damagedLossMovements = await prisma.stockMovement.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        type: {
          in: ['DAMAGED_LOSS', 'EXPIRED_DISCARD'],
        },
      },
      include: {
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
      },
    });

    const damagedLossTotal = damagedLossMovements.reduce((sum, m) => {
      const unitCost = m.costPriceAtTime != null ? Number(m.costPriceAtTime) : 0;
      // In scrap write-off, notes or costPriceAtTime reflect the loss
      return sum + unitCost;
    }, 0);

    // Financial Metrics Accumulators
    let totalOrders = orders.length;
    let deliveredOrdersCount = 0;
    let confirmedOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let returnedOrdersCount = 0;

    let grossRevenue = 0;
    let totalCogs = 0;
    let totalShippingCollected = 0;
    let totalCourierActualCost = 0;
    let totalDiscounts = 0;

    let codCashCollected = 0;
    let onlinePaymentsCollected = 0;
    let pendingCourierReceivables = 0;

    const itemsSoldBreakdown: Record<string, { sku: string; name: string; quantity: number; revenue: number; cogs: number; profit: number }> = {};

    for (const order of orders) {
      const status = order.status;
      const orderTotal = Number(order.total);
      const shippingPaid = Number(order.shippingCost);
      const courierCharge = order.courierDeliveryCharge != null ? Number(order.courierDeliveryCharge) : shippingPaid;
      const discount = Number(order.discountAmount) + Number(order.deliveryDiscountAmount);

      totalShippingCollected += shippingPaid;
      totalCourierActualCost += courierCharge;
      totalDiscounts += discount;

      if (status === 'DELIVERED') {
        deliveredOrdersCount++;
        grossRevenue += orderTotal;

        if (order.paymentMethod?.toLowerCase().includes('cod')) {
          codCashCollected += orderTotal;
        } else {
          onlinePaymentsCollected += orderTotal;
        }

        // Calculate COGS based on actual buy price or cost price
        for (const item of order.items) {
          const unitCost =
            item.product?.lastCostPrice != null
              ? Number(item.product.lastCostPrice)
              : item.product?.costPrice != null
                ? Number(item.product.costPrice)
                : Number(item.price) * 0.65; // realistic fallback default

          const itemRevenue = Number(item.price) * item.quantity;
          const itemCogs = unitCost * item.quantity;
          totalCogs += itemCogs;

          const key = item.sku || item.name;
          if (!itemsSoldBreakdown[key]) {
            itemsSoldBreakdown[key] = {
              sku: item.sku,
              name: item.name,
              quantity: 0,
              revenue: 0,
              cogs: 0,
              profit: 0,
            };
          }
          itemsSoldBreakdown[key].quantity += item.quantity;
          itemsSoldBreakdown[key].revenue += itemRevenue;
          itemsSoldBreakdown[key].cogs += itemCogs;
          itemsSoldBreakdown[key].profit += itemRevenue - itemCogs;
        }
      } else if (status === 'CONFIRMED' || status === 'PROCESSING' || status === 'SHIPPED') {
        confirmedOrdersCount++;
        if (status === 'SHIPPED') {
          pendingCourierReceivables += orderTotal;
        }
      } else if (status === 'CANCELLED') {
        cancelledOrdersCount++;
      } else if (status === 'REFUNDED' || order.returnedAt != null) {
        returnedOrdersCount++;
      }
    }

    const deliveryDeficit = Math.max(0, totalCourierActualCost - totalShippingCollected);
    const grossProfit = grossRevenue - totalCogs;
    const netProfit = grossProfit - deliveryDeficit - totalDiscounts - damagedLossTotal;
    const netProfitMarginPercent = grossRevenue > 0 ? Number(((netProfit / grossRevenue) * 100).toFixed(2)) : 0;

    // Runner ledger reconciliation aggregates
    const runnerCashGiven = runnerLedgers.reduce((sum, l) => sum + Number(l.cashGiven), 0);
    const runnerActualSpent = runnerLedgers.reduce((sum, l) => sum + Number(l.actualSpent), 0);
    const runnerCashReturned = runnerLedgers.reduce((sum, l) => sum + Number(l.cashReturned), 0);
    const runnerDiscrepancy = runnerLedgers.reduce((sum, l) => sum + Number(l.discrepancy), 0);

    return NextResponse.json({
      success: true,
      data: {
        timeframe: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          range: rangeParam,
        },
        profitability: {
          grossRevenue: Number(grossRevenue.toFixed(2)),
          totalCogs: Number(totalCogs.toFixed(2)),
          grossProfit: Number(grossProfit.toFixed(2)),
          deliveryDeficit: Number(deliveryDeficit.toFixed(2)),
          totalDiscounts: Number(totalDiscounts.toFixed(2)),
          damagedLossTotal: Number(damagedLossTotal.toFixed(2)),
          damagedIncidentsCount: damagedLossMovements.length,
          netProfit: Number(netProfit.toFixed(2)),
          netProfitMarginPercent,
          status: netProfit >= 0 ? 'PROFITABLE' : 'UNPROFITABLE',
        },
        orderMetrics: {
          totalOrders,
          deliveredOrders: deliveredOrdersCount,
          confirmedOrders: confirmedOrdersCount,
          cancelledOrders: cancelledOrdersCount,
          returnedOrders: returnedOrdersCount,
          deliverySuccessRate: totalOrders > 0 ? Number(((deliveredOrdersCount / totalOrders) * 100).toFixed(1)) : 0,
        },
        cashFlow: {
          codCashCollected: Number(codCashCollected.toFixed(2)),
          onlinePaymentsCollected: Number(onlinePaymentsCollected.toFixed(2)),
          pendingCourierReceivables: Number(pendingCourierReceivables.toFixed(2)),
          runnerCashGiven: Number(runnerCashGiven.toFixed(2)),
          runnerActualSpent: Number(runnerActualSpent.toFixed(2)),
          runnerCashReturned: Number(runnerCashReturned.toFixed(2)),
          runnerDiscrepancy: Number(runnerDiscrepancy.toFixed(2)),
        },
        topSellingItems: Object.values(itemsSoldBreakdown)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 10),
      },
    });
  } catch (err: any) {
    console.error('[daily-sales-analytics] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to calculate daily sales and net profit report' },
      { status: 500 }
    );
  }
}
