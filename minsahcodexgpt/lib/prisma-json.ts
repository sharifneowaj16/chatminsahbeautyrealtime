import type { Prisma } from '@/generated/prisma/client';

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

type NestedPrismaJsonValue = Prisma.InputJsonValue | null;

function convertNested(value: unknown, path: string): NestedPrismaJsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number.`);
    return value;
  }

  if (typeof value === 'undefined') throw new TypeError(`${path} contains undefined.`);
  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
    throw new TypeError(`${path} contains an unsupported ${typeof value} value.`);
  }

  if (value instanceof Date) throw new TypeError(`${path} contains a Date instance.`);

  if (Array.isArray(value)) {
    return value.map((item, index) => convertNested(item, `${path}[${index}]`));
  }

  if (!isPlainObject(value)) {
    throw new TypeError(`${path} contains an unsupported class instance.`);
  }

  const output: Record<string, NestedPrismaJsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = convertNested(item, `${path}.${key}`);
  }
  return output;
}

export function toPrismaInputJson(value: unknown, path = '$'): Prisma.InputJsonValue {
  if (value === null) throw new TypeError(`${path} cannot be null at the top level.`);
  return convertNested(value, path) as Prisma.InputJsonValue;
}

