import { formatCatalogMoney } from '../domain/pricing';
import type { CanonicalCatalogItem } from '../domain/types';

export const CATALOG_CSV_HEADERS = [
  'id', 'title', 'description', 'availability', 'availability_date',
  'quantity_to_sell_on_facebook', 'condition', 'price', 'sale_price',
  'sale_price_effective_date', 'link', 'image_link', 'additional_image_link',
  'brand', 'gtin', 'mpn', 'product_type', 'google_product_category',
  'facebook_product_category', 'color', 'size', 'pattern', 'material',
  'visibility', 'item_group_id', 'custom_label_0', 'custom_label_1',
  'custom_label_2', 'custom_label_3', 'custom_label_4',
] as const;

export function serializeCsvRecord(item: CanonicalCatalogItem): Record<string, string | number | undefined> {
  return {
    id: item.retailerId,
    title: item.title,
    description: item.description,
    availability: item.availability,
    availability_date: item.availabilityDate,
    quantity_to_sell_on_facebook: item.quantityToSellOnFacebook,
    condition: item.condition,
    price: formatCatalogMoney(item.price),
    sale_price: item.sale ? formatCatalogMoney(item.sale.price) : undefined,
    sale_price_effective_date: item.sale?.effectiveDate,
    link: item.link,
    image_link: item.imageLink,
    additional_image_link: item.additionalImageLinks?.join(','),
    brand: item.brand,
    gtin: item.gtin,
    mpn: item.mpn,
    product_type: item.productType,
    google_product_category: item.googleProductCategory,
    facebook_product_category: item.facebookProductCategory,
    color: item.color,
    size: item.size,
    pattern: item.pattern,
    material: item.material,
    visibility: item.visibility,
    item_group_id: item.itemGroupId,
    custom_label_0: item.customLabels?.custom_label_0,
    custom_label_1: item.customLabels?.custom_label_1,
    custom_label_2: item.customLabels?.custom_label_2,
    custom_label_3: item.customLabels?.custom_label_3,
    custom_label_4: item.customLabels?.custom_label_4,
  };
}

function quote(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function serializeCatalogCsv(items: CanonicalCatalogItem[]) {
  const rows = items.map((item) => {
    const record = serializeCsvRecord(item);
    return CATALOG_CSV_HEADERS.map((header) => quote(record[header])).join(',');
  });
  return [CATALOG_CSV_HEADERS.join(','), ...rows].join('\n');
}
