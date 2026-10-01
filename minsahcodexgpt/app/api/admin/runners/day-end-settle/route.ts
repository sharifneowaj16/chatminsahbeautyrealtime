// app/api/admin/runners/day-end-settle/route.ts
// Day-End Runner Cash Settlement Aggregator API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
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
    const dateParam = searchParams.get('date');

    const now = new Date();
    const startOfDay = dateParam
      ? new Date(`${dateParam}T00:00:00.000Z`)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = dateParam
      ? new Date(`${dateParam}T23:59:59.999Z`)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Fetch all ledgers for today
    const ledgers = await prisma.runnerCashLedger.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by runner name
    const runnerMap: Record<
      string,
      {
        runnerName: string;
        runnerId: string | null;
        totalTrips: number;
        totalCashGiven: number;
        totalActualSpent: number;
        totalCashReturned: number;
        netDiscrepancy: number;
        pendingCount: number;
        allSettled: boolean;
        ledgerIds: string[];
      }
    > = {};

    for (const l of ledgers) {
      const key = l.runnerName.trim();
      if (!runnerMap[key]) {
        runnerMap[key] = {
          runnerName: key,
          runnerId: l.runnerId,
          totalTrips: 0,
          totalCashGiven: 0,
          totalActualSpent: 0,
          totalCashReturned: 0,
          netDiscrepancy: 0,
          pendingCount: 0,
          allSettled: true,
          ledgerIds: [],
        };
      }

      runnerMap[key].totalTrips++;
      runnerMap[key].totalCashGiven += Number(l.cashGiven);
      runnerMap[key].totalActualSpent += Number(l.actualSpent);
      runnerMap[key].totalCashReturned += Number(l.cashReturned);
      runnerMap[key].netDiscrepancy += Number(l.discrepancy);
      runnerMap[key].ledgerIds.push(l.id);

      if (l.status !== 'SETTLED') {
        runnerMap[key].pendingCount++;
        runnerMap[key].allSettled = false;
      }
    }

    const runnerSummaries = Object.values(runnerMap).map((r) => ({
      ...r,
      totalCashGiven: Number(r.totalCashGiven.toFixed(2)),
      totalActualSpent: Number(r.totalActualSpent.toFixed(2)),
      totalCashReturned: Number(r.totalCashReturned.toFixed(2)),
      netDiscrepancy: Number(r.netDiscrepancy.toFixed(2)),
    }));

    return NextResponse.json({
      success: true,
      data: {
        date: startOfDay.toISOString().split('T')[0],
        totalRunnersActive: runnerSummaries.length,
        totalLedgersToday: ledgers.length,
        runners: runnerSummaries,
      },
    });
  } catch (err: any) {
    console.error('[day-end-settle-GET] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch day-end runner summaries' },
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
    const { runnerName, ledgerIds, notes } = body;

    if (!runnerName && (!Array.isArray(ledgerIds) || ledgerIds.length === 0)) {
      return NextResponse.json({ error: 'runnerName or ledgerIds array is required' }, { status: 400 });
    }

    const now = new Date();
    const whereClause: any = {};
    if (ledgerIds && ledgerIds.length > 0) {
      whereClause.id = { in: ledgerIds };
    } else if (runnerName) {
      whereClause.runnerName = runnerName;
      whereClause.status = { not: 'SETTLED' };
    }

    const updateResult = await prisma.runnerCashLedger.updateMany({
      where: whereClause,
      data: {
        status: 'SETTLED',
        settledAt: now,
        adminSignoffBy: payload.adminId || 'Admin',
        notes: notes ? `${notes} (1-Click Day-End Settled)` : '1-Click Day-End Settled',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully closed and settled ${updateResult.count} runner records for today.`,
      settledCount: updateResult.count,
    });
  } catch (err: any) {
    console.error('[day-end-settle-POST] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to batch settle runner cash records' },
      { status: 500 }
    );
  }
}
