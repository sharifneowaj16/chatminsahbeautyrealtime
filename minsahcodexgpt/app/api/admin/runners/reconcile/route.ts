// app/api/admin/runners/reconcile/route.ts
// Runner Cash Float & Reconciliation Ledger API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { calculateRunnerDiscrepancy } from '@/lib/inventory/stock-service';

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
    const status = searchParams.get('status');
    const runnerName = searchParams.get('runnerName');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (runnerName) where.runnerName = { contains: runnerName, mode: 'insensitive' };

    const [total, ledgers] = await Promise.all([
      prisma.runnerCashLedger.count({ where }),
      prisma.runnerCashLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    // Calculate aggregate metrics
    const aggregates = await prisma.runnerCashLedger.aggregate({
      where,
      _sum: {
        cashGiven: true,
        actualSpent: true,
        cashReturned: true,
        discrepancy: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ledgers: ledgers.map((l) => ({
          id: l.id,
          shortlistId: l.shortlistId,
          runnerId: l.runnerId,
          runnerName: l.runnerName,
          cashGiven: Number(l.cashGiven),
          actualSpent: Number(l.actualSpent),
          cashReturned: Number(l.cashReturned),
          discrepancy: Number(l.discrepancy),
          status: l.status,
          notes: l.notes,
          slipPhotoUrl: l.slipPhotoUrl,
          adminSignoffBy: l.adminSignoffBy,
          settledAt: l.settledAt?.toISOString() ?? null,
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
        })),
        summary: {
          totalCashGiven: Number(aggregates._sum.cashGiven || 0),
          totalActualSpent: Number(aggregates._sum.actualSpent || 0),
          totalCashReturned: Number(aggregates._sum.cashReturned || 0),
          totalDiscrepancy: Number(aggregates._sum.discrepancy || 0),
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('[runner-reconcile-GET] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch runner cash ledgers' },
      { status: 500 }
    );
  }
}

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
    const {
      shortlistId,
      runnerId,
      runnerName,
      cashGiven,
      actualSpent = 0,
      cashReturned = 0,
      notes,
      slipPhotoUrl,
    } = body;

    if (!runnerName) {
      return NextResponse.json({ error: 'Runner name is required' }, { status: 400 });
    }

    const parsedCashGiven = Number(cashGiven) || 0;
    const parsedActualSpent = Number(actualSpent) || 0;
    const parsedCashReturned = Number(cashReturned) || 0;

    // Refinement 3: Query runner's previous unsettled discrepancy (running debt/surplus carryover)
    const previousDiscrepantLedgers = await prisma.runnerCashLedger.findMany({
      where: {
        runnerName: { equals: runnerName, mode: 'insensitive' },
        status: 'DISCREPANCY',
      },
      select: { discrepancy: true },
    });
    const previousDue = previousDiscrepantLedgers.reduce((sum, l) => sum + Number(l.discrepancy), 0);
    const effectiveBudget = Number((parsedCashGiven - previousDue).toFixed(2));

    const { discrepancy, status } = calculateRunnerDiscrepancy(
      parsedCashGiven,
      parsedActualSpent,
      parsedCashReturned
    );

    const now = new Date();

    const record = await prisma.runnerCashLedger.create({
      data: {
        shortlistId: shortlistId || null,
        runnerId: runnerId || null,
        runnerName,
        cashGiven: new Prisma.Decimal(parsedCashGiven),
        actualSpent: new Prisma.Decimal(parsedActualSpent),
        cashReturned: new Prisma.Decimal(parsedCashReturned),
        discrepancy: new Prisma.Decimal(discrepancy),
        previousDue: new Prisma.Decimal(previousDue),
        effectiveBudget: new Prisma.Decimal(effectiveBudget),
        status,
        notes: notes || null,
        slipPhotoUrl: slipPhotoUrl || null,
        adminSignoffBy: payload.adminId || 'Admin',
        settledAt: status === 'SETTLED' ? now : null,
      },
    });

    // If shortlistId was linked, update PurchaseShortlist reconciled status
    if (shortlistId) {
      await prisma.purchaseShortlist.updateMany({
        where: { id: shortlistId },
        data: {
          cashGiven: new Prisma.Decimal(parsedCashGiven),
          actualSpent: new Prisma.Decimal(parsedActualSpent),
          cashReturned: new Prisma.Decimal(parsedCashReturned),
          reconciledStatus: status,
          reconciledAt: now,
          reconciledByAdminId: payload.adminId || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        runnerName: record.runnerName,
        cashGiven: parsedCashGiven,
        actualSpent: parsedActualSpent,
        cashReturned: parsedCashReturned,
        discrepancy,
        status,
        settledAt: record.settledAt?.toISOString() ?? null,
      },
    });
  } catch (err: any) {
    console.error('[runner-reconcile-POST] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to record runner cash reconciliation' },
      { status: 500 }
    );
  }
}
