import prisma from '@/lib/prisma';

async function main() {
  const targetId = 'cmwianw5e000j01oacb7se6zp';
  const targetNum = '1611202602';

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: targetId },
        { orderNumber: targetNum },
        { orderNumber: `#${targetNum}` },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      items: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          name: true,
          sku: true,
          quantity: true,
          price: true,
          product: { select: { sku: true } },
          variant: { select: { sku: true } },
        },
      },
      metaEventOutbox: {
        select: {
          id: true,
          eventName: true,
          eventId: true,
          safePayload: true,
        },
      },
    },
  });

  if (!order) {
    console.log(`Order ${targetNum} (${targetId}) not found in current connected database.`);
    return;
  }

  console.log(`Found order #${order.orderNumber} (${order.id}) with ${order.items.length} items`);

  const catalogItems = order.items.map((item) => {
    const variantSku = item.variant?.sku?.trim() || null;
    const productSku = item.product?.sku?.trim() || item.sku?.trim() || null;
    const canonicalSku = variantSku || item.sku?.trim() || productSku || undefined;
    return {
      name: item.name,
      sku: canonicalSku,
      productSku: productSku ?? canonicalSku,
      variantSku: variantSku ?? null,
      quantity: item.quantity,
      price: Number(item.price),
    };
  });

  const resolvedSkus = catalogItems
    .map((item) => item.sku)
    .filter((sku): sku is string => Boolean(sku));

  const contents = catalogItems.map((item) => ({
    id: item.sku,
    quantity: item.quantity,
    item_price: item.price,
  }));

  console.log('Resolved SKUs:', resolvedSkus);
  console.log('Contents:', contents);

  for (const outbox of order.metaEventOutbox) {
    console.log(`Processing outbox row ${outbox.id} (${outbox.eventName} - ${outbox.eventId})...`);
    const currentSafePayload = (outbox.safePayload && typeof outbox.safePayload === 'object')
      ? (outbox.safePayload as Record<string, unknown>)
      : {};

    const updatedSafePayload = {
      ...currentSafePayload,
      content_type: currentSafePayload.content_type ?? 'product',
      content_ids: resolvedSkus,
      contents: contents,
      skus: resolvedSkus,
      content_id_count: resolvedSkus.length,
      contents_count: contents.length,
      num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    };

    await prisma.metaEventOutbox.update({
      where: { id: outbox.id },
      data: {
        safePayload: updatedSafePayload,
      },
    });

    console.log(`Updated outbox row ${outbox.id} with safePayload:`, JSON.stringify(updatedSafePayload, null, 2));
  }

  console.log('Backfill completed successfully!');
}

main()
  .catch((err) => {
    console.error('Backfill script error:', err);
  })
  .finally(() => prisma.$disconnect());
