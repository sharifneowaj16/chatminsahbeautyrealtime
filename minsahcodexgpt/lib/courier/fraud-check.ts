// lib/courier/fraud-check.ts
// Customer Return Risk & Delivery Fraud Scoring Engine
// Integrates local order delivery history + Steadfast Courier Fraud Check API

import prisma from '@/lib/prisma';

export interface CustomerFraudRiskResult {
  phone: string;
  fraudRiskScore: number; // 0 to 100
  fraudRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  details: {
    totalOrders: number;
    deliveredCount: number;
    cancelledCount: number;
    returnedCount: number;
    successRate: number; // percentage
    steadfastHistory?: {
      total_parcels?: number;
      delivered_parcels?: number;
      cancelled_parcels?: number;
    };
    riskReason: string;
  };
}

/**
 * Check customer delivery fraud risk by phone number
 */
export async function evaluateCustomerFraudRisk(phone: string): Promise<CustomerFraudRiskResult> {
  const normalizedPhone = phone.trim().replace(/^\+88/, '').replace(/^88/, '');

  // 1. Check local order delivery history
  const localOrders = await prisma.order.findMany({
    where: {
      OR: [
        { shippingAddress: { phone: { contains: normalizedPhone } } },
        { user: { phone: { contains: normalizedPhone } } },
      ],
      isTest: false,
    },
    select: {
      id: true,
      status: true,
      deliveredAt: true,
      cancelledAt: true,
      returnedAt: true,
    },
  });

  const totalOrders = localOrders.length;
  let deliveredCount = 0;
  let cancelledCount = 0;
  let returnedCount = 0;

  for (const o of localOrders) {
    if (o.status === 'DELIVERED') deliveredCount++;
    else if (o.status === 'CANCELLED') cancelledCount++;
    else if (o.status === 'REFUNDED' || o.returnedAt != null) returnedCount++;
  }

  const successRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 100;

  // 2. Query Steadfast Courier Fraud Check API if credentials exist
  let steadfastData: any = null;
  const apiKey = process.env.STEADFAST_API_KEY;
  const secretKey = process.env.STEADFAST_SECRET_KEY;

  if (apiKey && secretKey) {
    try {
      const res = await fetch(`https://portal.packzy.com/api/v1/fraud_check/${normalizedPhone}`, {
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        steadfastData = json?.data || json;
      }
    } catch {
      // Graceful fallback to local history
    }
  }

  // 3. Compute Risk Score (0 = safest, 100 = highest risk)
  let riskScore = 15; // default low baseline for new customers
  let riskReason = 'নতুন বা স্বাভাবিক বিশ্বস্ত কাস্টমার';

  if (totalOrders >= 2 && successRate < 50) {
    riskScore = 85;
    riskReason = `পূর্ববর্তী অর্ডারের সাকসেস রেট মাত্র ${successRate}% (অর্ডার ড্রপের উচ্চ ঝুঁকি)`;
  } else if (totalOrders >= 2 && successRate < 75) {
    riskScore = 55;
    riskReason = `পূর্ববর্তী অর্ডারের সাকসেস রেট ${successRate}% (মাঝারি ঝুঁকি)`;
  } else if (steadfastData && steadfastData.total_parcels > 3) {
    const courierDelivered = Number(steadfastData.delivered_parcels) || 0;
    const courierTotal = Number(steadfastData.total_parcels) || 1;
    const courierRate = Math.round((courierDelivered / courierTotal) * 100);

    if (courierRate < 50) {
      riskScore = Math.max(riskScore, 85);
      riskReason = `কুরিয়ারে পূর্ববর্তী ডেলিভারি সাকসেস মাত্র ${courierRate}% (ভুয়া অর্ডারের উচ্চ ঝুঁকি)`;
    } else if (courierRate < 70) {
      riskScore = Math.max(riskScore, 50);
      riskReason = `কুরিয়ারে ডেলিভারি সাকসেস রেট ${courierRate}%`;
    }
  }

  const fraudRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    riskScore >= 75 ? 'HIGH' : riskScore >= 45 ? 'MEDIUM' : 'LOW';

  return {
    phone,
    fraudRiskScore: riskScore,
    fraudRiskLevel,
    details: {
      totalOrders,
      deliveredCount,
      cancelledCount,
      returnedCount,
      successRate,
      steadfastHistory: steadfastData,
      riskReason,
    },
  };
}
