import { NextRequest, NextResponse } from 'next/server';
import rocket from '@/lib/payments/rocket';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, phoneNumber, items, shippingAddress } = body;

    if (!amount || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Amount and phone number are required' },
        { status: 400 }
      );
    }

    const orderNumber = `MB${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create Rocket payment
    const payment = await rocket.createPayment({
      amount: Number(amount),
      orderId: orderNumber,
      customerMobile: phoneNumber,
      description: items.map((item: any) => item.name).join(', ')
    });

    // Store order in database
    // await db.orders.create({ ... });

    return NextResponse.json({
      success: true,
      paymentID: payment.paymentID,
      rocketURL: payment.rocketURL,
      orderNumber: orderNumber,
      message: 'Payment initiated successfully'
    });
  } catch (error) {
    console.error('Rocket payment API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed'
      },
      { status: 500 }
    );
  }
}
