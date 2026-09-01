import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import {
  type BillingConfig,
  BillingConfigurationError,
  parseBillingConfig,
} from "@/lib/billing/config";
import {
  createCheckoutHandler,
  createSummaryHandler,
} from "@/lib/billing/handlers";
import {
  BillingRequestError,
  parseCheckoutBody,
  parsePortalBody,
  readLimitedText,
  requireCheckoutIdempotencyKey,
  requireSameOrigin,
} from "@/lib/billing/security";
import {
  createStripeClient,
  findCustomerForUser,
  validateCheckoutPrice,
} from "@/lib/billing/stripe";
import { parseBillingView } from "@/lib/billing/public";
import {
  classifySubscription,
  hasBlockingSubscription,
  hasUsedTrial,
  UNAVAILABLE_BILLING_SUMMARY,
} from "@/lib/billing/summary";
import {
  createWebhookHandler,
  verifyWebhookEvent,
} from "@/lib/billing/webhook";

const testConfig: BillingConfig = {
  secretKey: "sk_test_123456",
  webhookSecret: "whsec_123456",
  expectLiveMode: false,
  prices: {
    monthly: "price_monthly123",
    annual: "price_annual123",
  },
};

function configEnvironment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    STRIPE_SECRET_KEY: testConfig.secretKey,
    STRIPE_WEBHOOK_SECRET: testConfig.webhookSecret,
    STRIPE_EXPECT_LIVE_MODE: "false",
    STRIPE_MONTHLY_PRICE_ID: testConfig.prices.monthly,
    STRIPE_ANNUAL_PRICE_ID: testConfig.prices.annual,
    ...overrides,
  };
}

function subscription(
  overrides: {
    status?: Stripe.Subscription.Status;
    livemode?: boolean;
    priceId?: string;
    priceLivemode?: boolean;
    quantity?: number;
    itemCount?: number;
    currency?: string;
    unitAmount?: number;
    interval?: "day" | "week" | "month" | "year";
    trialUsed?: boolean;
  } = {},
): Stripe.Subscription {
  const priceId = overrides.priceId ?? testConfig.prices.monthly;
  const isAnnual = priceId === testConfig.prices.annual;
  const item = {
    id: "si_123",
    quantity: overrides.quantity ?? 1,
    current_period_end: 1_800_000_000,
    price: {
      id: priceId,
      livemode: overrides.priceLivemode ?? false,
      currency: overrides.currency ?? "usd",
      unit_amount: overrides.unitAmount ?? (isAnnual ? 19000 : 1900),
      billing_scheme: "per_unit",
      transform_quantity: null,
      type: "recurring",
      recurring: {
        interval: overrides.interval ?? (isAnnual ? "year" : "month"),
        interval_count: 1,
        usage_type: "licensed",
      },
    },
  };
  return {
    id: "sub_123",
    status: overrides.status ?? "active",
    livemode: overrides.livemode ?? false,
    cancel_at_period_end: false,
    trial_start: overrides.trialUsed ? 1_700_000_000 : null,
    trial_end: overrides.trialUsed ? 1_701_209_600 : null,
    items: {
      data: Array.from({ length: overrides.itemCount ?? 1 }, () => item),
    },
  } as unknown as Stripe.Subscription;
}

async function stripeSignature(
  payload: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `t=${timestamp},v1=${hex}`;
}

describe("billing configuration", () => {
  it("parses an explicit test-mode configuration", () => {
    expect(parseBillingConfig(configEnvironment())).toEqual(testConfig);
  });

  it("rejects missing, malformed, duplicate, or whitespace-padded values", () => {
    expect(() =>
      parseBillingConfig(configEnvironment({ STRIPE_WEBHOOK_SECRET: undefined })),
    ).toThrow(BillingConfigurationError);
    expect(() =>
      parseBillingConfig(configEnvironment({ STRIPE_EXPECT_LIVE_MODE: "False" })),
    ).toThrow(BillingConfigurationError);
    expect(() =>
      parseBillingConfig(
        configEnvironment({
          STRIPE_ANNUAL_PRICE_ID: testConfig.prices.monthly,
        }),
      ),
    ).toThrow(BillingConfigurationError);
    expect(() =>
      parseBillingConfig(
        configEnvironment({ STRIPE_MONTHLY_PRICE_ID: " price_monthly123" }),
      ),
    ).toThrow(BillingConfigurationError);
  });

  it("rejects a secret key whose mode differs from the expected mode", () => {
    expect(() =>
      parseBillingConfig(
        configEnvironment({ STRIPE_SECRET_KEY: "sk_live_123456" }),
      ),
    ).toThrow(/mode/);
  });

  it("accepts a least-privilege restricted Stripe key", () => {
    expect(
      parseBillingConfig(
        configEnvironment({ STRIPE_SECRET_KEY: "rk_test_123456" }),
      ).secretKey,
    ).toBe("rk_test_123456");
  });
});

