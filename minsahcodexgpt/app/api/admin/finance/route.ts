import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

function getDateBounds(timeRange: string) {
  const now = new Date();
  let start = new Date();

  if (timeRange === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (timeRange === 'week') {
    start.setDate(now.getDate() - 7);
  } else if (timeRange === 'month') {
    start.setMonth(now.getMonth() - 1);
  } else {
    // default 30 days
    start.setDate(now.getDate() - 30);
  }

  return { start, end: now };
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'month';
    const methodFilter = searchParams.get('method') || 'all';
    const { start, end } = getDateBounds(timeRange);

    // Fetch payments within range
    const paymentWhere: any = {
      createdAt: { gte: start, lte: end },
    };

    if (methodFilter !== 'all') {
      paymentWhere.method = { contains: methodFilter, mode: 'insensitive' };
    }

    const [payments, todayRegister, pendingRunnerLedgers, ordersSummary] = await Promise.all([
      prisma.payment.findMany({
        where: paymentWhere,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.dailyCashRegister.findFirst({
        orderBy: { date: 'desc' },
      }),
      prisma.runnerCashLedger.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          runnerName: true,
          cashGiven: true,
          actualSpent: true,
          discrepancy: true,
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    // Calculate method breakdown & fees
    let totalGross = 0;
    let totalFees = 0;
    const methodBreakdown = {
      bKash: 0,
      Nagad: 0,
      Card: 0,
      COD: 0,
    };

    const transactions = payments.map((p) => {
      const gross = Number(p.amount);
      totalGross += gross;

      const rawMethod = (p.method || '').toLowerCase();
      let normalizedMethod: 'bKash' | 'Nagad' | 'COD' | 'Card' = 'COD';
      let feeRate = 0.01; // 1% COD handling

      if (rawMethod.includes('bkash')) {
        normalizedMethod = 'bKash';
        feeRate = 0.015; // 1.5%
        methodBreakdown.bKash += gross;
      } else if (rawMethod.includes('nagad')) {
        normalizedMethod = 'Nagad';
        feeRate = 0.015; // 1.5%
        methodBreakdown.Nagad += gross;
      } else if (rawMethod.includes('card') || rawMethod.includes('ssl') || rawMethod.includes('online')) {
        normalizedMethod = 'Card';
        feeRate = 0.025; // 2.5%
        methodBreakdown.Card += gross;
      } else {
        methodBreakdown.COD += gross;
      }

      const fee = Number((gross * feeRate).toFixed(2));
      totalFees += fee;
      const net = Number((gross - fee).toFixed(2));

      const customerName = p.order?.user
        ? `${p.order.user.firstName || ''} ${p.order.user.lastName || ''}`.trim() || 'Verified Customer'
        : 'Guest Customer';

      let statusDisplay: 'Completed' | 'Pending' | 'Reconciled' | 'Failed' = 'Pending';
      const statusLower = String(p.status).toLowerCase();
      if (statusLower === 'completed' || statusLower === 'success' || statusLower === 'paid') {
        statusDisplay = p.signatureVerified && p.amountMatched ? 'Reconciled' : 'Completed';
      } else if (statusLower === 'failed' || statusLower === 'cancelled') {
        statusDisplay = 'Failed';
      }

      return {
        id: p.transactionId || `TXN-${p.id.slice(-6).toUpperCase()}`,
        orderId: p.order?.orderNumber ? `#${p.order.orderNumber}` : `#ORD-${p.orderId.slice(-6)}`,
        date: p.createdAt.toISOString().replace('T', ' ').substring(0, 16),
        customer: customerName,
        method: normalizedMethod,
        gross,
        fee,
        net,
        status: statusDisplay,
      };
    });

    const netPayout = Number((totalGross - totalFees).toFixed(2));

    // Runner totals
    const runnerDiscrepancyTotal = pendingRunnerLedgers.reduce(
      (acc, r) => acc + Number(r.discrepancy || 0),
      0
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalGross: totalGross || Number(ordersSummary._sum.total || 0),
        netPayout: netPayout || Number(ordersSummary._sum.total || 0),
        totalFees,
        pendingCod: methodBreakdown.COD,
        orderCount: ordersSummary._count.id,
        methodBreakdown,
        runnerDiscrepancy: runnerDiscrepancyTotal,
        todayRegister: todayRegister
          ? {
              date: todayRegister.date,
              openingCash: Number(todayRegister.openingCash),
              codCollected: Number(todayRegister.codCollected),
              runnerExpenses: Number(todayRegister.runnerExpenses),
              expectedCash: Number(todayRegister.expectedCash),
              actualCashCounted: Number(todayRegister.actualCashCounted),
              discrepancy: Number(todayRegister.discrepancy),
              status: todayRegister.status,
            }
          : null,
      },
      transactions,
    });
  } catch (error) {
    console.error('GET /api/admin/finance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'CLOSE_REGISTER') {
      const {
        date,
        openingCash,
        codCollected,
        runnerExpenses,
        officeExpenses,
        actualCashCounted,
        notes,
      } = body;

      const expected = Number(openingCash || 0) + Number(codCollected || 0) - Number(runnerExpenses || 0) - Number(officeExpenses || 0);
      const discrepancy = Number(actualCashCounted || 0) - expected;
      const status = discrepancy === 0 ? 'CLOSED' : 'DISCREPANCY';

      const safeNotes = typeof notes === 'string' ? notes : undefined;
      const adminId = typeof payload.userId === 'string' ? payload.userId : undefined;

      const register = await prisma.dailyCashRegister.upsert({
        where: { date },
        update: {
          openingCash,
          codCollected,
          runnerExpenses,
          officeExpenses,
          expectedCash: expected,
          actualCashCounted,
          discrepancy,
          status,
          notes: safeNotes,
          closedByAdminId: adminId,
        },
        create: {
          date,
          openingCash,
          codCollected,
          runnerExpenses,
          officeExpenses,
          expectedCash: expected,
          actualCashCounted,
          discrepancy,
          status,
          notes: safeNotes,
          closedByAdminId: adminId,
        },
      });

      return NextResponse.json({ success: true, register });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/admin/finance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
