// app/api/admin/cash-register/route.ts
// Pillar 10: Day-End Cash Register & Drawer Closing Sheet API
// Expected Cash = Opening Cash + COD Collected - Runner Expenses - Office Expenses

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { Prisma } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

function getTodayDhakaDateString(): string {
  const d = new Date();
  // Dhaka is UTC+6
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const dhakaTime = new Date(utc + 3600000 * 6);
  return dhakaTime.toISOString().split('T')[0];
}

// GET: Live cash calculation & current register status for a given date
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
    const date = searchParams.get('date') || getTodayDhakaDateString();

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // Check if register already exists for this date
    const existingRegister = await prisma.dailyCashRegister.findUnique({
      where: { date },
    });

    // 1. Separate delivered COD into:
    // (a) Third-party courier orders (funds held by Steadfast/Pathao awaiting payout)
    // (b) In-house / Direct COD orders (actual physical cash in drawer)
    const codOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        paymentMethod: { contains: 'cod', mode: 'insensitive' },
        updatedAt: { gte: dayStart, lte: dayEnd },
        isTest: false,
      },
      select: {
        id: true,
        total: true,
        steadfastConsignmentId: true,
        pathaoConsignmentId: true,
      },
    });

    let liveInOfficeCodCash = 0;
    let liveCourierDeliveredCod = 0;

    for (const o of codOrders) {
      const orderTotal = Number(o.total);
      if (o.steadfastConsignmentId || o.pathaoConsignmentId) {
        liveCourierDeliveredCod += orderTotal;
      } else {
        liveInOfficeCodCash += orderTotal;
      }
    }

    // 2. Calculate live runner expenses (actual spent on procurement/logistics today)
    const runnerLedgers = await prisma.runnerCashLedger.findMany({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      select: { actualSpent: true, cashGiven: true, cashReturned: true },
    });
    const liveRunnerExpenses = runnerLedgers.reduce((sum, l) => sum + Number(l.actualSpent), 0);

    // Determine opening cash: from existing register, or yesterday's actual cash, or 0
    let openingCash = existingRegister ? Number(existingRegister.openingCash) : 0;
    if (!existingRegister) {
      const yesterday = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const yesterdayRegister = await prisma.dailyCashRegister.findUnique({
        where: { date: yesterday },
      });
      if (yesterdayRegister) {
        openingCash = Number(yesterdayRegister.actualCashCounted);
      }
    }

    const officeExpenses = existingRegister ? Number(existingRegister.officeExpenses) : 0;
    const inOfficeCodCollected = existingRegister && existingRegister.status !== 'OPEN'
      ? Number(existingRegister.codCollected)
      : liveInOfficeCodCash;
    const runnerExpenses = existingRegister && existingRegister.status !== 'OPEN'
      ? Number(existingRegister.runnerExpenses)
      : liveRunnerExpenses;

    const courierSettledBank = existingRegister ? Number(existingRegister.courierSettledBank) : 0;
    const courierPendingReceivables = Math.max(0, liveCourierDeliveredCod - courierSettledBank);

    // Physical Drawer Expected Cash = Opening Float + In-Office Direct COD - Runner Outflows - Office Outflows
    const expectedCash = Number((openingCash + inOfficeCodCollected - runnerExpenses - officeExpenses).toFixed(2));

    return NextResponse.json({
      success: true,
      data: {
        date,
        isClosed: existingRegister ? existingRegister.status !== 'OPEN' : false,
        status: existingRegister?.status || 'OPEN',
        registerId: existingRegister?.id || null,
        openingCash: Number(openingCash.toFixed(2)),
        codCollected: Number(inOfficeCodCollected.toFixed(2)), // in-office direct cash
        courierDeliveredCodTotal: Number(liveCourierDeliveredCod.toFixed(2)),
        courierPendingReceivables: Number(courierPendingReceivables.toFixed(2)),
        courierSettledBank: Number(courierSettledBank.toFixed(2)),
        runnerExpenses: Number(runnerExpenses.toFixed(2)),
        officeExpenses: Number(officeExpenses.toFixed(2)),
        expectedCash,
        actualCashCounted: existingRegister ? Number(existingRegister.actualCashCounted) : expectedCash,
        discrepancy: existingRegister ? Number(existingRegister.discrepancy) : 0,
        notes: existingRegister?.notes || null,
        closedByAdminId: existingRegister?.closedByAdminId || null,
        deliveredCodOrdersCount: codOrders.length,
        inOfficeOrdersCount: codOrders.filter((o) => !o.steadfastConsignmentId && !o.pathaoConsignmentId).length,
        courierDeliveredOrdersCount: codOrders.filter((o) => o.steadfastConsignmentId || o.pathaoConsignmentId).length,
        runnerTripsCount: runnerLedgers.length,
      },
    });
  } catch (err: any) {
    console.error('[cash-register-api] GET Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to calculate daily cash register' },
      { status: 500 }
    );
  }
}

