import { absoluteUrl } from '@/lib/seo';
import { productPath } from '@/lib/product-url';

type JsonLdValue = string | number | boolean | null | JsonLdValue[] | { [key: string]: JsonLdValue | undefined };

type ProductListRecord = {
  id?: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  price?: unknown;
  salePrice?: unknown;
  compareAtPrice?: unknown;
  quantity?: number | null;
  inStock?: boolean | null;
  image?: string | null;
  images?: Array<{ url?: string | null; alt?: string | null }>;
  brand?: { name?: string | null; slug?: string | null } | string | null;
  brandName?: string | null;
  brandSlug?: string | null;
  category?: { name?: string | null; slug?: string | null } | string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  averageRating?: unknown;
  reviewCount?: number | null;
};

type ItemListInput = {
  name: string;
  url: string;
  description?: string | null;
  products: ProductListRecord[];
  maxItems?: number;
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const raw = typeof value === 'object' && 'toString' in value ? value.toString() : String(value);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function stripUndefined<T extends JsonLdValue>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)).filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
        .map(([key, entry]) => [key, stripUndefined(entry as JsonLdValue)]),
    ) as T;
  }

  return value;
}

function getProductUrl(product: ProductListRecord): string {
  if (product.slug || product.id) return absoluteUrl(productPath({ id: product.id || product.slug || '', slug: product.slug || undefined }));
  return absoluteUrl('/shop');
}

function getProductImage(product: ProductListRecord): string | undefined {
  const imageFromList = product.images?.find((image) => image.url)?.url;
  return imageFromList || product.image || undefined;
}

function getBrandName(product: ProductListRecord): string | undefined {
  if (typeof product.brand === 'string') return product.brand;
  return product.brand?.name || product.brandName || undefined;
}

function getCategoryName(product: ProductListRecord): string | undefined {
  if (typeof product.category === 'string') return product.category;
  return product.category?.name || product.categoryName || undefined;
}

function getOfferPrice(product: ProductListRecord): number | null {
  return toNumber(product.salePrice) ?? toNumber(product.price);
}

function isProductInStock(product: ProductListRecord): boolean {
  if (typeof product.inStock === 'boolean') return product.inStock;
  if (typeof product.quantity === 'number') return product.quantity > 0;
  return true;
}

function buildProductListItem(product: ProductListRecord, position: number) {
  const productUrl = getProductUrl(product);
  const image = getProductImage(product);
  const price = getOfferPrice(product);
  const brandName = getBrandName(product);
  const categoryName = getCategoryName(product);
  const ratingValue = toNumber(product.averageRating);
  const reviewCount = typeof product.reviewCount === 'number' ? product.reviewCount : null;

  return stripUndefined({
    '@type': 'ListItem',
    position,
    url: productUrl,
    item: {
      '@type': 'Product',
      '@id': `${productUrl}#product`,
      name: product.name,
      description: product.shortDescription || product.description || undefined,
      url: productUrl,
      image,
      brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
      category: categoryName,
      offers: price != null
        ? {
            '@type': 'Offer',
            url: productUrl,
            price,
            priceCurrency: 'BDT',
            availability: isProductInStock(product)
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: {
              '@type': 'Organization',
              name: 'Minsah Beauty',
              url: absoluteUrl('/'),
            },
          }
        : undefined,
      aggregateRating: ratingValue && reviewCount && reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue,
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    },
  });
}

export function buildProductItemListJsonLd({
  name,
  url,
  description,
  products,
  maxItems = 24,
}: ItemListInput) {
  const safeProducts = products.slice(0, maxItems).filter((product) => product.name && (product.slug || product.id));
  if (safeProducts.length === 0) return null;

  return stripUndefined({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${url}#itemlist`,
    name,
    description: description || undefined,
    url,
    numberOfItems: safeProducts.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: safeProducts.map((product, index) => buildProductListItem(product, index + 1)),
  });
}

export function buildCollectionPageJsonLd({
  name,
  url,
  description,
}: {
  name: string;
  url: string;
  description?: string | null;
}) {
  return stripUndefined({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name,
    url,
    description: description || undefined,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Minsah Beauty',
      url: absoluteUrl('/'),
    },
  });
}
