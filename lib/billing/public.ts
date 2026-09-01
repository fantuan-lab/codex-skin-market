export const BILLING_STATUS_VALUES = [
  "free",
  "inactive",
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
  "unavailable",
] as const;

export type BillingStatus = (typeof BILLING_STATUS_VALUES)[number];
export type BillingPlan = "free" | "pro";
export type BillingPlanKey = "monthly" | "annual";

export type BillingView = {
  plan: BillingPlan;
  status: BillingStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasProAccess: boolean;
  planKey: BillingPlanKey | null;
  trialEligible: boolean;
};

export const UNAVAILABLE_BILLING_VIEW: BillingView = {
  plan: "free",
  status: "unavailable",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  hasProAccess: false,
  planKey: null,
  trialEligible: false,
};

export function parseBillingView(value: unknown): BillingView | null {
  if (!isRecord(value)) return null;
  const plan = value.plan;
  const status = value.status;
  const planKey = value.planKey;
  const currentPeriodEnd = value.currentPeriodEnd;
  if (
    (plan !== "free" && plan !== "pro") ||
    !BILLING_STATUS_VALUES.includes(status as BillingStatus) ||
    (planKey !== null && planKey !== "monthly" && planKey !== "annual") ||
    (currentPeriodEnd !== null && typeof currentPeriodEnd !== "string") ||
    typeof value.cancelAtPeriodEnd !== "boolean" ||
    typeof value.hasProAccess !== "boolean" ||
    typeof value.trialEligible !== "boolean"
  ) {
    return null;
  }

  const hasProAccess = value.hasProAccess;
  if (
    hasProAccess !== (plan === "pro") ||
    (hasProAccess && status !== "active" && status !== "trialing") ||
    (hasProAccess && planKey === null) ||
    (status === "unavailable" && hasProAccess)
  ) {
    return null;
  }

  return {
    plan,
    status: status as BillingStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd: value.cancelAtPeriodEnd,
    hasProAccess,
    planKey,
    trialEligible: value.trialEligible,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
