import { createHash } from 'node:crypto';
import type { CanonicalCatalogItem } from '@/lib/meta/catalog/domain/types';
import {
  PRODUCT_SET_RULE_FIELDS,
  PRODUCT_SET_RULE_OPERATORS,
  type ProductSetCondition,
  type ProductSetRule,
  type ProductSetRuleField,
  type ProductSetRuleOperator,
  type ProductSetPreviewResult,
} from './types';

const fields = new Set<string>(PRODUCT_SET_RULE_FIELDS);
const operators = new Set<string>(PRODUCT_SET_RULE_OPERATORS);
const numericFields = new Set<ProductSetRuleField>(['PRICE', 'SALE_PRICE']);
const arrayOperators = new Set<ProductSetRuleOperator>(['IN', 'NOT_IN']);
const MAX_CONDITIONS = 12;
const MAX_ARRAY_VALUES = 100;
const MAX_TEXT = 160;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalize(nested)]));
  }
  return value;
}

export function productSetStableHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function cleanText(value: unknown) {
  if (typeof value !== 'string') throw new Error('PRODUCT_SET_RULE_VALUE_STRING_REQUIRED');
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT);
  if (!cleaned) throw new Error('PRODUCT_SET_RULE_VALUE_REQUIRED');
  return cleaned;
}

function normalizeScalar(field: ProductSetRuleField, value: unknown): string | number | boolean {
  if (numericFields.has(field)) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`PRODUCT_SET_RULE_NUMBER_INVALID:${field}`);
    return Math.round(parsed * 100) / 100;
  }
  if (field === 'HAS_SALE') {
    if (value === true || value === false) return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error('PRODUCT_SET_RULE_BOOLEAN_INVALID:HAS_SALE');
  }
  return cleanText(value);
}

function normalizeCondition(value: unknown): ProductSetCondition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PRODUCT_SET_CONDITION_OBJECT_REQUIRED');
  const row = value as Record<string, unknown>;
  const field = String(row.field ?? '').trim().toUpperCase();
  const operator = String(row.operator ?? '').trim().toUpperCase();
  if (!fields.has(field)) throw new Error(`PRODUCT_SET_RULE_FIELD_UNSUPPORTED:${field || 'missing'}`);
  if (!operators.has(operator)) throw new Error(`PRODUCT_SET_RULE_OPERATOR_UNSUPPORTED:${operator || 'missing'}`);
  const typedField = field as ProductSetRuleField;
  const typedOperator = operator as ProductSetRuleOperator;
  if (arrayOperators.has(typedOperator)) {
    if (!Array.isArray(row.value) || row.value.length === 0 || row.value.length > MAX_ARRAY_VALUES) throw new Error('PRODUCT_SET_RULE_ARRAY_INVALID');
    const normalized = row.value.map((item) => normalizeScalar(typedField, item));
    const firstByComparableValue = new Map<string, string | number | boolean>();
    for (const item of normalized) {
      const key = String(item).toLowerCase();
      if (!firstByComparableValue.has(key)) firstByComparableValue.set(key, item);
    }
    return { field: typedField, operator: typedOperator, value: [...firstByComparableValue.values()] };
  }
  if ((typedOperator === 'GTE' || typedOperator === 'LTE') && !numericFields.has(typedField)) throw new Error(`PRODUCT_SET_RULE_NUMERIC_OPERATOR_INVALID:${typedField}`);
  if (typedOperator === 'CONTAINS' && (numericFields.has(typedField) || typedField === 'HAS_SALE')) throw new Error(`PRODUCT_SET_RULE_CONTAINS_INVALID:${typedField}`);
  return { field: typedField, operator: typedOperator, value: normalizeScalar(typedField, row.value) };
}

export function normalizeProductSetRule(value: unknown): ProductSetRule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PRODUCT_SET_RULE_OBJECT_REQUIRED');
  const row = value as Record<string, unknown>;
  const combinator = String(row.combinator ?? 'AND').trim().toUpperCase();
  if (combinator !== 'AND' && combinator !== 'OR') throw new Error('PRODUCT_SET_RULE_COMBINATOR_INVALID');
  if (!Array.isArray(row.conditions) || row.conditions.length === 0 || row.conditions.length > MAX_CONDITIONS) throw new Error('PRODUCT_SET_RULE_CONDITION_COUNT_INVALID');
  const conditions = row.conditions.map(normalizeCondition)
    .sort((left, right) => `${left.field}:${left.operator}:${JSON.stringify(left.value)}`.localeCompare(`${right.field}:${right.operator}:${JSON.stringify(right.value)}`));
  return { combinator, conditions };
}

function valueFor(item: CanonicalCatalogItem, field: ProductSetRuleField): unknown {
  if (field === 'BRAND') return item.brand;
  if (field === 'PRODUCT_TYPE') return item.productType ?? '';
  if (field === 'AVAILABILITY') return item.availability;
  if (field === 'PRICE') return item.price.amount;
  if (field === 'SALE_PRICE') return item.sale?.price.amount ?? null;
  if (field === 'HAS_SALE') return Boolean(item.sale);
  if (field.startsWith('CUSTOM_LABEL_')) return item.customLabels?.[`custom_label_${field.slice(-1)}`] ?? '';
  if (field === 'COLOR') return item.color ?? '';
  if (field === 'SIZE') return item.size ?? '';
  if (field === 'SOURCE_TYPE') return item.sourceType;
  return item.retailerId;
}

function normalizedComparable(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function productSetConditionMatches(item: CanonicalCatalogItem, condition: ProductSetCondition) {
  const actual = normalizedComparable(valueFor(item, condition.field));
  const expected = Array.isArray(condition.value)
    ? condition.value.map(normalizedComparable)
    : normalizedComparable(condition.value);
  if (condition.operator === 'EQUALS') return actual === expected;
  if (condition.operator === 'NOT_EQUALS') return actual !== expected;
  if (condition.operator === 'IN') return Array.isArray(expected) && expected.includes(actual as never);
  if (condition.operator === 'NOT_IN') return Array.isArray(expected) && !expected.includes(actual as never);
  if (condition.operator === 'CONTAINS') return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
  if (condition.operator === 'GTE') return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
  if (condition.operator === 'LTE') return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
  return false;
}

export function evaluateProductSetRule(items: CanonicalCatalogItem[], input: unknown): ProductSetPreviewResult {
  const rule = normalizeProductSetRule(input);
  const members = items.filter((item) => {
    const matches = rule.conditions.map((condition) => productSetConditionMatches(item, condition));
    return rule.combinator === 'AND' ? matches.every(Boolean) : matches.some(Boolean);
  }).sort((left, right) => left.retailerId.localeCompare(right.retailerId))
    .map(({ retailerId, sourceType, sourceId }) => ({ retailerId, sourceType, sourceId }));
  const retailerIds = members.map((item) => item.retailerId);
  return {
    rule,
    ruleHash: productSetStableHash(rule),
    membershipHash: productSetStableHash(retailerIds),
    memberCount: members.length,
    members,
    sampledRetailerIds: retailerIds.slice(0, 50),
  };
}

export function compileMetaProductSetFilter(retailerIds: string[]) {
  const sorted = [...new Set(retailerIds.map((item) => item.trim()).filter(Boolean))].sort();
  if (sorted.length === 0) throw new Error('PRODUCT_SET_EMPTY_SYNC_BLOCKED');
  return { retailer_id: { is_any: sorted } };
}
