import { NextRequest, NextResponse } from 'next/server';
import bkash from '@/lib/payments/bkash';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, phoneNumber, items, shippingAddress } = body;

    // Validate required fields
    if (!amount || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Amount and phone number are required' },
        { status: 400 }
      );
    }

    // Generate unique order number
    const orderNumber = `MB${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create payment with bKash
    const payment = await bkash.createPayment({
      amount: Number(amount),
      orderNumber: orderNumber,
      intent: 'sale'
    });

    // Store order details in database (implement your DB logic here)
    // await db.orders.create({
    //   orderNumber,
    //   amount,
    //   paymentMethod: 'bkash',
    //   paymentID: payment.paymentID,
    //   items,
    //   shippingAddress,
    //   status: 'pending'
    // });

    return NextResponse.json({
      success: true,
      paymentID: payment.paymentID,
      bkashURL: payment.bkashURL,
      orderNumber: orderNumber,
      message: 'Payment initiated successfully'
    });
  } catch (error) {
    console.error('bKash payment API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed'
      },
      { status: 500 }
    );
  }
}