// POST: Close and lock cash register drawer for the day
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
    const date = body.date || getTodayDhakaDateString();

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // Handle Courier Payout Settlement Action
    if (body.action === 'SETTLE_COURIER_PAYOUT') {
      const settleAmount = Number(body.amount || 0);
      if (settleAmount <= 0) {
        return NextResponse.json({ error: 'Valid payout settlement amount is required' }, { status: 400 });
      }

      const existingReg = await prisma.dailyCashRegister.findUnique({
        where: { date },
      });

      const currentSettled = existingReg ? Number(existingReg.courierSettledBank) : 0;
      const nextSettled = currentSettled + settleAmount;

      const updatedReg = await prisma.dailyCashRegister.upsert({
        where: { date },
        create: {
          date,
          openingCash: new Prisma.Decimal(0),
          codCollected: new Prisma.Decimal(0),
          runnerExpenses: new Prisma.Decimal(0),
          officeExpenses: new Prisma.Decimal(0),
          courierPendingReceivables: new Prisma.Decimal(0),
          courierSettledBank: new Prisma.Decimal(nextSettled),
          expectedCash: new Prisma.Decimal(0),
          actualCashCounted: new Prisma.Decimal(0),
          discrepancy: new Prisma.Decimal(0),
          status: 'OPEN',
          notes: body.notes || `Courier bank payout of ৳${settleAmount} recorded.`,
        },
        update: {
          courierSettledBank: new Prisma.Decimal(nextSettled),
          notes: body.notes ? `${existingReg?.notes ? existingReg.notes + ' | ' : ''}${body.notes}` : existingReg?.notes,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully settled ৳${settleAmount} courier payout into bank ledger.`,
        data: {
          date,
          courierSettledBank: Number(updatedReg.courierSettledBank),
        },
      });
    }

    // Standard Day-End Drawer Closing
    const openingCash = Number(body.openingCash || 0);
    const actualCashCounted = Number(body.actualCashCounted ?? 0);
    const officeExpenses = Number(body.officeExpenses || 0);
    const notes = body.notes ? String(body.notes).trim() : null;

    // Live COD sum partitioned into in-office vs courier
    const codOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        paymentMethod: { contains: 'cod', mode: 'insensitive' },
        updatedAt: { gte: dayStart, lte: dayEnd },
        isTest: false,
      },
      select: {
        total: true,
        steadfastConsignmentId: true,
        pathaoConsignmentId: true,
      },
    });

    let liveInOfficeCodCash = 0;
    let liveCourierDeliveredCod = 0;

    for (const o of codOrders) {
      const orderTotal = Number(o.total);
      if (o.steadfastConsignmentId || o.pathaoConsignmentId) {
        liveCourierDeliveredCod += orderTotal;
      } else {
        liveInOfficeCodCash += orderTotal;
      }
    }

    // Live runner expenses
    const runnerLedgers = await prisma.runnerCashLedger.findMany({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      select: { actualSpent: true },
    });
    const runnerExpenses = runnerLedgers.reduce((sum, l) => sum + Number(l.actualSpent), 0);

    const existingReg = await prisma.dailyCashRegister.findUnique({ where: { date } });
    const courierSettledBank = existingReg ? Number(existingReg.courierSettledBank) : 0;
    const courierPendingReceivables = Math.max(0, liveCourierDeliveredCod - courierSettledBank);

    // Expected Drawer Cash = Opening Float + In-Office Direct COD - Runner Outflows - Office Outflows
    const expectedCash = Number((openingCash + liveInOfficeCodCash - runnerExpenses - officeExpenses).toFixed(2));
    const discrepancy = Number((actualCashCounted - expectedCash).toFixed(2));
    const status = Math.abs(discrepancy) < 0.01 ? 'CLOSED' : 'DISCREPANCY';

    const register = await prisma.dailyCashRegister.upsert({
      where: { date },
      create: {
        date,
        openingCash: new Prisma.Decimal(openingCash),
        codCollected: new Prisma.Decimal(liveInOfficeCodCash),
        runnerExpenses: new Prisma.Decimal(runnerExpenses),
        officeExpenses: new Prisma.Decimal(officeExpenses),
        courierPendingReceivables: new Prisma.Decimal(courierPendingReceivables),
        courierSettledBank: new Prisma.Decimal(courierSettledBank),
        expectedCash: new Prisma.Decimal(expectedCash),
        actualCashCounted: new Prisma.Decimal(actualCashCounted),
        discrepancy: new Prisma.Decimal(discrepancy),
        status,
        closedByAdminId: payload.adminId ?? null,
        notes,
      },
      update: {
        openingCash: new Prisma.Decimal(openingCash),
        codCollected: new Prisma.Decimal(liveInOfficeCodCash),
        runnerExpenses: new Prisma.Decimal(runnerExpenses),
        officeExpenses: new Prisma.Decimal(officeExpenses),
        courierPendingReceivables: new Prisma.Decimal(courierPendingReceivables),
        courierSettledBank: new Prisma.Decimal(courierSettledBank),
        expectedCash: new Prisma.Decimal(expectedCash),
        actualCashCounted: new Prisma.Decimal(actualCashCounted),
        discrepancy: new Prisma.Decimal(discrepancy),
        status,
        closedByAdminId: payload.adminId ?? null,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        status === 'CLOSED'
          ? 'Cash register closed successfully with zero discrepancy.'
          : `Cash register closed with discrepancy of ৳${discrepancy}.`,
      data: {
        id: register.id,
        date: register.date,
        openingCash: Number(register.openingCash),
        codCollected: Number(register.codCollected),
        courierPendingReceivables: Number(register.courierPendingReceivables),
        courierSettledBank: Number(register.courierSettledBank),
        runnerExpenses: Number(register.runnerExpenses),
        officeExpenses: Number(register.officeExpenses),
        expectedCash: Number(register.expectedCash),
        actualCashCounted: Number(register.actualCashCounted),
        discrepancy: Number(register.discrepancy),
        status: register.status,
        closedByAdminId: register.closedByAdminId,
        notes: register.notes,
      },
    });
  } catch (err: any) {
    console.error('[cash-register-api] POST Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to close daily cash register' },
      { status: 500 }
    );
  }
}
