import { NextRequest, NextResponse } from 'next/server';
import nagad from '@/lib/payments/nagad';

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
    const callbackURL = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/nagad/callback`;

    // Initialize Nagad payment
    const payment = await nagad.initializePayment({
      amount: Number(amount),
      orderId: orderNumber,
      productDetails: items.map((item: any) => item.name).join(', '),
      merchantCallbackURL: callbackURL
    });

    // Store order in database
    // await db.orders.create({ ... });

    return NextResponse.json({
      success: true,
      paymentID: payment.paymentReferenceId,
      nagadURL: payment.callbackURL,
      orderNumber: orderNumber,
      message: 'Payment initiated successfully'
    });
  } catch (error) {
    console.error('Nagad payment API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed'
      },
      { status: 500 }
    );
  }
}
