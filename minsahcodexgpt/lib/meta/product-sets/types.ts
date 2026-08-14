import type { CanonicalCatalogItem } from '@/lib/meta/catalog/domain/types';

export const PRODUCT_SET_RULE_FIELDS = [
  'BRAND', 'PRODUCT_TYPE', 'AVAILABILITY', 'PRICE', 'SALE_PRICE', 'HAS_SALE',
  'CUSTOM_LABEL_0', 'CUSTOM_LABEL_1', 'CUSTOM_LABEL_2', 'CUSTOM_LABEL_3', 'CUSTOM_LABEL_4',
  'COLOR', 'SIZE', 'SOURCE_TYPE', 'RETAILER_ID',
] as const;
export type ProductSetRuleField = (typeof PRODUCT_SET_RULE_FIELDS)[number];

export const PRODUCT_SET_RULE_OPERATORS = [
  'EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'GTE', 'LTE', 'CONTAINS',
] as const;
export type ProductSetRuleOperator = (typeof PRODUCT_SET_RULE_OPERATORS)[number];

export type ProductSetCondition = {
  field: ProductSetRuleField;
  operator: ProductSetRuleOperator;
  value: string | number | boolean | Array<string | number | boolean>;
};

export type ProductSetRule = {
  combinator: 'AND' | 'OR';
  conditions: ProductSetCondition[];
};

export type ProductSetMember = Pick<CanonicalCatalogItem, 'retailerId' | 'sourceType' | 'sourceId'>;

export type ProductSetPreviewResult = {
  rule: ProductSetRule;
  ruleHash: string;
  membershipHash: string;
  memberCount: number;
  members: ProductSetMember[];
  sampledRetailerIds: string[];
};
