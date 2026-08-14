import { formatCatalogMoney } from '../domain/pricing';
import type { CanonicalCatalogItem } from '../domain/types';

export type MetaItemsBatchRequest = {
  method: 'UPDATE' | 'DELETE';
  retailer_id: string;
  data?: Record<string, unknown>;
};

function labels(labels?: Record<string, string>) {
  if (!labels) return {};
  return Object.fromEntries(Object.entries(labels)
    .filter(([key]) => /^custom_label_[0-4]$/.test(key))
    .map(([key, value]) => [key, value]));
}

export function serializeItemsBatchUpdate(item: CanonicalCatalogItem, options: { inventoryOnly?: boolean } = {}): MetaItemsBatchRequest {
  const inventoryData = {
    availability: item.availability,
    availability_date: item.availabilityDate,
    quantity_to_sell_on_facebook: item.quantityToSellOnFacebook,
  };
  const data = options.inventoryOnly ? inventoryData : {
    title: item.title,
    description: item.description,
    ...inventoryData,
    condition: item.condition,
    price: formatCatalogMoney(item.price),
    sale_price: item.sale ? formatCatalogMoney(item.sale.price) : undefined,
    sale_price_effective_date: item.sale?.effectiveDate,
    link: item.link,
    image_link: item.imageLink,
    additional_image_link: item.additionalImageLinks,
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
    ...labels(item.customLabels),
  };
  return {
    method: 'UPDATE',
    retailer_id: item.retailerId,
    data: Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
  };
}

export function serializeItemsBatchDelete(retailerId: string): MetaItemsBatchRequest {
  return { method: 'DELETE', retailer_id: retailerId };
}
