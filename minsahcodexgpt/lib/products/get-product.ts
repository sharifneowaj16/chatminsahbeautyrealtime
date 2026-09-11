import prisma from '@/lib/prisma';
import { getDeliveryOfferBadgeText, isDeliveryOfferActive } from '@/lib/delivery-pricing';

const PUBLIC_PRODUCT_FILTER = {
  deletedAt: null,
  isActive: true,
} as const;

export interface CompanionVariantData {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  image: string;
}

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice: number | null;
  image: string;
  images: Array<{ url: string; alt?: string; isDefault?: boolean }>;
  sku: string;
  stock: number;
  category: string;
  brand: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  isNew: boolean;
  variants: Array<{
    id: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
    image: string;
  }>;
  [key: string]: any;
};

export type ProductDetailData = {
  product: ProductDetail;
  reviews: Array<{
    id: string;
    userName: string;
    rating: number;
    title: string;
    content: string;
    verified: boolean;
    createdAt: string;
  }>;
  rating: {
    average: number;
    total: number;
    distribution: Record<number, number>;
  };
  relatedProducts: Array<{
    id: string;
    name: string;
    price: number;
    costPrice?: number | null;
    weight?: number | null;
    shippingWeight?: string | null;
    deliveryOfferEnabled?: boolean | null;
    deliveryOfferType?: string | null;
    deliveryOfferAmount?: number | null;
    deliveryChargeInsideDhaka?: number | null;
    deliveryChargeOutsideDhaka?: number | null;
    originalPrice: number | null;
    image: string;
    slug: string;
    stock: number;
    hasVariants: boolean;
    variants?: CompanionVariantData[];
  }>;
  frequentlyBoughtTogether: Array<{
    id: string;
    sku: string;
    name: string;
    slug: string;
    price: number;
    originalPrice: number | null;
    image: string;
    stock: number;
    hasVariants: boolean;
    orderCount: number;
    totalUnits: number;
    variants?: CompanionVariantData[];
  }>;
};

type FrequentlyBoughtRow = {
  productId: string;
  orderCount: number;
  totalUnits: number;
};

