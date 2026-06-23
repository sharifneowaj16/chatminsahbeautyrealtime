import type { Prisma } from '@/generated/prisma/client';

const ORDER_NUMBER_TIME_ZONE = 'Asia/Dhaka';

function getDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ORDER_NUMBER_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);

  return {
    day: parts.find((part) => part.type === 'day')?.value ?? '01',
    month: parts.find((part) => part.type === 'month')?.value ?? '01',
    year: parts.find((part) => part.type === 'year')?.value ?? '1970',
  };
}

export function buildDailyOrderNumberPrefix(date = new Date()): string {
  const { day, month, year } = getDateParts(date);
  return `${day}${month}${year}`;
}

function extractSerial(orderNumber: string, prefix: string): number | null {
  if (!orderNumber.startsWith(prefix)) {
    return null;
  }

  const suffix = orderNumber.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) {
    return null;
  }

  const serial = Number.parseInt(suffix, 10);
  return Number.isFinite(serial) && serial > 0 ? serial : null;
}

export async function generateDailyOrderNumber(
  tx: Prisma.TransactionClient,
  date = new Date()
): Promise<string> {
  const prefix = buildDailyOrderNumberPrefix(date);
  const lockKey = `order-number:${prefix}`;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

  const todaysOrders = await tx.order.findMany({
    where: { orderNumber: { startsWith: prefix } },
    select: { orderNumber: true },
  });

  const maxSerial = todaysOrders.reduce((max, order) => {
    const serial = extractSerial(order.orderNumber, prefix);
    return serial && serial > max ? serial : max;
  }, 0);

  return `${prefix}${String(maxSerial + 1).padStart(2, '0')}`;
}