describe("billing request boundaries", () => {
  it("accepts only internally consistent serialized entitlement state", () => {
    expect(
      parseBillingView({
        plan: "pro",
        status: "active",
        currentPeriodEnd: "2026-10-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        hasProAccess: true,
        planKey: "monthly",
        trialEligible: false,
      }),
    ).not.toBeNull();
    expect(
      parseBillingView({
        plan: "free",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        hasProAccess: true,
        planKey: "monthly",
        trialEligible: true,
      }),
    ).toBeNull();
  });

  it("accepts only the allowlisted plans and exact checkout fields", () => {
    expect(parseCheckoutBody({ planKey: "monthly", locale: "zh" })).toEqual({
      planKey: "monthly",
      locale: "zh",
    });
    for (const body of [
      { planKey: "weekly", locale: "en" },
      { planKey: "monthly", locale: "en", price: "price_attacker" },
      { planKey: "annual", locale: "en", amount: 1 },
      { planKey: "annual", locale: "en", customer: "cus_attacker" },
      { planKey: "annual", locale: "en", successUrl: "https://evil.test" },
    ]) {
      expect(() => parseCheckoutBody(body)).toThrow(BillingRequestError);
    }
  });

  it("never accepts a customer ID in a portal body", () => {
    expect(parsePortalBody({ locale: "en" })).toEqual({ locale: "en" });
    expect(parsePortalBody({})).toEqual({ locale: "en" });
    expect(() =>
      parsePortalBody({ locale: "en", customer: "cus_attacker" }),
    ).toThrow(BillingRequestError);
  });

  it("requires a canonical, exact same-origin Origin header", () => {
    expect(
      requireSameOrigin(
        new Request("https://app.example/api/billing/checkout", {
          headers: { origin: "https://app.example" },
        }),
      ),
    ).toBe("https://app.example");
    for (const origin of [undefined, "null", "https://evil.example", "not a url"]) {
      const headers = origin ? { origin } : undefined;
      expect(() =>
        requireSameOrigin(
          new Request("https://app.example/api/billing/checkout", { headers }),
        ),
      ).toThrow(BillingRequestError);
    }
  });

  it("requires a UUID checkout idempotency key", () => {
    const request = new Request("https://app.example/api/billing/checkout", {
      headers: {
        "idempotency-key": "018f1f52-9aba-7c84-b917-79f0e6b18c4a",
      },
    });
    expect(requireCheckoutIdempotencyKey(request)).toBe(
      "018f1f52-9aba-7c84-b917-79f0e6b18c4a",
    );
    for (const value of [undefined, "retry-1", "00000000-0000-0000-0000-000000000000"]) {
      const headers = value ? { "idempotency-key": value } : undefined;
      expect(() =>
        requireCheckoutIdempotencyKey(
          new Request("https://app.example/api/billing/checkout", { headers }),
        ),
      ).toThrow(BillingRequestError);
    }
  });

  it("reads only a small bounded billing request body", async () => {
    await expect(
      readLimitedText(
        new Request("https://app.example/api/billing/checkout", {
          method: "POST",
          body: "x".repeat(1_025),
        }),
        1_024,
      ),
    ).rejects.toThrow(BillingRequestError);
    await expect(
      readLimitedText(
        new Request("https://app.example/api/billing/checkout", {
          method: "POST",
          body: "{}",
        }),
        1_024,
      ),
    ).resolves.toBe("{}");
  });
});

