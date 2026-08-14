// Graph ProductItem read fields intentionally stay separate from Items Batch write fields.
export const META_PRODUCT_ITEM_READ_FIELDS = [
  'id', 'retailer_id', 'name', 'description', 'availability', 'condition',
  'price', 'currency', 'sale_price', 'inventory', 'url', 'image_url',
  'brand', 'category', 'item_group_id', 'visibility',
] as const;
