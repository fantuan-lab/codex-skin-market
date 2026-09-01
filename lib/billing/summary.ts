import type Stripe from "stripe";

import {
  type BillingConfig,
  type PlanKey,
  PLAN_UNIT_AMOUNTS_USD,
} from "@/lib/billing/config";
import {
  type BillingView,
  UNAVAILABLE_BILLING_VIEW,
} from "@/lib/billing/public";

export type BillingSummary = BillingView & {
  isPro: boolean;
};

export const FREE_BILLING_SUMMARY: BillingSummary = {
  plan: "free",
  hasProAccess: false,
  isPro: false,
  status: "free",
  planKey: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialEligible: true,
};

export const UNAVAILABLE_BILLING_SUMMARY: BillingSummary = {
  ...UNAVAILABLE_BILLING_VIEW,
  isPro: false,
};

const INACTIVE_BILLING_SUMMARY: BillingSummary = {
  ...FREE_BILLING_SUMMARY,
  status: "inactive",
};

type SubscriptionLike = Pick<
  Stripe.Subscription,
  | "status"
  | "livemode"
  | "cancel_at_period_end"
  | "items"
  | "trial_start"
  | "trial_end"
>;

function configuredPlanKey(
  subscription: SubscriptionLike,
  config: BillingConfig,
): PlanKey | null {
  if (
    subscription.livemode !== config.expectLiveMode ||
    subscription.items.data.length !== 1
  ) {
    return null;
  }

  const item = subscription.items.data[0];
  if (
    !item ||
    item.quantity !== 1 ||
    item.price.livemode !== config.expectLiveMode ||
    !Number.isSafeInteger(item.current_period_end) ||
    item.current_period_end <= 0
  ) {
    return null;
  }

  const planKey = (Object.entries(config.prices) as [PlanKey, string][]).find(
    ([, priceId]) => priceId === item.price.id,
  )?.[0];
  const expectedInterval = planKey === "monthly" ? "month" : "year";
  if (
    !planKey ||
    item.price.currency !== "usd" ||
    item.price.unit_amount !== PLAN_UNIT_AMOUNTS_USD[planKey] ||
    item.price.billing_scheme !== "per_unit" ||
    item.price.transform_quantity !== null ||
    item.price.type !== "recurring" ||
    item.price.recurring?.interval !== expectedInterval ||
    item.price.recurring.interval_count !== 1 ||
    item.price.recurring.usage_type !== "licensed"
  ) {
    return null;
  }
  return planKey;
}

export function classifySubscription(
  subscription: SubscriptionLike,
  config: BillingConfig,
): BillingSummary {
  const planKey = configuredPlanKey(subscription, config);
  if (!planKey) return INACTIVE_BILLING_SUMMARY;

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    const actionableStatus = ["past_due", "unpaid", "incomplete", "paused"].includes(
      subscription.status,
    )
      ? (subscription.status as BillingSummary["status"])
      : "inactive";
    return {
      ...INACTIVE_BILLING_SUMMARY,
      status: actionableStatus,
      trialEligible: subscription.trial_start === null && subscription.trial_end === null,
    };
  }

  const item = subscription.items.data[0]!;
  return {
    plan: "pro",
    hasProAccess: true,
    isPro: true,
    status: subscription.status === "active" ? "active" : "trialing",
    planKey,
    currentPeriodEnd: new Date(item.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEligible: false,
  };
}

export function summarizeSubscriptions(
  subscriptions: SubscriptionLike[],
  config: BillingConfig,
): BillingSummary {
  let fallback = INACTIVE_BILLING_SUMMARY;
  for (const subscription of subscriptions) {
    const summary = classifySubscription(subscription, config);
    if (summary.isPro) return summary;
    if (summary.status !== "inactive" && fallback.status === "inactive") {
      fallback = summary;
    }
  }
  return {
    ...fallback,
    trialEligible: !hasUsedTrial(subscriptions, config),
  };
}

export function hasBlockingSubscription(
  subscriptions: SubscriptionLike[],
  config: BillingConfig,
): boolean {
  return subscriptions.some(
    (subscription) =>
      subscription.status !== "canceled" &&
      subscription.status !== "incomplete_expired" &&
      hasConfiguredPriceId(subscription, config),
  );
}

export function hasUsedTrial(
  subscriptions: SubscriptionLike[],
  config: BillingConfig,
): boolean {
  return subscriptions.some(
    (subscription) =>
      hasConfiguredPriceId(subscription, config) &&
      (subscription.trial_start !== null || subscription.trial_end !== null),
  );
}

function hasConfiguredPriceId(
  subscription: SubscriptionLike,
  config: BillingConfig,
): boolean {
  const configuredPriceIds = new Set(Object.values(config.prices));
  return (
    subscription.livemode === config.expectLiveMode &&
    subscription.items.data.some(
      (item) =>
        item.price.livemode === config.expectLiveMode &&
        configuredPriceIds.has(item.price.id),
    )
  );
}
