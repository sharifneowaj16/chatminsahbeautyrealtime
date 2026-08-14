import { createHash } from "crypto";
import { NextRequest } from "next/server";

export class CheckoutIdempotencyError extends Error {
  status: number;
  code: string;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "CheckoutIdempotencyError";
    this.code = code;
    this.status = status;
  }
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,200}$/;

export function readCheckoutIdempotencyKey(request: NextRequest) {
  const rawKey = request.headers.get("idempotency-key")?.trim();

  if (!rawKey) {
    throw new CheckoutIdempotencyError(
      "Checkout idempotency key is required. Please refresh checkout and try again.",
      "IDEMPOTENCY_KEY_REQUIRED",
      400,
    );
  }

  if (!IDEMPOTENCY_KEY_PATTERN.test(rawKey)) {
    throw new CheckoutIdempotencyError(
      "Invalid checkout idempotency key.",
      "INVALID_IDEMPOTENCY_KEY",
      400,
    );
  }

  return rawKey;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(",")}}`;
}

export function hashCheckoutIdempotencyPayload(payload: unknown) {
  return createHash("sha256").update(stableSerialize(payload)).digest("hex");
}
