import type { CanonicalCatalogItem, CatalogValidationResult } from './domain/types';

const AVAILABILITY = new Set(['in stock', 'out of stock', 'available for order', 'preorder', 'discontinued']);
const CURRENCIES = new Set(['BDT', 'USD']);

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateCanonicalCatalogItem(item: CanonicalCatalogItem): CatalogValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!item.retailerId.trim()) errors.push('retailerId is required.');
  if (!item.title.trim()) errors.push('title is required.');
  if (!isHttpUrl(item.link)) errors.push('link must be an absolute HTTP(S) URL.');
  if (!isHttpUrl(item.imageLink)) errors.push('imageLink must be an absolute HTTP(S) URL.');
  if (!Number.isFinite(item.price.amount) || item.price.amount < 0) errors.push('price must be non-negative.');
  if (!CURRENCIES.has(item.price.currency)) errors.push(`Unsupported currency: ${item.price.currency}.`);
  if (item.sale && (!Number.isFinite(item.sale.price.amount) || item.sale.price.amount < 0 || item.sale.price.amount >= item.price.amount)) {
    errors.push('sale price must be non-negative and lower than base price.');
  }
  if (!Number.isInteger(item.quantityToSellOnFacebook) || item.quantityToSellOnFacebook < 0) {
    errors.push('quantityToSellOnFacebook must be a non-negative integer.');
  }
  if (!AVAILABILITY.has(item.availability)) errors.push('availability is invalid.');
  if (item.sourceType === 'VARIANT' && !item.itemGroupId) errors.push('variant itemGroupId is required.');
  if (!item.gtin && !item.mpn) warnings.push('GTIN and MPN are both missing.');
  if (!item.productType && !item.googleProductCategory && !item.facebookProductCategory) warnings.push('Product category is missing.');
  if (item.description.length < 40) warnings.push('Description is short.');
  if (!item.additionalImageLinks?.length) warnings.push('Additional images are missing.');
  return { errors, warnings };
}