describe("Stripe customer mapping", () => {
  it("uses an exact current-email list match before eventual-consistency search", async () => {
    const search = vi.fn();
    const customer = {
      id: "cus_exact",
      livemode: false,
      metadata: { cleartag_user_id: "user_123" },
    } as unknown as Stripe.Customer;
    const stripe = {
      customers: {
        list: vi.fn().mockResolvedValue({ data: [customer], has_more: false }),
        search,
      },
    } as unknown as Stripe;

    await expect(
      findCustomerForUser(stripe, testConfig, {
        id: "user_123",
        email: "person@example.test",
      }),
    ).resolves.toBe(customer);
    expect(search).not.toHaveBeenCalled();
  });

  it("fails closed when more than one Customer maps to the same user", async () => {
    const duplicate = (id: string) =>
      ({
        id,
        livemode: false,
        metadata: { cleartag_user_id: "user_123" },
      }) as unknown as Stripe.Customer;
    const stripe = {
      customers: {
        list: vi.fn().mockResolvedValue({
          data: [duplicate("cus_one"), duplicate("cus_two")],
          has_more: false,
        }),
        search: vi.fn(),
      },
    } as unknown as Stripe;

    await expect(
      findCustomerForUser(stripe, testConfig, {
        id: "user_123",
        email: "person@example.test",
      }),
    ).rejects.toThrow(/Ambiguous/);
  });
});

describe("subscription entitlement", () => {
  it("distinguishes an unavailable billing check from a configured free plan", () => {
    expect(UNAVAILABLE_BILLING_SUMMARY).toMatchObject({
      status: "unavailable",
      hasProAccess: false,
    });
  });

  it.each(["active", "trialing"] as const)(
    "grants Pro for an allowlisted %s subscription",
    (status) => {
      expect(classifySubscription(subscription({ status }), testConfig)).toMatchObject({
        plan: "pro",
        hasProAccess: true,
        isPro: true,
        status,
        planKey: "monthly",
        currentPeriodEnd: "2027-01-15T08:00:00.000Z",
      });
    },
  );

  it.each(["past_due", "unpaid", "paused", "incomplete"] as const)(
    "fails closed while preserving the actionable %s status",
    (status) => {
      expect(classifySubscription(subscription({ status }), testConfig)).toEqual(
        expect.objectContaining({
          plan: "free",
          status,
          hasProAccess: false,
        }),
      );
    },
  );

  it("treats a canceled subscription as inactive", () => {
    expect(
      classifySubscription(subscription({ status: "canceled" }), testConfig),
    ).toEqual(
      expect.objectContaining({
        plan: "free",
        status: "inactive",
        hasProAccess: false,
      }),
    );
  });

  it("fails closed for a foreign price, mode mismatch, quantity, or mixed items", () => {
    for (const candidate of [
      subscription({ priceId: "price_foreign123" }),
      subscription({ livemode: true }),
      subscription({ priceLivemode: true }),
      subscription({ quantity: 2 }),
      subscription({ itemCount: 2 }),
      subscription({ unitAmount: 1 }),
      subscription({ currency: "eur" }),
      subscription({ interval: "year" }),
    ]) {
      expect(classifySubscription(candidate, testConfig)).toEqual(
        expect.objectContaining({
          plan: "free",
          status: "inactive",
          hasProAccess: false,
        }),
      );
    }
  });

  it("blocks a second Checkout while a non-terminal subscription exists", () => {
    expect(hasBlockingSubscription([subscription({ status: "active" })], testConfig)).toBe(true);
    expect(hasBlockingSubscription([subscription({ status: "past_due" })], testConfig)).toBe(true);
    expect(hasBlockingSubscription([subscription({ status: "canceled" })], testConfig)).toBe(false);
    expect(
      hasBlockingSubscription(
        [subscription({ status: "incomplete_expired" })],
        testConfig,
      ),
    ).toBe(false);
    expect(
      hasBlockingSubscription(
        [subscription({ status: "active", priceId: "price_foreign123" })],
        testConfig,
      ),
    ).toBe(false);
  });

  it("tracks prior trial use only for configured ClearTag prices", () => {
    expect(
      hasUsedTrial(
        [subscription({ status: "canceled", trialUsed: true })],
        testConfig,
      ),
    ).toBe(true);
    expect(
      hasUsedTrial(
        [
          subscription({
            status: "canceled",
            trialUsed: true,
            priceId: "price_foreign123",
          }),
        ],
        testConfig,
      ),
    ).toBe(false);
  });
});

