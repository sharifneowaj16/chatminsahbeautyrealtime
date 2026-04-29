import { NextRequest, NextResponse } from 'next/server';
import { pathaoRequest } from '@/lib/pathao';
import prisma from '@/lib/prisma';
import {
  extractVariantWeightKg,
  parseWeightToKg,
  resolvePackagingWeightKg,
} from '@/lib/buy-now';

export const dynamic = 'force-dynamic';

interface PriceRequestBody {
  totalWeightKg?: number;
  items?: Array<{ productId: string; variantId?: string | null; quantity: number }>;
  address?: {
    pathao_city_id?: number | null;
    pathao_zone_id?: number | null;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PriceRequestBody;
    const storeId = Number(process.env.PATHAO_STORE_ID);
    let totalWeightKg = Number(body.totalWeightKg ?? 0);
    const recipientCity = Number(body.address?.pathao_city_id);
    const recipientZone = Number(body.address?.pathao_zone_id);

    if (!storeId || !recipientCity || !recipientZone) {
      return NextResponse.json(
        { error: 'PATHAO_PRICE_INPUT_INVALID' },
        { status: 400 }
      );
    }

    if (totalWeightKg <= 0 && body.items?.length) {
      const productIds = [...new Set(body.items.map((item) => item.productId))];
      const variantIds = [...new Set(body.items.map((item) => item.variantId).filter(Boolean))] as string[];
      const [products, variants, configs] = await Promise.all([
        prisma.product.findMany({
          where: { id: { in: productIds }, isActive: true },
          select: { id: true, weight: true, shippingWeight: true },
        }),
        variantIds.length
          ? prisma.productVariant.findMany({
              where: { id: { in: variantIds } },
              select: { id: true, attributes: true },
            })
          : Promise.resolve([]),
        prisma.siteConfig.findMany({
          where: { key: { in: ['packagingWeight', 'shippingSettings', 'deliverySettings', 'orderPackagingWeight'] } },
          select: { value: true },
        }),
      ]);

      const productMap = new Map(products.map((product) => [product.id, product]));
      const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
      const itemsWeightKg = body.items.reduce((sum, item) => {
        const product = productMap.get(item.productId);
        if (!product) return sum;
        const variant = item.variantId ? variantMap.get(item.variantId) : null;
        const variantWeightKg = variant ? extractVariantWeightKg(variant.attributes) : null;
        const productWeightKg =
          parseWeightToKg(product.weight?.toNumber?.() ?? product.weight) ??
          parseWeightToKg(product.shippingWeight);
        const unitWeightKg = variantWeightKg ?? productWeightKg ?? 0.1;
        const quantity = Math.max(1, Math.trunc(item.quantity || 1));
        return sum + unitWeightKg * quantity;
      }, 0);
      const packagingWeightKg = resolvePackagingWeightKg(configs.map((config) => config.value));
      totalWeightKg = Number((itemsWeightKg + packagingWeightKg).toFixed(3));
    }

    if (totalWeightKg <= 0) {
      return NextResponse.json(
        { error: 'PATHAO_PRICE_INPUT_INVALID' },
        { status: 400 }
      );
    }

    const response = await pathaoRequest<{ data?: { final_price?: number; price?: number } }>(
      '/aladdin/api/v1/merchant/price-plan',
      {
        store_id: storeId,
        item_type: 2,
        delivery_type: 48,
        item_weight: totalWeightKg,
        recipient_city: recipientCity,
        recipient_zone: recipientZone,
      }
    );

    const shippingCharge =
      response.data?.final_price ??
      response.data?.price ??
      0;

    return NextResponse.json({ shippingCharge });
  } catch (error) {
    console.error('POST /api/shipping/pathao/price failed:', error);
    return NextResponse.json(
      { error: 'PATHAO_PRICE_CALCULATION_FAILED' },
      { status: 502 }
    );
  }
}
