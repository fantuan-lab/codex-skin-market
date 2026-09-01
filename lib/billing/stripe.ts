import Stripe from "stripe";

import type { AuthenticatedUser } from "@/lib/auth/server";
import {
  type BillingConfig,
  BillingConfigurationError,
  CHECKOUT_POLICY_VERSION,
  PLAN_UNIT_AMOUNTS_USD,
  STRIPE_API_VERSION,
} from "@/lib/billing/config";

export function createStripeClient(config: BillingConfig): Stripe {
  return new Stripe(config.secretKey, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
    telemetry: false,
  });
}

function customerSearchQuery(userId: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
    throw new Error("Invalid authenticated user ID");
  }
  return `metadata['cleartag_user_id']:'${userId}'`;
}

export function assertLivemode(
  resource: { livemode: boolean },
  config: BillingConfig,
): void {
  if (resource.livemode !== config.expectLiveMode) {
    throw new BillingConfigurationError("Stripe resource mode mismatch");
  }
}

export async function findCustomerForUser(
  stripe: Stripe,
  config: BillingConfig,
  user: Pick<AuthenticatedUser, "id" | "email">,
): Promise<Stripe.Customer | null> {
  const listed = await stripe.customers.list({ email: user.email, limit: 100 });
  const listedMatches = listed.data.filter(
    (customer) => customer.metadata.cleartag_user_id === user.id,
  );
  if (listed.has_more || listedMatches.length > 1) {
    throw new BillingConfigurationError("Ambiguous Stripe customer mapping");
  }
  if (listedMatches[0]) {
    assertLivemode(listedMatches[0], config);
    return listedMatches[0];
  }

  const result = await stripe.customers.search({
    query: customerSearchQuery(user.id),
    limit: 10,
  });
  const customers = result.data.filter(
    (customer) => customer.metadata.cleartag_user_id === user.id,
  );
  if (result.has_more || customers.length > 1) {
    throw new BillingConfigurationError("Ambiguous Stripe customer mapping");
  }
  for (const customer of customers) assertLivemode(customer, config);
  return customers[0] ?? null;
}

export async function getOrCreateCustomerForUser(
  stripe: Stripe,
  config: BillingConfig,
  user: AuthenticatedUser,
): Promise<Stripe.Customer> {
  const existing = await findCustomerForUser(stripe, config, user);
  if (existing) {
    if (existing.email === user.email) return existing;
    const updated = await stripe.customers.update(existing.id, {
      email: user.email,
    });
    assertLivemode(updated, config);
    return updated;
  }

  const customer = await stripe.customers.create(
    {
      email: user.email,
      metadata: { cleartag_user_id: user.id },
    },
    { idempotencyKey: `cleartag-customer-${user.id}` },
  );
  assertLivemode(customer, config);
  return customer;
}

export function validateCheckoutPrice(
  price: Stripe.Price,
  config: BillingConfig,
  planKey: "monthly" | "annual",
): void {
  const expectedInterval = planKey === "monthly" ? "month" : "year";
  if (
    price.id !== config.prices[planKey] ||
    !price.active ||
    price.currency !== "usd" ||
    price.unit_amount !== PLAN_UNIT_AMOUNTS_USD[planKey] ||
    price.billing_scheme !== "per_unit" ||
    price.transform_quantity !== null ||
    price.type !== "recurring" ||
    price.recurring?.interval !== expectedInterval ||
    price.recurring.interval_count !== 1 ||
    price.recurring.usage_type !== "licensed"
  ) {
    throw new BillingConfigurationError("Configured Stripe price is invalid");
  }
  assertLivemode(price, config);
}

export function isClearTagCheckoutSession(
  session: Stripe.Checkout.Session,
  config: BillingConfig,
  userId: string,
  customerId: string,
): boolean {
  const sessionCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  return (
    session.status === "open" &&
    session.mode === "subscription" &&
    session.livemode === config.expectLiveMode &&
    sessionCustomerId === customerId &&
    session.client_reference_id === userId &&
    session.metadata?.cleartag_user_id === userId
  );
}

export function isReusableCheckoutSession(
  session: Stripe.Checkout.Session,
  config: BillingConfig,
  userId: string,
  customerId: string,
  planKey: "monthly" | "annual",
  trialEligible: boolean,
  successUrl: string,
  cancelUrl: string,
): session is Stripe.Checkout.Session & { url: string } {
  const lineItems = session.line_items?.data ?? [];
  const lineItem = lineItems[0];
  return (
    isClearTagCheckoutSession(session, config, userId, customerId) &&
    session.metadata?.cleartag_plan_key === planKey &&
    session.metadata?.cleartag_trial_eligible === String(trialEligible) &&
    session.metadata?.cleartag_checkout_policy_version ===
      CHECKOUT_POLICY_VERSION &&
    session.success_url === successUrl &&
    session.cancel_url === cancelUrl &&
    typeof session.url === "string" &&
    lineItems.length === 1 &&
    lineItem?.quantity === 1 &&
    lineItem.price?.id === config.prices[planKey]
  );
}
