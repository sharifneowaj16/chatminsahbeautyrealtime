import { NextRequest, NextResponse } from 'next/server';
import { extractPathaoObject, pathaoRequest, resolvePathaoStore } from '@/lib/pathao';
import prisma from '@/lib/prisma';
import {
  extractVariantWeightKg,
  parseWeightToKg,
  resolvePackagingWeightKg,
} from '@/lib/buy-now';

export const dynamic = 'force-dynamic';

const PATHAO_MIN_WEIGHT_KG = 0.5;
const PATHAO_MAX_WEIGHT_KG = 10;
const configuredDefaultItemWeightKg = Number(process.env.PATHAO_DEFAULT_ITEM_WEIGHT_KG ?? 0.1);
const DEFAULT_ITEM_WEIGHT_KG =
  Number.isFinite(configuredDefaultItemWeightKg) && configuredDefaultItemWeightKg > 0
    ? configuredDefaultItemWeightKg
    : 0.1;

interface PriceRequestBody {
  totalWeightKg?: number;
  items?: Array<{ productId: string; variantId?: string | null; quantity: number }>;
  address?: {
    pathao_city_id?: number | null;
    pathao_zone_id?: number | null;
  };
}

interface PathaoPricePlanResponse {
  data?: {
    price?: number;
    discount?: number;
    promo_discount?: number;
    plan_id?: number;
    cod_enabled?: number;
    cod_percentage?: number;
    additional_charge?: number;
    final_price?: number;
  };
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getPathaoPriceData(response: unknown): NonNullable<PathaoPricePlanResponse['data']> {
  const nested = extractPathaoObject(response);
  return {
    price: toPositiveNumber(nested.final_price) ?? undefined,
    ...nested,
  } as NonNullable<PathaoPricePlanResponse['data']>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PriceRequestBody;
    let totalWeightKg = Number(body.totalWeightKg ?? 0);
    const recipientCity = Number(body.address?.pathao_city_id);
    const recipientZone = Number(body.address?.pathao_zone_id);

    if (!recipientCity || !recipientZone) {
      return NextResponse.json(
        { error: 'PATHAO_PRICE_INPUT_INVALID' },
        { status: 400 }
      );
    }

    const storeInfo = await resolvePathaoStore();

    const normalizedItems = (body.items ?? [])
      .map((item) => ({
        productId: typeof item.productId === 'string' ? item.productId.trim() : '',
        variantId: typeof item.variantId === 'string' && item.variantId.trim() ? item.variantId.trim() : null,
        quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
      }))
      .filter((item) => item.productId);

    if (normalizedItems.length) {
      const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
      const variantIds = [...new Set(normalizedItems.map((item) => item.variantId).filter(Boolean))] as string[];
      const [products, variants, configs] = await Promise.all([
        prisma.product.findMany({
          where: { id: { in: productIds }, isActive: true },
          select: { id: true, weight: true, shippingWeight: true },
        }),
        variantIds.length
          ? prisma.productVariant.findMany({
              where: { id: { in: variantIds } },
              select: { id: true, productId: true, attributes: true },
            })
          : Promise.resolve([]),
        prisma.siteConfig.findMany({
          where: { key: { in: ['packagingWeight', 'shippingSettings', 'deliverySettings', 'orderPackagingWeight'] } },
          select: { value: true },
        }),
      ]);

      const productMap = new Map(products.map((product) => [product.id, product]));
      const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
      const missingProductIds = productIds.filter((productId) => !productMap.has(productId));
      if (missingProductIds.length) {
        return NextResponse.json(
          {
            error: 'PATHAO_PRICE_PRODUCT_NOT_FOUND',
            productIds: missingProductIds,
          },
          { status: 400 }
        );
      }

      const invalidVariantIds = normalizedItems
        .filter((item) => {
          if (!item.variantId) return false;
          const variant = variantMap.get(item.variantId);
          return !variant || variant.productId !== item.productId;
        })
        .map((item) => item.variantId)
        .filter((variantId): variantId is string => !!variantId);
      if (invalidVariantIds.length) {
        return NextResponse.json(
          {
            error: 'PATHAO_PRICE_VARIANT_INVALID',
            variantIds: [...new Set(invalidVariantIds)],
          },
          { status: 400 }
        );
      }

      const itemsWeightKg = normalizedItems.reduce((sum, item) => {
        const product = productMap.get(item.productId);
        if (!product) return sum;
        const variant = item.variantId ? variantMap.get(item.variantId) : null;
        const variantWeightKg = variant ? extractVariantWeightKg(variant.attributes) : null;
        const productWeightKg =
          parseWeightToKg(product.weight?.toNumber?.() ?? product.weight) ??
          parseWeightToKg(product.shippingWeight);
        const unitWeightKg = variantWeightKg ?? productWeightKg ?? DEFAULT_ITEM_WEIGHT_KG;
        return sum + unitWeightKg * item.quantity;
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

    const pathaoWeightKg = Number(Math.max(PATHAO_MIN_WEIGHT_KG, totalWeightKg).toFixed(3));
    if (pathaoWeightKg > PATHAO_MAX_WEIGHT_KG) {
      return NextResponse.json(
        {
          error: 'PATHAO_WEIGHT_OUT_OF_RANGE',
          message: `Pathao supports parcel weight from ${PATHAO_MIN_WEIGHT_KG}kg to ${PATHAO_MAX_WEIGHT_KG}kg.`,
          weight: {
            calculatedWeightKg: totalWeightKg,
            pathaoWeightKg,
          },
        },
        { status: 400 }
      );
    }

    const pathaoPayload = {
      store_id: storeInfo.storeId,
      item_type: 2,
      delivery_type: 48,
      item_weight: pathaoWeightKg,
      recipient_city: recipientCity,
      recipient_zone: recipientZone,
    };

    const response = await pathaoRequest<PathaoPricePlanResponse>(
      '/aladdin/api/v1/merchant/price-plan',
      pathaoPayload
    );

    const priceData = response.data ?? getPathaoPriceData(response);
    const shippingCharge =
      toPositiveNumber(priceData.final_price) ??
      toPositiveNumber(priceData.price) ??
      0;

    if (shippingCharge <= 0) {
      return NextResponse.json(
        {
          error: 'PATHAO_PRICE_RESPONSE_INVALID',
          response,
          request: pathaoPayload,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      shippingCharge,
      pathao: {
        request: pathaoPayload,
        response: priceData,
      },
      store: {
        storeId: storeInfo.storeId,
        source: storeInfo.source,
        cityId: storeInfo.store?.cityId ?? null,
        zoneId: storeInfo.store?.zoneId ?? null,
      },
      weight: {
        calculatedWeightKg: totalWeightKg,
        pathaoWeightKg,
      },
    });
  } catch (error) {
    console.error('POST /api/shipping/pathao/price failed:', error);
    return NextResponse.json(
      { error: 'PATHAO_PRICE_CALCULATION_FAILED' },
      { status: 502 }
    );
  }
}
