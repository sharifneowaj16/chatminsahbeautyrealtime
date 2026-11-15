import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
try {
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

async function main() {
  const { default: prisma } = await import('../lib/prisma');
  const { createMetaPurchaseOutbox } = await import('../lib/meta/capi/purchase-outbox');
  const { processMetaOutboxById } = await import('../lib/meta/capi/sender');
  const orderId = 'cmwi80aee001j01mh874b99qh';
  console.log(`Checking order ${orderId}...`);

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: orderId },
        { orderNumber: '1611202601' },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      phoneConfirmedAt: true,
      metaPurchaseSent: true,
      isTest: true,
      trackingConsent: true,
      trackingConsentVersion: true,
      nonEssentialTrackingAllowed: true,
    },
  });

  console.log('Order state:', order);
  if (!order) {
    console.error('Order not found!');
    return;
  }

  // Check outbox rows for this order
  const existingRows = await prisma.metaEventOutbox.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${existingRows.length} outbox rows for order.`);
  for (const row of existingRows) {
    console.log(`Row ${row.id}: status=${row.status}, attempts=${row.attempts}`);
  }

  // Find or create outbox row
  let targetOutboxId: string;
  const retryableRow = existingRows.find(
    (r) => r.eventName === 'Purchase'
  );

  if (retryableRow) {
    console.log(`Resetting outbox row ${retryableRow.id} to PENDING...`);
    await prisma.metaEventOutbox.update({
      where: { id: retryableRow.id },
      data: {
        status: 'PENDING',
        attempts: 0,
        leaseToken: null,
        leaseExpiresAt: null,
        nextAttemptAt: new Date(),
      },
    });
    targetOutboxId = retryableRow.id;
  } else {
    console.log('Creating fresh outbox row for purchase...');
    const outbox = await createMetaPurchaseOutbox({
      purchaseType: 'cod_purchase',
      orderId: order.id,
      eventTime: order.phoneConfirmedAt ?? new Date(),
      sourceType: 'REPLAY_ORDER_SCRIPT',
    });
    targetOutboxId = outbox.record.id;
  }

  console.log(`Processing outbox ID: ${targetOutboxId}...`);
  const result = await processMetaOutboxById({ outboxId: targetOutboxId });
  console.log('processMetaOutboxById result:', result);

  const finalOrder = await prisma.order.findUnique({
    where: { id: order.id },
    select: { id: true, metaPurchaseSent: true, metaEventId: true },
  });
  console.log('Updated order state:', finalOrder);

  const finalOutbox = await prisma.metaEventOutbox.findUnique({
    where: { id: targetOutboxId },
    select: { id: true, status: true, attempts: true, lastError: true, statusEvents: { take: 5, orderBy: { createdAt: 'desc' } } },
  });
  console.log('Final outbox state:', finalOutbox);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Replay script error:', err);
});
