import type { VariantOption } from './VariantModal';

export interface ProductDetailVariant extends VariantOption {
  weight?: number | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  image: string;
  price: number;
  stock: number;
  sku?: string | null;
  weight?: number | null;
  variants: ProductDetailVariant[];
}

interface ProductDetailResponse {
  product: {
    id?: string;
    name?: string;
    image?: string;
    price?: number;
    stock?: number;
    sku?: string | null;
    weight?: number | null;
    variants?: Array<{
      id: string;
      name?: string;
      price?: number;
      stock?: number;
      sku?: string | null;
      image?: string | null;
      weight?: number | null;
      attributes?: Record<string, unknown> | null;
    }>;
  };
}

const productDetailPromiseCache = new Map<string, Promise<ProductDetail>>();
const productDetailResolvedCache = new Map<string, ProductDetail>();

function normalizeAttributes(attributes: Record<string, unknown> | null | undefined) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return {};

  return Object.entries(attributes).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value != null) acc[key] = String(value);
    return acc;
  }, {});
}

function normalizeProductDetail(data: ProductDetailResponse, productId: string): ProductDetail {
  const product = data.product ?? {};
  const basePrice = Number(product.price ?? 0);

  return {
    id: product.id || productId,
    name: product.name || '',
    image: product.image || '',
    price: Number.isFinite(basePrice) ? basePrice : 0,
    stock: Number(product.stock ?? 0),
    sku: product.sku ?? null,
    weight: product.weight ?? null,
    variants: (product.variants ?? []).map((variant) => {
      const variantPrice = Number(variant.price ?? basePrice);
      return {
        id: variant.id,
        name: variant.name || '',
        price: Number.isFinite(variantPrice) ? variantPrice : basePrice,
        stock: Number(variant.stock ?? 0),
        sku: variant.sku ?? undefined,
        image: variant.image ?? null,
        weight: variant.weight ?? product.weight ?? null,
        attributes: normalizeAttributes(variant.attributes),
      };
    }),
  };
}

export async function getCachedProductDetail(productId: string, forceRefresh = false): Promise<ProductDetail> {
  if (!forceRefresh) {
    const resolved = productDetailResolvedCache.get(productId);
    if (resolved) return resolved;

    const pending = productDetailPromiseCache.get(productId);
    if (pending) return pending;
  }

  const promise = fetch(`/api/products/${productId}`, { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) throw new Error('Failed to load product details');
      const data = (await response.json()) as ProductDetailResponse;
      const detail = normalizeProductDetail(data, productId);
      productDetailResolvedCache.set(productId, detail);
      return detail;
    })
    .catch((error) => {
      productDetailPromiseCache.delete(productId);
      throw error;
    });

  productDetailPromiseCache.set(productId, promise);
  return promise;
}

export function primeProductDetailCache(productId: string, detail: ProductDetail) {
  productDetailResolvedCache.set(productId, detail);
  productDetailPromiseCache.set(productId, Promise.resolve(detail));
}