describe("checkout price configuration", () => {
  const monthlyPrice = {
    id: testConfig.prices.monthly,
    active: true,
    type: "recurring",
    livemode: false,
    currency: "usd",
    unit_amount: 1900,
    billing_scheme: "per_unit",
    transform_quantity: null,
    recurring: {
      interval: "month",
      interval_count: 1,
      usage_type: "licensed",
    },
  } as Stripe.Price;

  it("accepts only the expected USD amount and recurring scheme", () => {
    expect(() =>
      validateCheckoutPrice(monthlyPrice, testConfig, "monthly"),
    ).not.toThrow();
    for (const override of [
      { currency: "eur" },
      { unit_amount: 1 },
      { billing_scheme: "tiered" },
      { transform_quantity: { divide_by: 10, round: "up" } },
      { livemode: true },
      { recurring: { ...monthlyPrice.recurring, interval: "year" } },
    ]) {
      expect(() =>
        validateCheckoutPrice(
          { ...monthlyPrice, ...override } as Stripe.Price,
          testConfig,
          "monthly",
        ),
      ).toThrow(BillingConfigurationError);
    }
  });
});

describe("checkout handler", () => {
  it("creates a server-defined subscription checkout and idempotent customer", async () => {
    const customerCreate = vi.fn().mockResolvedValue({
      id: "cus_server",
      livemode: false,
      metadata: { cleartag_user_id: "user_123" },
    });
    const checkoutCreate = vi.fn().mockResolvedValue({
      url: "https://checkout.stripe.test/session",
    });
    const fakeStripe = {
      customers: {
        list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
        search: vi.fn().mockResolvedValue({ data: [] }),
        create: customerCreate,
      },
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: testConfig.prices.monthly,
          active: true,
          type: "recurring",
          livemode: false,
          currency: "usd",
          unit_amount: 1900,
          billing_scheme: "per_unit",
          transform_quantity: null,
          recurring: {
            interval: "month",
            interval_count: 1,
            usage_type: "licensed",
          },
        }),
      },
      subscriptions: {
        list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
      },
      checkout: {
        sessions: {
          list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
          expire: vi.fn(),
          create: checkoutCreate,
        },
      },
    } as unknown as Stripe;
    const handler = createCheckoutHandler({
      getUser: async () => ({ id: "user_123", email: "person@example.test" }),
      loadConfig: () => testConfig,
      makeStripe: () => fakeStripe,
    });
    const response = await handler(
      new Request("https://app.example/api/billing/checkout", {
        method: "POST",
        headers: {
          origin: "https://app.example",
          "content-type": "application/json",
          "idempotency-key": "018f1f52-9aba-7c84-b917-79f0e6b18c4a",
        },
        body: JSON.stringify({ planKey: "monthly", locale: "en" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://checkout.stripe.test/session",
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(customerCreate).toHaveBeenCalledWith(
      {
        email: "person@example.test",
        metadata: { cleartag_user_id: "user_123" },
      },
      { idempotencyKey: "cleartag-customer-user_123" },
    );
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        adaptive_pricing: { enabled: false },
        automatic_tax: { enabled: false },
        allow_promotion_codes: false,
        payment_method_collection: "always",
        locale: "en",
        customer: "cus_server",
        line_items: [{ price: testConfig.prices.monthly, quantity: 1 }],
        success_url: "https://app.example/billing?billing=success",
        cancel_url: "https://app.example/billing?billing=cancelled",
        subscription_data: expect.objectContaining({ trial_period_days: 14 }),
        metadata: {
          cleartag_user_id: "user_123",
          cleartag_plan_key: "monthly",
          cleartag_trial_eligible: "true",
          cleartag_checkout_policy_version: "1",
        },
      }),
      { idempotencyKey: "cleartag-checkout-user_123-policy-1" },
    );
  });

  it("derives the same server purchase-intent key for different request UUIDs", async () => {
    const checkoutCreate = vi.fn().mockResolvedValue({
      url: "https://checkout.stripe.test/session",
    });
    const fakeStripe = {
      customers: {
        list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
        search: vi.fn().mockResolvedValue({ data: [] }),
        create: vi.fn().mockResolvedValue({
          id: "cus_server",
          livemode: false,
          metadata: { cleartag_user_id: "user_123" },
        }),
      },
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: testConfig.prices.annual,
          active: true,
          type: "recurring",
          livemode: false,
          currency: "usd",
          unit_amount: 19000,
          billing_scheme: "per_unit",
          transform_quantity: null,
          recurring: {
            interval: "year",
            interval_count: 1,
            usage_type: "licensed",
          },
        }),
      },
      subscriptions: {
        list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
      },
      checkout: {
        sessions: {
          list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
          expire: vi.fn(),
          create: checkoutCreate,
        },
      },
    } as unknown as Stripe;
    const handler = createCheckoutHandler({
      getUser: async () => ({ id: "user_123", email: "person@example.test" }),
      loadConfig: () => testConfig,
      makeStripe: () => fakeStripe,
    });
    const makeRequest = (requestKey: string) =>
      new Request("https://app.example/api/billing/checkout", {
        method: "POST",
        headers: {
          origin: "https://app.example",
          "content-type": "application/json",
          "idempotency-key": requestKey,
        },
        body: JSON.stringify({ planKey: "annual", locale: "en" }),
      });

    expect(
      (
        await handler(
          makeRequest("d9428888-122b-4f2e-a4d2-8a680e158aa7"),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handler(
          makeRequest("018f1f52-9aba-7c84-b917-79f0e6b18c4a"),
        )
      ).status,
    ).toBe(200);
    expect(checkoutCreate).toHaveBeenCalledTimes(2);
    expect(checkoutCreate.mock.calls[0]?.[1]).toEqual(
      checkoutCreate.mock.calls[1]?.[1],
    );
    expect(checkoutCreate.mock.calls[0]?.[1]).toEqual({
      idempotencyKey: "cleartag-checkout-user_123-policy-1",
    });
  });

  it("reuses a matching open Checkout instead of creating another", async () => {
    const existingUrl = "https://checkout.stripe.test/existing";
    const existingSession = {
      id: "cs_test_existing",
      status: "open",
      mode: "subscription",
      livemode: false,
      customer: "cus_existing",
      client_reference_id: "user_123",
      metadata: {
        cleartag_user_id: "user_123",
        cleartag_plan_key: "monthly",
        cleartag_trial_eligible: "true",
        cleartag_checkout_policy_version: "1",
      },
      success_url: "https://app.example/billing?billing=success",
      cancel_url: "https://app.example/billing?billing=cancelled",
      url: existingUrl,
      line_items: {
        data: [
          {
            quantity: 1,
            price: { id: testConfig.prices.monthly },
          },
        ],
      },
    } as unknown as Stripe.Checkout.Session;
    const checkoutCreate = vi.fn();
    const checkoutExpire = vi.fn();
    const fakeStripe = {
      customers: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: "cus_existing",
              email: "person@example.test",
              livemode: false,
              metadata: { cleartag_user_id: "user_123" },
            },
          ],
          has_more: false,
        }),
        search: vi.fn(),
      },
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: testConfig.prices.monthly,
          active: true,
          type: "recurring",
          livemode: false,
          currency: "usd",
          unit_amount: 1900,
          billing_scheme: "per_unit",
          transform_quantity: null,
          recurring: {
            interval: "month",
            interval_count: 1,
            usage_type: "licensed",
          },
        }),
      },
      subscriptions: {
        list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
      },
      checkout: {
        sessions: {
          list: vi.fn().mockResolvedValue({
            data: [existingSession],
            has_more: false,
          }),
          create: checkoutCreate,
          expire: checkoutExpire,
        },
      },
    } as unknown as Stripe;
    const handler = createCheckoutHandler({
      getUser: async () => ({ id: "user_123", email: "person@example.test" }),
      loadConfig: () => testConfig,
      makeStripe: () => fakeStripe,
    });

    const response = await handler(
      new Request("https://app.example/api/billing/checkout", {
        method: "POST",
        headers: {
          origin: "https://app.example",
          "content-type": "application/json",
          "idempotency-key": "d9428888-122b-4f2e-a4d2-8a680e158aa7",
        },
        body: JSON.stringify({ planKey: "monthly", locale: "en" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: existingUrl });
    expect(checkoutCreate).not.toHaveBeenCalled();
    expect(checkoutExpire).not.toHaveBeenCalled();
  });

  it("does not promise a second trial after a prior ClearTag trial", async () => {
    const checkoutCreate = vi.fn().mockResolvedValue({
      url: "https://checkout.stripe.test/without-trial",
    });
    const customer = {
      id: "cus_existing",
      email: "person@example.test",
      livemode: false,
      metadata: { cleartag_user_id: "user_123" },
    };
    const fakeStripe = {
      customers: {
        list: vi.fn().mockResolvedValue({ data: [customer], has_more: false }),
        search: vi.fn(),
      },
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: testConfig.prices.monthly,
          active: true,
          type: "recurring",
          livemode: false,
          currency: "usd",
          unit_amount: 1900,
          billing_scheme: "per_unit",
          transform_quantity: null,
          recurring: {
            interval: "month",
            interval_count: 1,
            usage_type: "licensed",
          },
        }),
      },
      subscriptions: {
        list: vi.fn().mockResolvedValue({
          data: [
            subscription({
              status: "canceled",
              trialUsed: true,
            }),
          ],
          has_more: false,
        }),
      },
      checkout: {
        sessions: {
          list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
          create: checkoutCreate,
          expire: vi.fn(),
        },
      },
    } as unknown as Stripe;
    const handler = createCheckoutHandler({
      getUser: async () => ({ id: "user_123", email: "person@example.test" }),
      loadConfig: () => testConfig,
      makeStripe: () => fakeStripe,
    });

    const response = await handler(
      new Request("https://app.example/api/billing/checkout", {
        method: "POST",
        headers: {
          origin: "https://app.example",
          "content-type": "application/json",
          "idempotency-key": "d9428888-122b-4f2e-a4d2-8a680e158aa7",
        },
        body: JSON.stringify({ planKey: "monthly", locale: "en" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: {
          metadata: { cleartag_user_id: "user_123" },
        },
      }),
      expect.any(Object),
    );
  });

  it("rejects a second Checkout for a customer with an unresolved subscription", async () => {
    const checkoutCreate = vi.fn();
    const fakeStripe = {
      customers: {
        list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
        search: vi.fn().mockResolvedValue({
          data: [
            {
              id: "cus_existing",
              email: "person@example.test",
              livemode: false,
              metadata: { cleartag_user_id: "user_123" },
            },
          ],
        }),
      },
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: testConfig.prices.monthly,
          active: true,
          type: "recurring",
          livemode: false,
          currency: "usd",
          unit_amount: 1900,
          billing_scheme: "per_unit",
          transform_quantity: null,
          recurring: {
            interval: "month",
            interval_count: 1,
            usage_type: "licensed",
          },
        }),
      },
      subscriptions: {
        list: vi.fn().mockResolvedValue({
          data: [subscription({ status: "past_due" })],
          has_more: false,
        }),
      },
      checkout: { sessions: { create: checkoutCreate } },
    } as unknown as Stripe;
    const handler = createCheckoutHandler({
      getUser: async () => ({ id: "user_123", email: "person@example.test" }),
      loadConfig: () => testConfig,
      makeStripe: () => fakeStripe,
    });

    const response = await handler(
      new Request("https://app.example/api/billing/checkout", {
        method: "POST",
        headers: {
          origin: "https://app.example",
          "content-type": "application/json",
          "idempotency-key": "d9428888-122b-4f2e-a4d2-8a680e158aa7",
        },
        body: JSON.stringify({ planKey: "monthly", locale: "en" }),
      }),
    );

    expect(response.status).toBe(409);
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it("rejects cross-origin and client-supplied price data before Stripe is called", async () => {
    const makeStripe = vi.fn();
    const handler = createCheckoutHandler({
      getUser: async () => ({ id: "user_123", email: "person@example.test" }),
      loadConfig: () => testConfig,
      makeStripe,
    });
    const response = await handler(
      new Request("https://app.example/api/billing/checkout", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          planKey: "monthly",
          locale: "en",
          price: "price_attacker",
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(makeStripe).not.toHaveBeenCalled();
  });
});

