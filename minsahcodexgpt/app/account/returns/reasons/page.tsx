import React from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ReturnReasonMobileView } from '@/components/account/mobile/returns/ReturnReasonMobileView';
import { ReturnItemInfo } from '@/components/account/mobile/returns/types';

export const metadata: Metadata = {
  title: 'Return Reason Selection | Minsah Beauty',
  description: 'Select return reasons, product condition checklist, and initiate pickup.',
};

export default async function ReturnReasonsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login?redirect=/account/returns/reasons');
  }

  // Find the latest completed or shipped order for this user
  const latestOrder = await prisma.order.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED'] },
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const demoItems: ReturnItemInfo[] = latestOrder?.items.length
    ? latestOrder.items.map((item) => ({
        id: item.id,
        productId: item.productId || 'prod-default',
        productName: item.name,
        productSlug: item.productId || 'item',
        productImage: null,
        quantity: item.quantity,
        price: Number(item.price),
        totalPrice: Number(item.total),
        sku: item.sku || 'MB-KR-942',
      }))
    : [
        {
          id: 'item-demo-1',
          productId: 'prod-1',
          productName: 'Beauty of Joseon Relief Sun Rice + Probiotics (50ml)',
          productSlug: 'beauty-of-joseon-relief-sun',
          productImage: '/images/categories/Skincare.png',
          quantity: 1,
          price: 1350,
          totalPrice: 1350,
          sku: 'BOJ-SUN-50ML',
        },
      ];

  const orderData = {
    id: latestOrder?.id || 'demo-order-88294',
    orderNumber: latestOrder?.orderNumber || 'MB-88294-KR',
    items: demoItems,
  };

  return (
    <div className="w-full">
      {/* Mobile Form Factor */}
      <div className="lg:hidden">
        <ReturnReasonMobileView
          order={orderData}
          reason="Formulation / Shade mismatch"
          onReasonChange={() => {}}
          onContinue={() => {}}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
        <ReturnReasonMobileView
          order={orderData}
          reason="Formulation / Shade mismatch"
          onReasonChange={() => {}}
          onContinue={() => {}}
        />
      </div>
    </div>
  );
}
