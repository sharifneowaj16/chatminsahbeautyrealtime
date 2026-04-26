export interface DeliveryQuoteResult {
  charge: number;
  source: 'steadfast' | 'fallback';
  note?: string;
}

export function parseWeightToKg(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    // Heuristic: many products store weight as grams/ml (e.g. 150, 200, 500)
    // while shipping calculations need kilograms.
    if (value >= 10) {
      return value / 1000;
    }
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  if (normalized.includes('kg') || normalized.includes('kilogram')) {
    return amount;
  }

  if (
    normalized.includes('gm') ||
    normalized.includes('gram') ||
    normalized.endsWith('g') ||
    normalized.includes(' ml') ||
    normalized.endsWith('ml')
  ) {
    return amount / 1000;
  }

  return amount;
}

export function extractVariantWeightKg(attributes: unknown): number | null {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return null;
  }

  const candidateKeys = ['weight', 'weightKg', 'shippingWeight', 'shipping_weight'];

  for (const key of candidateKeys) {
    if (key in attributes) {
      const candidate = parseWeightToKg((attributes as Record<string, unknown>)[key]);
      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

function extractNumericField(data: unknown): number | null {
  if (typeof data === 'number' && Number.isFinite(data)) {
    return data;
  }

  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (!data || typeof data !== 'object') {
    return null;
  }

  const keys = [
    'deliveryCharge',
    'delivery_charge',
    'charge',
    'amount',
    'cost',
    'rate',
    'price',
  ];

  for (const key of keys) {
    if (key in data) {
      const candidate = extractNumericField((data as Record<string, unknown>)[key]);
      if (candidate !== null) {
        return candidate;
      }
    }
  }

  for (const value of Object.values(data as Record<string, unknown>)) {
    const candidate = extractNumericField(value);
    if (candidate !== null) {
      return candidate;
    }
  }

  return null;
}

export async function fetchSteadfastDeliveryQuote(params: {
  city: string;
  area: string;
  parcelWeightKg: number;
}): Promise<DeliveryQuoteResult | null> {
  const quoteUrl = process.env.STEADFAST_DELIVERY_QUOTE_URL;

  if (!quoteUrl) {
    return null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (process.env.STEADFAST_API_KEY) {
    headers['Api-Key'] = process.env.STEADFAST_API_KEY;
  }

  if (process.env.STEADFAST_SECRET_KEY) {
    headers['Secret-Key'] = process.env.STEADFAST_SECRET_KEY;
  }

  const response = await fetch(quoteUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      city: params.city,
      area: params.area,
      weight: Number(params.parcelWeightKg.toFixed(3)),
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Quote request failed with status ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  const charge = extractNumericField(data);

  if (charge === null) {
    throw new Error('Quote response did not include a numeric delivery charge');
  }

  return {
    charge,
    source: 'steadfast',
  };
}

export function estimateDeliveryCharge(params: {
  city: string;
  area: string;
  parcelWeightKg: number;
}): DeliveryQuoteResult {
  const normalizedCity = params.city.trim().toLowerCase();
  const normalizedArea = params.area.trim().toLowerCase();
  const weight = Math.max(0.01, params.parcelWeightKg);

  const dhakaCityThanas = [
    'dhanmondi',
    'mirpur',
    'uttara',
    'mohammadpur',
    'gulshan',
    'banani',
    'badda',
    'rampura',
  ];

  const dhakaSubAreas = [
    'savar',
    'keraniganj',
    'narayanganj',
    'gazipur',
    'tongi',
  ];

  const isDhaka = normalizedCity.includes('dhaka') || normalizedArea.includes('dhaka');
  const isDhakaSub = dhakaSubAreas.some((key) => normalizedArea.includes(key));
  const isDhakaCity = isDhaka && !isDhakaSub && dhakaCityThanas.some((key) => normalizedArea.includes(key));

  type Slab = { maxKg: number; charge: number };
  const slabsDhakaCity: Slab[] = [
    { maxKg: 0.2, charge: 60 },
    { maxKg: 0.5, charge: 70 },
    { maxKg: 1, charge: 80 },
    { maxKg: 2, charge: 100 },
    { maxKg: 3, charge: 120 },
  ];
  const slabsDhakaSub: Slab[] = [
    { maxKg: 0.5, charge: 90 },
    { maxKg: 1, charge: 100 },
    { maxKg: 2, charge: 120 },
    { maxKg: 3, charge: 140 },
  ];
  const slabsOutsideDhaka: Slab[] = [
    { maxKg: 0.2, charge: 120 },
    { maxKg: 0.5, charge: 130 },
    { maxKg: 1, charge: 140 },
    { maxKg: 2, charge: 160 },
    { maxKg: 3, charge: 200 },
  ];

  const pickFromSlabs = (slabs: Slab[]) => {
    for (const slab of slabs) {
      if (weight <= slab.maxKg) return slab.charge;
    }
    // beyond 3kg: keep it predictable (20৳ per extra 1kg block)
    const last = slabs[slabs.length - 1];
    const extraKg = Math.max(0, weight - last.maxKg);
    const extraBlocks = Math.ceil(extraKg / 1);
    return last.charge + extraBlocks * 20;
  };

  const charge = isDhakaCity
    ? pickFromSlabs(slabsDhakaCity)
    : isDhakaSub
      ? pickFromSlabs(slabsDhakaSub)
      : pickFromSlabs(slabsOutsideDhaka);

  return {
    charge,
    source: 'fallback',
    note: 'Delivery charge was calculated locally using Steadfast weight slabs.',
  };
}

export function resolvePackagingWeightKg(configValues: unknown[], fallback = 0.1): number {
  const nestedKeys = [
    ['packagingWeightKg'],
    ['packagingWeight'],
    ['shipping', 'packagingWeightKg'],
    ['shipping', 'packagingWeight'],
    ['delivery', 'packagingWeightKg'],
    ['delivery', 'packagingWeight'],
  ];

  for (const configValue of configValues) {
    const direct = parseWeightToKg(configValue);
    if (direct) {
      return direct;
    }

    if (!configValue || typeof configValue !== 'object' || Array.isArray(configValue)) {
      continue;
    }

    for (const path of nestedKeys) {
      let current: unknown = configValue;

      for (const key of path) {
        if (!current || typeof current !== 'object' || Array.isArray(current) || !(key in current)) {
          current = null;
          break;
        }

        current = (current as Record<string, unknown>)[key];
      }

      const nested = parseWeightToKg(current);
      if (nested) {
        return nested;
      }
    }
  }

  return fallback;
}