describe("billing summary handler", () => {
  it.each(["configuration", "Stripe entitlement lookup"] as const)(
    "fails closed with an unavailable summary when %s fails",
    async (failure) => {
      const stripe = {
        customers: {
          list: vi.fn().mockRejectedValue(new Error("Stripe unavailable")),
        },
      } as unknown as Stripe;
      const handler = createSummaryHandler({
        getUser: async () => ({ id: "user_123", email: "person@example.test" }),
        loadConfig: () => {
          if (failure === "configuration") {
            throw new BillingConfigurationError("Billing unavailable");
          }
          return testConfig;
        },
        makeStripe: () => stripe,
      });

      const response = await handler();
      const cacheControl = response.headers.get("cache-control");

      expect(response.status).toBe(200);
      expect(cacheControl).toContain("private");
      expect(cacheControl).toContain("no-store");
      expect(await response.json()).toMatchObject({
        status: "unavailable",
        hasProAccess: false,
      });
    },
  );

  it("keeps the summary endpoint closed to unauthenticated callers", async () => {
    const loadConfig = vi.fn(() => testConfig);
    const makeStripe = vi.fn(() => ({}) as Stripe);
    const handler = createSummaryHandler({
      getUser: async () => null,
      loadConfig,
      makeStripe,
    });

    const response = await handler();

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(loadConfig).not.toHaveBeenCalled();
    expect(makeStripe).not.toHaveBeenCalled();
  });
});

