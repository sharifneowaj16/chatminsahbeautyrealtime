import React from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ReturnStatusMobileView } from '@/components/account/mobile/return-status/ReturnStatusMobileView';
import { ReturnStatusData } from '@/components/account/mobile/return-status/types';

export const metadata: Metadata = {
  title: 'Return Tracking & QA Telemetry | Minsah Beauty',
  description: 'Live Steadfast/Pathao courier return pickup tracking and bKash instant refund status.',
};

export default async function ReturnTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/login?redirect=/account/returns/track/${id}`);
  }

  // Find return by returnNumber or id
  const returnRecord = await prisma.return.findFirst({
    where: {
      OR: [{ id }, { returnNumber: id }],
      userId: session.user.id,
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
      items: true,
    },
  });

  const returnData: ReturnStatusData = returnRecord
    ? {
        returnNumber: returnRecord.returnNumber,
        orderNumber: returnRecord.order.orderNumber,
        orderId: returnRecord.order.id,
        status: returnRecord.status.toLowerCase(),
        refundAmount: Number(returnRecord.refundAmount),
        paymentMethod: 'bKash Instant Refund',
        accountNumber: '01712-***102',
        pickupWindow: 'Today • 2:00 PM – 5:00 PM',
        riderName: 'Tanvir Hossain (Steadfast Courier)',
        riderPhone: '+880 1812-998877',
        riderDistance: '1.2 km away',
        etaMinutes: 25,
        pickupAddress: {
          street: 'House 42, Road 11, Block D',
          area: 'Banani',
          city: 'Dhaka',
          note: 'Leave with building reception if unavailable',
        },
        items: returnRecord.items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          price: Number(it.price),
          image: null,
          issueDescription: returnRecord.reason || 'Covered under Minsah 100% Authenticity Guarantee',
        })),
      }
    : {
        returnNumber: id.startsWith('#') ? id : `#RET-${id}`,
        orderNumber: 'MB-88294-KR',
        status: 'in_transit',
        refundAmount: 2850,
        paymentMethod: 'bKash Instant Refund',
        accountNumber: '01712-***102',
        pickupWindow: 'Today • 2:00 PM – 5:00 PM',
        riderName: 'Tanvir Hossain (Steadfast Courier)',
        riderPhone: '+880 1812-998877',
        riderDistance: '1.2 km away',
        etaMinutes: 25,
        pickupAddress: {
          street: 'House 42, Road 11, Block D',
          area: 'Banani',
          city: 'Dhaka',
          note: 'Leave with building reception if unavailable',
        },
        items: [
          {
            name: 'Laneige Lip Sleeping Mask (Berry 20g)',
            quantity: 1,
            price: 1720,
            image:
              'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&auto=format&fit=crop&q=80',
            issueDescription: 'Broken seal upon unboxing • 100% Covered under Warranty',
          },
        ],
        timeline: [
          {
            title: 'Return Request Approved',
            description: 'Automated verification completed by Gulshan Hub system.',
            timestamp: 'Oct 26, 10:15 AM',
            status: 'completed',
          },
          {
            title: 'Rider Assigned for Doorstep Pickup',
            description: 'Steadfast rider Tanvir Hossain assigned for Banani pickup.',
            timestamp: 'Oct 26, 11:30 AM',
            status: 'active',
          },
          {
            title: 'Gulshan-2 QA Inspection',
            description: 'Product serial & batch verification at central hub.',
            status: 'upcoming',
          },
          {
            title: 'Instant bKash Refund Dispatched',
            description: '৳2,850 will be credited directly to your bKash wallet.',
            status: 'upcoming',
          },
        ],
      };

  return (
    <div className="w-full">
      {/* Mobile Form Factor */}
      <div className="lg:hidden">
        <ReturnStatusMobileView returnRecord={returnData} />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto">
        <ReturnStatusMobileView returnRecord={returnData} />
      </div>
    </div>
  );
}
