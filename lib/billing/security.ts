import type { PlanKey } from "@/lib/billing/config";
import { isPlanKey } from "@/lib/billing/config";

export type BillingLocale = "en" | "zh";

export class BillingRequestError extends Error {
  constructor(message = "Invalid billing request") {
    super(message);
    this.name = "BillingRequestError";
  }
}

export function requireSameOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") throw new BillingRequestError();

  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    throw new BillingRequestError();
  }

  if (origin !== normalizedOrigin || normalizedOrigin !== requestOrigin) {
    throw new BillingRequestError();
  }
  return requestOrigin;
}

export function requireCheckoutIdempotencyKey(request: Request): string {
  const value = request.headers.get("idempotency-key");
  if (
    !value ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new BillingRequestError();
  }
  return value.toLowerCase();
}

export async function readLimitedText(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > maxBytes
    ) {
      throw new BillingRequestError();
    }
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new BillingRequestError();
      }
      chunks.push(value);
    }
    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch (error) {
    if (error instanceof BillingRequestError) throw error;
    throw new BillingRequestError();
  } finally {
    reader.releaseLock();
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function parseLocale(value: unknown): BillingLocale {
  if (value === "en" || value === "zh") return value;
  throw new BillingRequestError();
}

export function parseCheckoutBody(value: unknown): {
  planKey: PlanKey;
  locale: BillingLocale;
} {
  if (!isPlainObject(value) || !hasOnlyKeys(value, ["planKey", "locale"])) {
    throw new BillingRequestError();
  }
  if (!isPlanKey(value.planKey)) throw new BillingRequestError();
  return { planKey: value.planKey, locale: parseLocale(value.locale) };
}

export function parsePortalBody(value: unknown): { locale: BillingLocale } {
  if (!isPlainObject(value) || !hasOnlyKeys(value, ["locale"])) {
    throw new BillingRequestError();
  }
  return { locale: parseLocale(value.locale ?? "en") };
}

export function billingReturnPaths(locale: BillingLocale): {
  successPath: string;
  cancelPath: string;
  portalReturnPath: string;
} {
  const billing = locale === "zh" ? "/zh/billing" : "/billing";
  return {
    successPath: `${billing}?billing=success`,
    cancelPath: `${billing}?billing=cancelled`,
    portalReturnPath: billing,
  };
}
