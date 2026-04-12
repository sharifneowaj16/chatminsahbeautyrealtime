import { NextRequest, NextResponse } from 'next/server';
import bkash from '@/lib/payments/bkash';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentID } = body;

    if (!paymentID) {
      return NextResponse.json(
        { success: false, message: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Execute payment
    const result = await bkash.executePayment(paymentID);

    // Update order status in database
    // await db.orders.update({
    //   where: { paymentID },
    //   data: {
    //     status: 'completed',
    //     transactionID: result.trxID,
    //     completedAt: new Date()
    //   }
    // });

    return NextResponse.json({
      success: true,
      transactionID: result.trxID,
      message: 'Payment completed successfully'
    });
  } catch (error) {
    console.error('bKash execute error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Payment execution failed'
      },
      { status: 500 }
    );
  }
}
