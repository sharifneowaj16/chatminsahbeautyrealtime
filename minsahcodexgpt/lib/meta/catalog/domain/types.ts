export type CatalogAvailability =
  | 'in stock'
  | 'out of stock'
  | 'available for order'
  | 'preorder'
  | 'discontinued';

export type CatalogCondition = 'new' | 'refurbished' | 'used';

export type Money = {
  amount: number;
  currency: string;
};

export type CatalogSale = {
  price: Money;
  effectiveDate: string;
};

export type CanonicalCatalogItem = {
  sourceType: 'PRODUCT' | 'VARIANT';
  sourceId: string;
  retailerId: string;
  itemGroupId?: string;
  title: string;
  description: string;
  availability: CatalogAvailability;
  availabilityDate?: string;
  quantityToSellOnFacebook: number;
  condition: CatalogCondition;
  price: Money;
  sale?: CatalogSale;
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  brand: string;
  gtin?: string;
  mpn?: string;
  productType?: string;
  googleProductCategory?: string;
  facebookProductCategory?: string;
  color?: string;
  size?: string;
  pattern?: string;
  material?: string;
  visibility: 'published' | 'staging' | 'hidden';
  customLabels?: Record<string, string>;
};

export type CatalogValidationResult = {
  errors: string[];
  warnings: string[];
};

export type CatalogMappedItem = {
  item: CanonicalCatalogItem;
  validation: CatalogValidationResult;
};
