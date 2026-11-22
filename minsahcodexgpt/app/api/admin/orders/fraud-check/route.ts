// app/api/admin/orders/fraud-check/route.ts
// Courier Return Risk & Customer Delivery Verification API (Steadfast + Pathao + Local History)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { evaluateCustomerFraudRisk } from '@/lib/courier/fraud-check';

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
    const phone = searchParams.get('phone');
    const orderId = searchParams.get('orderId');
    const refresh = searchParams.get('refresh') === 'true';

    let targetPhone = phone;

    if (!targetPhone && orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { shippingAddress: true, user: true },
      });
      targetPhone = order?.shippingAddress?.phone || order?.user?.phone || null;
    }

    if (!targetPhone) {
      return NextResponse.json({ error: 'Phone or orderId is required' }, { status: 400 });
    }

    const result = await evaluateCustomerFraudRisk(targetPhone, {
      excludeOrderId: orderId,
      bypassCache: refresh,
    });

    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          fraudRiskScore: result.fraudRiskScore,
          fraudRiskLevel: result.fraudRiskLevel,
          fraudRiskDetails: result.details as any,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        fraudRiskDetails: result.details,
      },
    });
  } catch (err: any) {
    console.error('[fraud-check-GET] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to evaluate customer fraud risk' },
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
    const { orderIds, refresh } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds array is required' }, { status: 400 });
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { shippingAddress: true, user: true },
    });

    const evaluatedOrders = [];
    for (const order of orders) {
      const phone = order.shippingAddress?.phone || order.user?.phone;
      if (!phone) continue;

      const risk = await evaluateCustomerFraudRisk(phone, {
        excludeOrderId: order.id,
        bypassCache: Boolean(refresh),
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          fraudRiskScore: risk.fraudRiskScore,
          fraudRiskLevel: risk.fraudRiskLevel,
          fraudRiskDetails: risk.details as any,
        },
      });

      evaluatedOrders.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        phone,
        fraudRiskLevel: risk.fraudRiskLevel,
        fraudRiskScore: risk.fraudRiskScore,
        fraudRiskDetails: risk.details,
      });
    }

    return NextResponse.json({
      success: true,
      evaluatedCount: evaluatedOrders.length,
      data: evaluatedOrders,
    });
  } catch (err: any) {
    console.error('[fraud-check-POST] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to batch evaluate order fraud risk' },
      { status: 500 }
    );
  }
}
