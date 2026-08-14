import { normalizeBangladeshPhoneNumber } from '@/lib/phone';
import {
  type CheckoutPaymentMethod,
  parseSupportedCheckoutPaymentMethod,
} from '@/lib/payments/payment-methods';

type RawRecord = Record<string, unknown>;

export type NormalizedOrderItemInput = {
  productId: string;
  variantId?: string;
  quantity: number;
};

export type NormalizedAddressDataInput = {
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  phone: string;
  city: string;
  zone: string;
  area: string;
  streetAddress: string;
  address: string;
  street1: string;
  street2?: string;
  provinceRegion?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  pathao_city_id?: number | null;
  pathao_zone_id?: number | null;
  pathao_area_id?: number | null;
};

export type NormalizedOrderRequest = {
  items: NormalizedOrderItemInput[];
  addressId?: string;
  addressData?: NormalizedAddressDataInput;
  paymentMethod: CheckoutPaymentMethod;
  couponCode?: string;
  customerNote?: string;
};

export class OrderValidationError extends Error {
  status: number;
  code: string;

  constructor(message: string, code = 'ORDER_VALIDATION_FAILED', status = 400) {
    super(message);
    this.name = 'OrderValidationError';
    this.code = code;
    this.status = status;
  }
}

const MAX_LINE_ITEM_QUANTITY = 99;

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawRecord)
    : null;
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanOptionalString(value: unknown): string | undefined {
  const cleaned = cleanString(value);
  return cleaned || undefined;
}

function cleanNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readAddressString(record: RawRecord, keys: string[]): string {
  for (const key of keys) {
    const value = cleanString(record[key]);
    if (value) return value;
  }
  return '';
}

function normalizeItems(value: unknown): NormalizedOrderItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new OrderValidationError('No items in order', 'ORDER_ITEMS_REQUIRED');
  }

  const merged = new Map<string, NormalizedOrderItemInput>();

  value.forEach((rawItem, index) => {
    const item = asRecord(rawItem);
    if (!item) {
      throw new OrderValidationError(`Invalid item at position ${index + 1}`, 'ORDER_ITEM_INVALID');
    }

    const productId = cleanString(item.productId);
    const variantId = cleanOptionalString(item.variantId);
    const quantity = Number(item.quantity);

    if (!productId) {
      throw new OrderValidationError(`Product ID is required for item ${index + 1}`, 'PRODUCT_ID_REQUIRED');
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new OrderValidationError(
        `Quantity must be a positive whole number for item ${index + 1}`,
        'INVALID_QUANTITY',
      );
    }

    if (quantity > MAX_LINE_ITEM_QUANTITY) {
      throw new OrderValidationError(
        `Quantity cannot exceed ${MAX_LINE_ITEM_QUANTITY} for one item`,
        'QUANTITY_LIMIT_EXCEEDED',
      );
    }

    const key = `${productId}:${variantId ?? ''}`;
    const existing = merged.get(key);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;

    if (nextQuantity > MAX_LINE_ITEM_QUANTITY) {
      throw new OrderValidationError(
        `Total quantity for one product cannot exceed ${MAX_LINE_ITEM_QUANTITY}`,
        'QUANTITY_LIMIT_EXCEEDED',
      );
    }

    merged.set(key, { productId, variantId, quantity: nextQuantity });
  });

  return Array.from(merged.values());
}

function normalizeAddressData(value: unknown): NormalizedAddressDataInput | undefined {
  if (value === undefined || value === null) return undefined;

  const address = asRecord(value);
  if (!address) {
    throw new OrderValidationError('Address data is invalid', 'ADDRESS_DATA_INVALID');
  }

  const fullName = readAddressString(address, ['fullName', 'name']);
  const rawPhone = readAddressString(address, ['phoneNumber', 'phone', 'mobile']);
  const phone = normalizeBangladeshPhoneNumber(rawPhone);
  const city = readAddressString(address, ['city']);
  const zone = readAddressString(address, ['zone', 'street2']);
  const area = readAddressString(address, ['area']);
  const streetAddress = readAddressString(address, [
    'streetAddress',
    'street1',
    'houseRoadFlat',
    'houseRoad',
    'addressLine1',
  ]);

  if (!fullName) {
    throw new OrderValidationError('Full name is required', 'FULL_NAME_REQUIRED');
  }

  if (!phone) {
    throw new OrderValidationError(
      'Please enter a valid Bangladesh phone number, for example 01XXXXXXXXX.',
      'INVALID_PHONE',
    );
  }

  if (!city || !zone || !area) {
    throw new OrderValidationError('City, zone and area are required', 'DELIVERY_LOCATION_REQUIRED');
  }

  if (!streetAddress) {
    throw new OrderValidationError(
      'Street address is required.',
      'STREET_ADDRESS_REQUIRED',
    );
  }

  return {
    fullName,
    firstName: cleanOptionalString(address.firstName),
    lastName: cleanOptionalString(address.lastName),
    phoneNumber: phone,
    phone,
    city,
    zone,
    area,
    streetAddress,
    address: area,
    street1: streetAddress,
    street2: zone,
    provinceRegion: cleanOptionalString(address.provinceRegion) ?? cleanOptionalString(address.state) ?? city,
    state: cleanOptionalString(address.state) ?? cleanOptionalString(address.provinceRegion) ?? city,
    postalCode: cleanOptionalString(address.postalCode),
    country: cleanOptionalString(address.country) ?? 'Bangladesh',
    pathao_city_id: cleanNullableNumber(address.pathao_city_id),
    pathao_zone_id: cleanNullableNumber(address.pathao_zone_id),
    pathao_area_id: cleanNullableNumber(address.pathao_area_id),
  };
}

export function validateAndNormalizeOrderRequest(body: unknown): NormalizedOrderRequest {
  const record = asRecord(body);
  if (!record) {
    throw new OrderValidationError('Request body is invalid', 'INVALID_REQUEST_BODY');
  }

  const items = normalizeItems(record.items);
  const paymentMethod = parseSupportedCheckoutPaymentMethod(
    cleanString(record.paymentMethod),
  );

  if (!paymentMethod) {
    throw new OrderValidationError(
      'Unsupported payment method for production checkout.',
      'UNSUPPORTED_PAYMENT_METHOD',
    );
  }

  const addressId = cleanOptionalString(record.addressId);
  const addressData = normalizeAddressData(record.addressData);

  if (!addressId && !addressData) {
    throw new OrderValidationError('Shipping address is required', 'SHIPPING_ADDRESS_REQUIRED');
  }

  return {
    items,
    addressId,
    addressData,
    paymentMethod,
    couponCode: cleanOptionalString(record.couponCode)?.toUpperCase(),
    customerNote: cleanOptionalString(record.customerNote),
  };
}
