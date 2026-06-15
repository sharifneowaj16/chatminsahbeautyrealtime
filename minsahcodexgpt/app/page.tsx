import HomePageClient from './HomePageClient';
import prisma from '@/lib/prisma';
import type { Product } from '@/contexts/ProductsContext';

export const revalidate = 60;

function toNumber(value: { toNumber?: () => number } | number | null | undefined): number {
  if (typeof value === 'number') return value;
  return value?.toNumber?.() ?? 0;
}

function getAttributeValue(attributes: unknown, key: string): string {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return '';
  }

  const value = (attributes as Record<string, unknown>)[key];
  return value == null ? '' : String(value);
}

async function getInitialProducts(): Promise<Product[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 48,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 10 },
        category: { select: { name: true } },
        brand: { select: { name: true } },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            quantity: true,
            attributes: true,
            image: true,
          },
          take: 20,
        },
      },
    });

    return products.map((product): Product => {
      const mainImage = product.images.find((image) => image.isDefault) || product.images[0];
      const price = toNumber(product.price);

      return {
        id: product.id,
        sku: product.sku || '',
        name: product.name,
        category: product.category?.name || '',
        subcategory: product.subcategory || '',
        item: '',
        brand: product.brand?.name || '',
        originCountry: product.originCountry || 'Bangladesh (Local)',
        price,
        originalPrice: product.compareAtPrice ? toNumber(product.compareAtPrice) : undefined,
        stock: product.quantity,
        status: !product.isActive ? 'inactive' : product.quantity === 0 ? 'out_of_stock' : 'active',
        image: mainImage?.url || '',
        images: product.images.map((image) => image.url),
        rating: toNumber(product.averageRating),
        reviews: product.reviewCount || 0,
        createdAt: product.createdAt.toISOString(),
        featured: product.isFeatured,
        isNew: product.isNew,
        description: product.description || '',
        weight: product.weight ? String(toNumber(product.weight)) : '',
        ingredients: product.ingredients || '',
        skinType: product.skinType || [],
        expiryDate: product.expiryDate?.toISOString() || '',
        shelfLife: product.shelfLife || '',
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku || '',
          size: getAttributeValue(variant.attributes, 'size'),
          color: getAttributeValue(variant.attributes, 'color'),
          price: String(toNumber(variant.price) || price),
          stock: String(variant.quantity),
          image: variant.image || '',
        })),
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        urlSlug: product.slug || '',
        tags: product.metaKeywords || '',
        shippingWeight: product.shippingWeight || '',
        dimensions: {
          length: product.length ? String(toNumber(product.length)) : '',
          width: product.width ? String(toNumber(product.width)) : '',
          height: product.height ? String(toNumber(product.height)) : '',
        },
        isFragile: product.isFragile || false,
        freeShippingEligible: !product.isFragile,
        discountPercentage: product.discountPercentage ? String(toNumber(product.discountPercentage)) : '',
        salePrice: product.salePrice ? String(toNumber(product.salePrice)) : '',
        offerStartDate: product.offerStartDate?.toISOString() || '',
        offerEndDate: product.offerEndDate?.toISOString() || '',
        flashSaleEligible: product.flashSaleEligible || false,
        lowStockThreshold: String(product.lowStockThreshold || 5),
        barcode: product.barcode || '',
        returnEligible: product.returnEligible,
        codAvailable: product.codAvailable,
        preOrderOption: product.preOrderOption,
        relatedProducts: product.relatedProducts || '',
      };
    });
  } catch (error) {
    console.error('[home] Failed to load initial products:', error);
    return [];
  }
}

export default async function HomePage() {
  const initialProducts = await getInitialProducts();

  return <HomePageClient initialProducts={initialProducts} />;
}
