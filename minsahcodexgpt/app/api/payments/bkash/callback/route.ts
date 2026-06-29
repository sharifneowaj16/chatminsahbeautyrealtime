import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bkash from '@/lib/payments/bkash';
import { buildOrderConfirmedUrl, redirectViaVerifiedPaymentRoute } from '@/lib/payments/verified-redirect';
import {
  decimalToNumber,
  firstField,
  normalizeGatewayStatus,
  pickPaidAt,
  readProviderCallbackFields,
} from '@/lib/payments/provider-callback-utils';

type BkashGatewayResult = Record<string, unknown>;

const BKASH_ORDER_KEYS = ['orderId', 'order_id', 'merchantInvoiceNumber', 'merchant_invoice_number'];
const BKASH_PAYMENT_KEYS = ['paymentID', 'paymentId', 'payment_id', 'paymentID'.toLowerCase()];
const BKASH_STATUS_KEYS = ['status', 'transactionStatus', 'paymentStatus', 'statusMessage'];

function normalizeBkashStatusFromResult(result: BkashGatewayResult) {
  const statusCode = String(result.statusCode ?? '').trim();
  const status = normalizeGatewayStatus(
    result.transactionStatus ?? result.paymentStatus ?? result.status ?? result.statusMessage
  );

  if (statusCode === '0000') return 'paid';
  if (['2029', '2047', '2062'].includes(statusCode)) return 'cancelled';
  if (status !== 'unknown') return status;
  return statusCode ? 'failed' : 'unknown';
}

function isPaidBkashResult(result: BkashGatewayResult) {
  return normalizeBkashStatusFromResult(result) === 'paid';
}

function getBkashAmount(result: BkashGatewayResult, fallback: unknown) {
  return (
    decimalToNumber(result.amount) ||
    decimalToNumber(result.paidAmount) ||
    decimalToNumber(result.transactionAmount) ||
    decimalToNumber(fallback)
  );
}

function getBkashCurrency(result: BkashGatewayResult) {
  const currency = String(result.currency ?? result.currencyCode ?? 'BDT').trim().toUpperCase();
  return currency === '050' ? 'BDT' : currency || 'BDT';
}

function getBkashTransactionId(result: BkashGatewayResult, paymentID: string) {
  return String(result.trxID ?? result.trxId ?? result.transactionId ?? result.transactionID ?? paymentID);
}

function getBkashPaidAt(result: BkashGatewayResult) {
  return pickPaidAt(
    result.paymentExecuteTime ??
      result.transactionDateTime ??
      result.completedTime ??
      result.createTime
  );
}

async function executeOrQueryBkash(paymentID: string): Promise<BkashGatewayResult> {
  let executeResult: BkashGatewayResult | null = null;

  try {
    if ('executePaymentRaw' in bkash && typeof bkash.executePaymentRaw === 'function') {
      executeResult = await bkash.executePaymentRaw(paymentID) as BkashGatewayResult;
    } else {
      executeResult = await bkash.executePayment(paymentID) as BkashGatewayResult;
    }
  } catch (error) {
    console.warn('bKash callback execute failed; trying queryPayment fallback:', {
      paymentID,
      error: error instanceof Error ? error.message : 'execute_failed',
    });
  }

  if (executeResult && isPaidBkashResult(executeResult)) {
    return executeResult;
  }

  try {
    const queryResult = await bkash.queryPayment(paymentID) as BkashGatewayResult;
    if (queryResult && Object.keys(queryResult).length > 0) {
      return queryResult;
    }
  } catch (error) {
    console.warn('bKash callback queryPayment fallback failed:', {
      paymentID,
      error: error instanceof Error ? error.message : 'query_failed',
    });
  }

  return executeResult ?? {};
}

async function handleBkashCallback(request: NextRequest) {
  const fields = await readProviderCallbackFields(request);
  const orderId = firstField(fields, BKASH_ORDER_KEYS);
  const paymentID = firstField(fields, BKASH_PAYMENT_KEYS);
  const callbackStatus = normalizeGatewayStatus(firstField(fields, BKASH_STATUS_KEYS));

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

  if (!paymentID) {
    return NextResponse.redirect(buildOrderConfirmedUrl(request, order.orderNumber, 'missing-payment-id'), { status: 303 });
  }

  if (callbackStatus === 'cancelled' || callbackStatus === 'failed') {
    return redirectViaVerifiedPaymentRoute(
      request,
      {
        orderId: order.id,
        gateway: 'bkash',
        gatewayTransactionId: paymentID,
        amount: decimalToNumber(order.total),
        currency: 'BDT',
        status: callbackStatus,
        rawStatus: firstField(fields, BKASH_STATUS_KEYS) || callbackStatus,
      },
      buildOrderConfirmedUrl(request, order.orderNumber, callbackStatus)
    );
  }

  const result = await executeOrQueryBkash(paymentID);
  const normalizedResultStatus = normalizeBkashStatusFromResult(result);
  const paid = normalizedResultStatus === 'paid';
  const transactionId = getBkashTransactionId(result, paymentID);
  const rawStatus = String(
    result.transactionStatus ??
      result.paymentStatus ??
      result.statusMessage ??
      result.status ??
      firstField(fields, BKASH_STATUS_KEYS) ??
      normalizedResultStatus
  );

  return redirectViaVerifiedPaymentRoute(
    request,
    {
      orderId: order.id,
      gateway: 'bkash',
      transactionId,
      gatewayTransactionId: paymentID,
      amount: getBkashAmount(result, order.total),
      currency: getBkashCurrency(result),
      status: paid ? 'paid' : normalizedResultStatus,
      rawStatus,
      paidAt: paid ? getBkashPaidAt(result) ?? new Date().toISOString() : undefined,
    },
    buildOrderConfirmedUrl(
      request,
      order.orderNumber,
      paid ? 'browser-bridge-unavailable' : normalizedResultStatus
    )
  );
}

export async function GET(request: NextRequest) {
  return handleBkashCallback(request);
}

export async function POST(request: NextRequest) {
  return handleBkashCallback(request);
}
