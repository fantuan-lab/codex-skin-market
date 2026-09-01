export const STRIPE_API_VERSION = "2026-08-26.dahlia" as const;
export const CHECKOUT_POLICY_VERSION = "1" as const;

export const PLAN_KEYS = ["monthly", "annual"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_UNIT_AMOUNTS_USD: Record<PlanKey, number> = {
  monthly: 1900,
  annual: 19000,
};

export type BillingConfig = {
  secretKey: string;
  webhookSecret: string;
  expectLiveMode: boolean;
  prices: Record<PlanKey, string>;
};

export class BillingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingConfigurationError";
  }
}

type BillingEnvironment = Record<string, string | undefined>;

function required(env: BillingEnvironment, name: keyof BillingEnvironment): string {
  const value = env[name];
  if (!value || value.trim() !== value) {
    throw new BillingConfigurationError(`${name} is required and must not contain whitespace`);
  }
  return value;
}

function parseExpectedMode(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new BillingConfigurationError(
    "STRIPE_EXPECT_LIVE_MODE must be exactly true or false",
  );
}

export function isPlanKey(value: unknown): value is PlanKey {
  return value === "monthly" || value === "annual";
}

export function parseBillingConfig(env: BillingEnvironment): BillingConfig {
  const secretKey = required(env, "STRIPE_SECRET_KEY");
  const webhookSecret = required(env, "STRIPE_WEBHOOK_SECRET");
  const expectLiveMode = parseExpectedMode(
    required(env, "STRIPE_EXPECT_LIVE_MODE"),
  );
  const monthly = required(env, "STRIPE_MONTHLY_PRICE_ID");
  const annual = required(env, "STRIPE_ANNUAL_PRICE_ID");

  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(secretKey)) {
    throw new BillingConfigurationError("STRIPE_SECRET_KEY has an invalid format");
  }
  if (!/^whsec_[A-Za-z0-9]+$/.test(webhookSecret)) {
    throw new BillingConfigurationError(
      "STRIPE_WEBHOOK_SECRET has an invalid format",
    );
  }
  if (!/^price_[A-Za-z0-9]+$/.test(monthly) || !/^price_[A-Za-z0-9]+$/.test(annual)) {
    throw new BillingConfigurationError("Stripe price ID has an invalid format");
  }
  if (monthly === annual) {
    throw new BillingConfigurationError("Monthly and annual prices must differ");
  }

  const keyIsLive = /^(sk|rk)_live_/.test(secretKey);
  if (keyIsLive !== expectLiveMode) {
    throw new BillingConfigurationError(
      "Stripe secret key mode does not match STRIPE_EXPECT_LIVE_MODE",
    );
  }

  return {
    secretKey,
    webhookSecret,
    expectLiveMode,
    prices: { monthly, annual },
  };
}

export function getBillingConfig(): BillingConfig {
  return parseBillingConfig(process.env);
}
