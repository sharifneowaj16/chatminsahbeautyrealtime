import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import nagad from '@/lib/payments/nagad';
import { buildOrderConfirmedUrl, redirectViaVerifiedPaymentRoute } from '@/lib/payments/verified-redirect';
import {
  decimalToNumber,
  firstField,
  normalizeGatewayStatus,
  pickPaidAt,
  readProviderCallbackFields,
} from '@/lib/payments/provider-callback-utils';

type NagadGatewayResult = Record<string, unknown>;

const NAGAD_ORDER_KEYS = ['orderId', 'order_id', 'merchantOrderId', 'merchant_order_id'];
const NAGAD_PAYMENT_KEYS = [
  'payment_ref_id',
  'paymentReferenceId',
  'payment_reference_id',
  'paymentRefId',
  'payment_refId',
  'paymentID',
  'paymentId',
  'issuerPaymentRefNo',
];
const NAGAD_STATUS_KEYS = ['status', 'paymentStatus', 'transactionStatus', 'statusMessage'];

function normalizeNagadStatusFromResult(result: NagadGatewayResult) {
  const statusCode = String(result.statusCode ?? result.responseCode ?? result.code ?? '').trim();
  const status = normalizeGatewayStatus(
    result.status ?? result.paymentStatus ?? result.transactionStatus ?? result.statusMessage
  );

  if (['000', '0000', '00'].includes(statusCode)) return 'paid';
  if (status !== 'unknown') return status;
  return statusCode ? 'failed' : 'unknown';
}

function getNagadAmount(result: NagadGatewayResult, fallback: unknown) {
  return (
    decimalToNumber(result.amount) ||
    decimalToNumber(result.paymentAmount) ||
    decimalToNumber(result.totalAmount) ||
    decimalToNumber(fallback)
  );
}

function getNagadTransactionId(result: NagadGatewayResult, paymentReferenceId: string) {
  return String(
    result.issuerPaymentRefNo ??
      result.transactionId ??
      result.transactionID ??
      result.paymentReferenceId ??
      paymentReferenceId
  );
}

function getNagadCurrency(result: NagadGatewayResult) {
  const currency = String(result.currency ?? result.currencyCode ?? 'BDT').trim().toUpperCase();
  return currency === '050' ? 'BDT' : currency || 'BDT';
}

function getNagadPaidAt(result: NagadGatewayResult) {
  return pickPaidAt(
    result.paymentDateTime ??
      result.transactionDateTime ??
      result.issuerPaymentDateTime ??
      result.updatedAt
  );
}

async function handleNagadCallback(request: NextRequest) {
  const fields = await readProviderCallbackFields(request);
  const orderId = firstField(fields, NAGAD_ORDER_KEYS);
  const paymentReferenceId = firstField(fields, NAGAD_PAYMENT_KEYS);
  const callbackStatus = normalizeGatewayStatus(firstField(fields, NAGAD_STATUS_KEYS));

  if (!orderId) {
    return NextResponse.redirect(buildOrderConfirmedUrl(request, null, 'missing-order'), { status: 303 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, total: true },
  });

  if (!order) {
    return NextResponse.redirect(buildOrderConfirmedUrl(request, null, 'order-not-found'), { status: 303 });
  }

  if (!paymentReferenceId) {
    return NextResponse.redirect(buildOrderConfirmedUrl(request, order.orderNumber, 'missing-payment-id'), { status: 303 });
  }

  if (callbackStatus === 'cancelled' || callbackStatus === 'failed') {
    return redirectViaVerifiedPaymentRoute(
      request,
      {
        orderId: order.id,
        gateway: 'nagad',
        gatewayTransactionId: paymentReferenceId,
        amount: decimalToNumber(order.total),
        currency: 'BDT',
        status: callbackStatus,
        rawStatus: firstField(fields, NAGAD_STATUS_KEYS) || callbackStatus,
      },
      buildOrderConfirmedUrl(request, order.orderNumber, callbackStatus)
    );
  }

  try {
    const verification = await nagad.verifyPayment(paymentReferenceId) as NagadGatewayResult;
    const status = normalizeNagadStatusFromResult(verification);
    const paid = status === 'paid';

    return redirectViaVerifiedPaymentRoute(
      request,
      {
        orderId: order.id,
        gateway: 'nagad',
        transactionId: getNagadTransactionId(verification, paymentReferenceId),
        gatewayTransactionId: paymentReferenceId,
        amount: getNagadAmount(verification, order.total),
        currency: getNagadCurrency(verification),
        status,
        rawStatus: String(
          verification.status ??
            verification.paymentStatus ??
            verification.transactionStatus ??
            verification.statusMessage ??
            firstField(fields, NAGAD_STATUS_KEYS) ??
            'unknown'
        ),
        paidAt: paid ? getNagadPaidAt(verification) ?? new Date().toISOString() : undefined,
      },
      buildOrderConfirmedUrl(request, order.orderNumber, paid ? 'browser-bridge-unavailable' : status)
    );
  } catch (error) {
    console.warn('Nagad callback verify failed:', {
      paymentReferenceId,
      error: error instanceof Error ? error.message : 'verify_failed',
    });
    return redirectViaVerifiedPaymentRoute(
      request,
      {
        orderId: order.id,
        gateway: 'nagad',
        gatewayTransactionId: paymentReferenceId,
        amount: decimalToNumber(order.total),
        currency: 'BDT',
        status: 'failed',
        rawStatus: error instanceof Error ? error.message : 'verify_failed',
      },
      buildOrderConfirmedUrl(request, order.orderNumber, 'failed')
    );
  }
}

export async function GET(request: NextRequest) {
  return handleNagadCallback(request);
}

export async function POST(request: NextRequest) {
  return handleNagadCallback(request);
}
