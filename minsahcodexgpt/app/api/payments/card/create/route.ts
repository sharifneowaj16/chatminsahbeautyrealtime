import { NextRequest, NextResponse } from 'next/server';
import sslcommerz from '@/lib/payments/sslcommerz';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, cardData, items, shippingAddress } = body;

    if (!amount || !cardData) {
      return NextResponse.json(
        { success: false, message: 'Amount and card data are required' },
        { status: 400 }
      );
    }

    const orderNumber = `MB${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Initialize SSLCommerz payment
    const payment = await sslcommerz.initPayment({
      amount: Number(amount),
      orderId: orderNumber,
      currency: 'BDT',
      productName: items.map((item: any) => item.name).join(', '),
      productCategory: 'Beauty Products',
      customerName: cardData.holder || shippingAddress?.fullName || 'Customer',
      customerEmail: shippingAddress?.email || 'customer@minsahbeauty.com',
      customerPhone: shippingAddress?.phoneNumber,
      customerAddress: shippingAddress?.address,
      customerCity: shippingAddress?.city,
      customerCountry: 'Bangladesh'
    });

    // Store order in database
    // await db.orders.create({ ... });

    return NextResponse.json({
      success: true,
      sessionKey: payment.sessionkey,
      gatewayURL: payment.GatewayPageURL,
      orderNumber: orderNumber,
      message: 'Payment session created successfully'
    });
  } catch (error) {
    console.error('Card payment API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed'
      },
      { status: 500 }
    );
  }
}
