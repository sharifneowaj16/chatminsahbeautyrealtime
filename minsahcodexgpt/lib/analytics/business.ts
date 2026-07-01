export type DateRangeKey = '7d' | '30d' | '90d';

export const DATE_RANGE_DAYS: Record<DateRangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function parseDateRange(value: string | null): DateRangeKey {
  if (value === '7d' || value === '30d' || value === '90d') {
    return value;
  }
  return '30d';
}

export function getDateWindow(range: DateRangeKey, now = new Date()) {
  const days = DATE_RANGE_DAYS[range];
  const end = new Date(now);
  const start = new Date(end);
  start.setDate(start.getDate() - days);

  const previousEnd = new Date(start);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days);

  return { range, days, start, end, previousStart, previousEnd };
}

export function decimalToNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundRate(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 100;
}

export function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return roundRate(((current - previous) / previous) * 100);
}

export function safeRatio(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

export function safePercent(numerator: number, denominator: number): number {
  return roundRate(safeRatio(numerator, denominator) * 100);
}

export function parseAdSpend(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function roas(revenue: number, adSpend: number | null): number | null {
  if (!adSpend || adSpend <= 0) return null;
  return Math.round((revenue / adSpend + Number.EPSILON) * 100) / 100;
}

export type MinimalOrderSignal = {
  status: string;
  paymentStatus: string;
  phoneConfirmedAt: Date | null;
  paymentPaidAt: Date | null;
  paidAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  returnedAt: Date | null;
  courierDeliveredAt?: Date | null;
  courierReturnedAt?: Date | null;
};

export function isConfirmedOrder(order: MinimalOrderSignal): boolean {
  return Boolean(
    order.phoneConfirmedAt ||
      order.paymentPaidAt ||
      order.paidAt ||
      order.paymentStatus === 'COMPLETED' ||
      order.status === 'CONFIRMED' ||
      order.status === 'PROCESSING' ||
      order.status === 'SHIPPED' ||
      order.status === 'DELIVERED'
  );
}

export function isDeliveredOrder(order: MinimalOrderSignal): boolean {
  return Boolean(
    order.deliveredAt ||
      order.courierDeliveredAt ||
      order.status === 'DELIVERED'
  );
}

export function isCancelledOrder(order: MinimalOrderSignal): boolean {
  return Boolean(order.cancelledAt || order.status === 'CANCELLED');
}

export function isReturnedOrder(order: MinimalOrderSignal): boolean {
  return Boolean(
    order.returnedAt ||
      order.courierReturnedAt ||
      order.status === 'REFUNDED' ||
      order.paymentStatus === 'REFUNDED'
  );
}

export function buildDailySeries(start: Date, end: Date) {
  const days: Array<{ date: string; orders: number; confirmedRevenue: number; deliveredRevenue: number }> = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const stop = new Date(end);
  stop.setHours(0, 0, 0, 0);

  while (cursor <= stop) {
    days.push({
      date: cursor.toISOString().slice(0, 10),
      orders: 0,
      confirmedRevenue: 0,
      deliveredRevenue: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function productGrade(input: {
  confirmedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  deliveredRevenue: number;
  estimatedGrossProfit: number | null;
}) {
  const deliveryRate = safeRatio(input.deliveredOrders, input.confirmedOrders);
  const cancelRate = safeRatio(input.cancelledOrders, Math.max(input.confirmedOrders + input.cancelledOrders, 1));
  const returnRate = safeRatio(input.returnedOrders, input.deliveredOrders);

  if (
    input.confirmedOrders >= 3 &&
    input.deliveredRevenue > 0 &&
    deliveryRate >= 0.75 &&
    returnRate <= 0.1 &&
    (input.estimatedGrossProfit === null || input.estimatedGrossProfit >= 0)
  ) {
    return 'A';
  }

  if (
    input.confirmedOrders >= 2 &&
    deliveryRate >= 0.5 &&
    returnRate <= 0.2 &&
    cancelRate <= 0.35 &&
    (input.estimatedGrossProfit === null || input.estimatedGrossProfit >= 0)
  ) {
    return 'B';
  }

  if (
    returnRate >= 0.35 ||
    cancelRate >= 0.5 ||
    (input.estimatedGrossProfit !== null && input.deliveredRevenue > 0 && input.estimatedGrossProfit < 0)
  ) {
    return 'D';
  }

  return 'C';
}
