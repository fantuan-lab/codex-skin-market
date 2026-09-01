import type Stripe from "stripe";

import type { AuthenticatedUser } from "@/lib/auth/server";
import { getBillingConfig } from "@/lib/billing/config";
import {
  createStripeClient,
  findCustomerForUser,
} from "@/lib/billing/stripe";
import {
  type BillingSummary,
  FREE_BILLING_SUMMARY,
  summarizeSubscriptions,
  UNAVAILABLE_BILLING_SUMMARY,
} from "@/lib/billing/summary";

export type { BillingSummary } from "@/lib/billing/summary";

/**
 * Reads current entitlement directly from Stripe. The caller must pass an
 * identity obtained from server-verified authentication, never client input.
 */
export async function getBillingSummary(
  user: Pick<AuthenticatedUser, "id" | "email">,
): Promise<BillingSummary> {
  try {
    const config = getBillingConfig();
    const stripe = createStripeClient(config);
    const customer = await findCustomerForUser(stripe, config, user);
    if (!customer) return FREE_BILLING_SUMMARY;

    const subscriptions = await listAllSubscriptionsForCustomer(stripe, customer.id);
    return summarizeSubscriptions(subscriptions, config);
  } catch {
    // Entitlements fail closed, while server-rendered pages remain available.
    return UNAVAILABLE_BILLING_SUMMARY;
  }
}

export async function listAllSubscriptionsForCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Subscription[]> {
  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    subscriptions.push(...page.data);
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);
  return subscriptions;
}