export async function getProductDetail(idOrSlug: string): Promise<ProductDetailData | null> {
  if (!idOrSlug) return null;

  try {
    const product = await prisma.product.findFirst({
      where: {
        AND: [
          { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
          PUBLIC_PRODUCT_FILTER,
        ],
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: { id: 'asc' } },
        category: true,
        brand: true,
        reviews: {
          where: { isApproved: true },
          select: {
            id: true,
            rating: true,
            comment: true,
            title: true,
            createdAt: true,
            user: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      return null;
    }

    const mainImage = product.images.find((i) => i.isDefault) || product.images[0];

    // Frequently bought together via recent orders
    let frequentlyBoughtRows: FrequentlyBoughtRow[] = [];
    try {
      frequentlyBoughtRows = await prisma.$queryRaw<FrequentlyBoughtRow[]>`
        SELECT
          companion."productId" AS "productId",
          COUNT(DISTINCT companion."orderId")::int AS "orderCount",
          COALESCE(SUM(companion."quantity"), 0)::int AS "totalUnits"
        FROM "OrderItem" source_item
        INNER JOIN "Order" source_order
          ON source_order."id" = source_item."orderId"
        INNER JOIN "OrderItem" companion
          ON companion."orderId" = source_item."orderId"
         AND companion."productId" <> source_item."productId"
        INNER JOIN "Product" companion_product
          ON companion_product."id" = companion."productId"
        WHERE source_item."productId" = ${product.id}
          AND source_order."status" IN ('SHIPPED', 'DELIVERED')
          AND source_order."paymentStatus" IN ('PROCESSING', 'COMPLETED')
          AND companion_product."isActive" = true
          AND companion_product."deletedAt" IS NULL
        GROUP BY companion."productId"
        ORDER BY "orderCount" DESC, "totalUnits" DESC
        LIMIT 4
      `;
    } catch {
      frequentlyBoughtRows = [];
    }

    const frequentlyBoughtProducts = frequentlyBoughtRows.length
      ? await prisma.product.findMany({
          where: {
            id: { in: frequentlyBoughtRows.map((row) => row.productId) },
            ...PUBLIC_PRODUCT_FILTER,
          },
          include: {
            images: { where: { isDefault: true }, take: 1 },
            variants: {
              where: { isActive: true, deletedAt: null },
              select: {
                id: true,
                sku: true,
                name: true,
                price: true,
                quantity: true,
                attributes: true,
                image: true,
              },
            },
          },
        })
      : [];

    const frequentlyBoughtMap = new Map(
      frequentlyBoughtProducts.map((relatedProduct) => [relatedProduct.id, relatedProduct])
    );

    const relatedProducts = product.categoryId
      ? await prisma.product.findMany({
          where: { categoryId: product.categoryId, id: { not: product.id }, ...PUBLIC_PRODUCT_FILTER },
          take: 4,
          include: {
            images: { where: { isDefault: true }, take: 1 },
            variants: {
              where: { isActive: true, deletedAt: null },
              select: {
                id: true,
                sku: true,
                name: true,
                price: true,
                quantity: true,
                attributes: true,
                image: true,
              },
            },
          },
        })
      : [];

    const reviews = product.reviews.map((r) => ({
      id: r.id,
      userName: [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || 'Customer',
      rating: r.rating,
      title: r.title || '',
      content: r.comment || '',
      verified: true,
      createdAt: r.createdAt.toISOString(),
    }));

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    const deliveryOfferAmount = product.deliveryOfferAmount
      ? product.deliveryOfferAmount.toNumber()
      : null;
    const deliveryChargeInsideDhaka = product.deliveryChargeInsideDhaka
      ? product.deliveryChargeInsideDhaka.toNumber()
      : null;
    const deliveryChargeOutsideDhaka = product.deliveryChargeOutsideDhaka
      ? product.deliveryChargeOutsideDhaka.toNumber()
      : null;

    const deliveryOfferInput = {
      id: product.id,
      name: product.name,
      deliveryOfferEnabled: product.deliveryOfferEnabled,
      deliveryOfferType: product.deliveryOfferType,
      deliveryOfferAmount,
      deliveryChargeInsideDhaka,
      deliveryChargeOutsideDhaka,
      deliveryOfferStartDate: product.deliveryOfferStartDate,
      deliveryOfferEndDate: product.deliveryOfferEndDate,
      deliveryOfferBadgeText: product.deliveryOfferBadgeText,
    };

    const hasActiveDeliveryOffer = isDeliveryOfferActive(deliveryOfferInput);
    const activeDeliveryOffer = hasActiveDeliveryOffer
      ? {
          type: product.deliveryOfferType,
          amount: deliveryOfferAmount,
          insideDhakaAmount: deliveryChargeInsideDhaka,
          outsideDhakaAmount: deliveryChargeOutsideDhaka,
          badgeText: getDeliveryOfferBadgeText(deliveryOfferInput),
          startDate: product.deliveryOfferStartDate ? product.deliveryOfferStartDate.toISOString() : null,
          endDate: product.deliveryOfferEndDate ? product.deliveryOfferEndDate.toISOString() : null,
        }
      : null;

    const ratingAvg = product.averageRating
      ? product.averageRating.toNumber()
      : reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return {
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        price: product.price.toNumber(),
        originalPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
        image: mainImage?.url || '',
        images: product.images.map((i) => ({ url: i.url, alt: i.alt || '', isDefault: i.isDefault })),
        sku: product.sku,
        stock: product.quantity,
        category: product.category?.name || '',
        categorySlug: product.category?.slug || '',
        brand: product.brand?.name || '',
        rating: ratingAvg,
        reviews: product.reviewCount || reviews.length,
        inStock: product.quantity > 0,
        isNew: product.isNew,
        isFeatured: product.isFeatured,
        ingredients: product.ingredients || '',
        skinType: product.skinType || [],
        codAvailable: product.codAvailable,
        returnEligible: product.returnEligible,
        weight: product.weight ? product.weight.toNumber() : null,
        shippingWeight: product.shippingWeight || '',
        isFragile: product.isFragile,
        length: product.length ? product.length.toNumber() : null,
        width: product.width ? product.width.toNumber() : null,
        height: product.height ? product.height.toNumber() : null,
        dimensions: {
          length: product.length ? product.length.toNumber() : null,
          width: product.width ? product.width.toNumber() : null,
          height: product.height ? product.height.toNumber() : null,
        },

        // SEO / metadata
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        metaKeywords: product.metaKeywords || '',
        bengaliName: product.bengaliName || '',
        bengaliDescription: product.bengaliDescription || '',
        focusKeyword: product.focusKeyword || '',
        secondaryKeywords: product.secondaryKeywords || [],
        bengaliFocusKeyword: product.bengaliFocusKeyword || '',
        bengaliSecondaryKeywords: product.bengaliSecondaryKeywords || [],
        ogTitle: product.ogTitle || '',
        ogDescription: product.ogDescription || '',
        ogImageUrl: product.ogImageUrl || '',
        canonicalUrl: product.canonicalUrl || '',

        // SEO fields
        pageH1: product.pageH1 || '',
        seoIntro: product.seoIntro || '',
        faqSchemaNote: product.faqSchemaNote || '',
        authenticityNote: product.authenticityNote || '',
        ingredientVerificationStatus: product.ingredientVerificationStatus || '',
        seoValidationChecklist: product.seoValidationChecklist || [],
        structuredDataJsonLd: product.structuredDataJsonLd || null,
        productGroupJsonLd: product.productGroupJsonLd || null,
        merchantListingJsonLd: product.merchantListingJsonLd || null,
        breadcrumbJsonLd: product.breadcrumbJsonLd || null,
        sitemapIndexing: product.sitemapIndexing || null,
        variantUrlStrategy: product.variantUrlStrategy || null,
        searchIntent: product.searchIntent || '',
        targetAudience: product.targetAudience || '',
        primaryConcern: product.primaryConcern || '',
        keyBenefits: product.keyBenefits || [],
        buyingIntentKeywords: product.buyingIntentKeywords || [],
        searchTags: product.searchTags || [],
        synonyms: product.synonyms || [],
        banglaSearchTerms: product.banglaSearchTerms || [],
        reviewKeywords: product.reviewKeywords || [],
        entities: product.entities || [],
        descriptionSections: product.descriptionSections || null,
        productSpecs: product.productSpecs || null,
        productAttributes: product.productAttributes || null,
        shadeOptions: product.shadeOptions || null,
        variantPriceTable: product.variantPriceTable || null,
        variantComparisonTable: product.variantComparisonTable || null,
        internalLinks: product.internalLinks || null,
        usageInstructions: product.usageInstructions || [],
        imageAltTexts: product.imageAltTexts || [],
        faqSchemaReady: product.faqSchemaReady,
        gender: product.gender || '',
        faqs: product.faqs || [],

        // Commerce / offer fields
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
        costPrice: product.costPrice ? product.costPrice.toNumber() : null,
        discountPercentage: product.discountPercentage ? product.discountPercentage.toNumber() : null,
        salePrice: product.salePrice ? product.salePrice.toNumber() : null,
        offerStartDate: product.offerStartDate ? product.offerStartDate.toISOString() : null,
        offerEndDate: product.offerEndDate ? product.offerEndDate.toISOString() : null,
        deliveryOfferEnabled: product.deliveryOfferEnabled,
        deliveryOfferType: product.deliveryOfferType,
        deliveryOfferAmount,
        deliveryOfferStartDate: product.deliveryOfferStartDate ? product.deliveryOfferStartDate.toISOString() : null,
        deliveryOfferEndDate: product.deliveryOfferEndDate ? product.deliveryOfferEndDate.toISOString() : null,
        deliveryOfferBadgeText: product.deliveryOfferBadgeText || '',
        activeDeliveryOffer,
        flashSaleEligible: product.flashSaleEligible,
        trackInventory: product.trackInventory,
        allowBackorder: product.allowBackorder,
        lowStockThreshold: product.lowStockThreshold,
        preOrderOption: product.preOrderOption,
        originCountry: product.originCountry || '',
        shelfLife: product.shelfLife || '',
        expiryDate: product.expiryDate ? product.expiryDate.toISOString() : null,
        barcode: product.barcode || '',
        condition: product.condition || 'NEW',
        gtin: product.gtin || '',

        // Variants
        variants: product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          price: v.price ? v.price.toNumber() : product.price.toNumber(),
          stock: v.quantity,
          attributes: (v.attributes as Record<string, string>) || {},
          image: v.image || '',
          weight:
            typeof v.attributes === 'object' &&
            v.attributes !== null &&
            'weight' in v.attributes &&
            typeof (v.attributes as any).weight === 'number'
              ? (v.attributes as any).weight
              : product.weight
                ? product.weight.toNumber()
                : null,
        })),
      },
      reviews,
      rating: {
        average: ratingAvg,
        total: reviews.length || product.reviewCount || 0,
        distribution,
      },
      relatedProducts: relatedProducts.map((p) => {
        const pImage = p.images.find((i) => i.isDefault) || p.images[0];
        return {
          id: p.id,
          name: p.name,
          price: p.price.toNumber(),
          costPrice: p.costPrice ? p.costPrice.toNumber() : null,
          weight: p.weight ? p.weight.toNumber() : null,
          shippingWeight: p.shippingWeight || '',
          deliveryOfferEnabled: p.deliveryOfferEnabled,
          deliveryOfferType: p.deliveryOfferType,
          deliveryOfferAmount: p.deliveryOfferAmount ? p.deliveryOfferAmount.toNumber() : null,
          deliveryChargeInsideDhaka: p.deliveryChargeInsideDhaka ? p.deliveryChargeInsideDhaka.toNumber() : null,
          deliveryChargeOutsideDhaka: p.deliveryChargeOutsideDhaka ? p.deliveryChargeOutsideDhaka.toNumber() : null,
          originalPrice: p.compareAtPrice ? p.compareAtPrice.toNumber() : null,
          image: pImage?.url || '',
          slug: p.slug,
          stock: p.quantity,
          hasVariants: p.variants.length > 0,
          variants: (p.variants || []).map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            price: v.price ? v.price.toNumber() : p.price.toNumber(),
            stock: v.quantity,
            attributes: (v.attributes as Record<string, string>) || {},
            image: v.image || '',
          })),
        };
      }),
      frequentlyBoughtTogether: frequentlyBoughtRows.map((row) => {
        const companionProduct = frequentlyBoughtMap.get(row.productId);
        const pImage =
          companionProduct?.images.find((i) => i.isDefault) ||
          companionProduct?.images[0];
        const companionPrice = companionProduct?.price ? companionProduct.price.toNumber() : 0;
        return {
          id: row.productId,
          sku: companionProduct?.sku || '',
          name: companionProduct?.name || '',
          slug: companionProduct?.slug || '',
          price: companionPrice,
          originalPrice: companionProduct?.compareAtPrice
            ? companionProduct.compareAtPrice.toNumber()
            : null,
          image: pImage?.url || '',
          stock: companionProduct?.quantity ?? 0,
          hasVariants: (companionProduct?.variants.length || 0) > 0,
          orderCount: row.orderCount,
          totalUnits: row.totalUnits,
          variants: (companionProduct?.variants || []).map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            price: v.price ? v.price.toNumber() : companionPrice,
            stock: v.quantity,
            attributes: (v.attributes as Record<string, string>) || {},
            image: v.image || '',
          })),
        };
      }),
    };
  } catch (error) {
    console.error('[getProductDetail Error]', error);
    return null;
  }
}