describe("Cloudflare-compatible webhook verification", () => {
  it("verifies a Stripe signature asynchronously with SubtleCrypto", async () => {
    const payload = JSON.stringify({
      id: "evt_123",
      object: "event",
      type: "customer.subscription.updated",
      livemode: false,
      data: { object: {} },
    });
    const signature = await stripeSignature(payload, testConfig.webhookSecret);
    const event = await verifyWebhookEvent(
      createStripeClient(testConfig),
      payload,
      signature,
      testConfig.webhookSecret,
    );
    expect(event.id).toBe("evt_123");
    await expect(
      verifyWebhookEvent(
        createStripeClient(testConfig),
        `${payload} `,
        signature,
        testConfig.webhookSecret,
      ),
    ).rejects.toThrow();
  });

  it("rejects a signed event from the wrong Stripe mode without logging it", async () => {
    const payload = JSON.stringify({
      id: "evt_live",
      object: "event",
      type: "checkout.session.completed",
      livemode: true,
      data: { object: {} },
    });
    const signature = await stripeSignature(payload, testConfig.webhookSecret);
    const log = vi.fn();
    const handler = createWebhookHandler({
      loadConfig: () => testConfig,
      makeStripe: createStripeClient,
      log,
    });
    const response = await handler(
      new Request("https://app.example/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": signature },
        body: payload,
      }),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(log).not.toHaveBeenCalled();
  });

  it("logs only the verified event ID and type", async () => {
    const payload = JSON.stringify({
      id: "evt_test",
      object: "event",
      type: "customer.subscription.created",
      livemode: false,
      data: { object: { email: "must-not-be-logged@example.test" } },
    });
    const signature = await stripeSignature(payload, testConfig.webhookSecret);
    const log = vi.fn();
    const handler = createWebhookHandler({
      loadConfig: () => testConfig,
      makeStripe: createStripeClient,
      log,
    });
    const response = await handler(
      new Request("https://app.example/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": signature },
        body: payload,
      }),
    );
    expect(response.status).toBe(200);
    expect(log).toHaveBeenCalledExactlyOnceWith(
      "[stripe-webhook] event_id=evt_test event_type=customer.subscription.created",
    );
    expect(log.mock.calls.flat().join(" ")).not.toContain("example.test");
  });
});
