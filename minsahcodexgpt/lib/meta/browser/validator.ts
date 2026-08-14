import { isValidMetaBrowserEventId } from './event-id';
import type {
  MetaBrowserEventName,
  MetaBrowserValidationIssue,
  MetaBrowserValidationResult,
} from './types';
import type { TrackingEventData } from '@/types/tracking';

function issue(code: string, field: string, message: string): MetaBrowserValidationIssue {
  return { code, field, message };
}

function isFiniteNonNegative(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function validateMetaBrowserEvent(input: {
  eventName: MetaBrowserEventName;
  eventId: string;
  payload: TrackingEventData;
}): MetaBrowserValidationResult {
  const issues: MetaBrowserValidationIssue[] = [];
  const { eventId, payload } = input;

  if (!isValidMetaBrowserEventId(eventId)) {
    issues.push(issue('EVENT_ID_INVALID', 'eventId', 'A valid event ID is required for browser/server pairing.'));
  }

  if (payload.value !== undefined && !isFiniteNonNegative(payload.value)) {
    issues.push(issue('VALUE_INVALID', 'value', 'Value must be finite and non-negative.'));
  }

  if (payload.currency !== undefined && !/^[A-Z]{3}$/.test(payload.currency)) {
    issues.push(issue('CURRENCY_INVALID', 'currency', 'Currency must be an uppercase three-letter ISO code.'));
  }

  const hasCatalogFields =
    payload.content_ids !== undefined ||
    payload.content_type !== undefined ||
    payload.contents !== undefined;

  if (hasCatalogFields) {
    const ids = Array.isArray(payload.content_ids) ? payload.content_ids : [];
    const contents = Array.isArray(payload.contents) ? payload.contents : [];

    if (payload.content_type !== 'product' && payload.content_type !== 'product_group') {
      issues.push(issue('CONTENT_TYPE_INVALID', 'content_type', 'Content type must be product or product_group.'));
    }
    if (payload.content_type === 'product_group' && input.eventName !== 'ViewContent') {
      issues.push(issue('PRODUCT_GROUP_EVENT_INVALID', 'content_type', 'product_group is allowed only for ViewContent.'));
    }
    if (ids.length === 0 || ids.some((id) => typeof id !== 'string' || !id.trim())) {
      issues.push(issue('CONTENT_IDS_EMPTY', 'content_ids', 'Catalog-backed events require non-empty content IDs.'));
    }
    if (contents.length === 0) {
      issues.push(issue('CONTENTS_EMPTY', 'contents', 'Catalog-backed events require contents rows.'));
    }

    for (const [index, content] of contents.entries()) {
      if (!content || typeof content.id !== 'string' || !content.id.trim() || !ids.includes(content.id)) {
        issues.push(issue('CONTENT_ID_MISMATCH', `contents.${index}.id`, 'Each contents ID must exist in content_ids.'));
      }
      if (!Number.isInteger(content?.quantity) || content.quantity <= 0) {
        issues.push(issue('QUANTITY_INVALID', `contents.${index}.quantity`, 'Quantity must be a positive integer.'));
      }
      const itemPrice = content?.item_price ?? content?.price;
      if (itemPrice !== undefined && !isFiniteNonNegative(itemPrice)) {
        issues.push(issue('ITEM_PRICE_INVALID', `contents.${index}.item_price`, 'Item price must be finite and non-negative.'));
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
