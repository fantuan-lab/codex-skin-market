import type { AuthenticatedUser } from "@/lib/auth/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import {
  CHECKOUT_POLICY_VERSION,
  getBillingConfig,
} from "@/lib/billing/config";
import { billingError, privateJson } from "@/lib/billing/response";
import {
  BillingRequestError,
  billingReturnPaths,
  parseCheckoutBody,
  parsePortalBody,
  readLimitedText,
  requireCheckoutIdempotencyKey,
  requireSameOrigin,
} from "@/lib/billing/security";
import {
  createStripeClient,
  findCustomerForUser,
  getOrCreateCustomerForUser,
  isClearTagCheckoutSession,
  isReusableCheckoutSession,
  validateCheckoutPrice,
} from "@/lib/billing/stripe";
import {
  FREE_BILLING_SUMMARY,
  hasBlockingSubscription,
  hasUsedTrial,
  summarizeSubscriptions,
  UNAVAILABLE_BILLING_SUMMARY,
} from "@/lib/billing/summary";
import { listAllSubscriptionsForCustomer } from "@/lib/billing/server";

export type HandlerDependencies = {
  getUser: () => Promise<AuthenticatedUser | null>;
  loadConfig: typeof getBillingConfig;
  makeStripe: typeof createStripeClient;
};

const defaultDependencies: HandlerDependencies = {
  getUser: getAuthenticatedUser,
  loadConfig: getBillingConfig,
  makeStripe: createStripeClient,
};

async function jsonBody(request: Request): Promise<unknown> {
  try {
    const text = await readLimitedText(request, 1_024);
    return text ? JSON.parse(text) : {};
  } catch {
    throw new BillingRequestError();
  }
}

async function authenticatedUser(
  dependencies: HandlerDependencies,
): Promise<AuthenticatedUser | Response> {
  const user = await dependencies.getUser();
  return user ?? billingError(401);
}

export function createCheckoutHandler(
  dependencies: HandlerDependencies = defaultDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const origin = requireSameOrigin(request);
      requireCheckoutIdempotencyKey(request);
      const user = await authenticatedUser(dependencies);
      if (user instanceof Response) return user;
      const input = parseCheckoutBody(await jsonBody(request));

      const config = dependencies.loadConfig();
      const stripe = dependencies.makeStripe(config);
      const price = await stripe.prices.retrieve(config.prices[input.planKey]);
      validateCheckoutPrice(price, config, input.planKey);
      const customer = await getOrCreateCustomerForUser(stripe, config, user);
      const subscriptions = await listAllSubscriptionsForCustomer(stripe, customer.id);
      if (hasBlockingSubscription(subscriptions, config)) return billingError(409);
      const trialEligible = !hasUsedTrial(subscriptions, config);
      const paths = billingReturnPaths(input.locale);
      const successUrl = `${origin}${paths.successPath}`;
      const cancelUrl = `${origin}${paths.cancelPath}`;
      const openSessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        status: "open",
        limit: 100,
        expand: ["data.line_items"],
      });
      if (openSessions.has_more) return billingError(409);

      const ownedOpenSessions = openSessions.data.filter((session) =>
        isClearTagCheckoutSession(session, config, user.id, customer.id),
      );
      if (
        ownedOpenSessions.length === 1 &&
        isReusableCheckoutSession(
          ownedOpenSessions[0],
          config,
          user.id,
          customer.id,
          input.planKey,
          trialEligible,
          successUrl,
          cancelUrl,
        )
      ) {
        return privateJson({ url: ownedOpenSessions[0].url });
      }

      let checkoutIntentKey =
        `cleartag-checkout-${user.id}-policy-${CHECKOUT_POLICY_VERSION}`;
      if (ownedOpenSessions.length > 0) {
        await Promise.all(
          ownedOpenSessions.map((session) =>
            stripe.checkout.sessions.expire(session.id),
          ),
        );
        const latestSessionId = ownedOpenSessions
          .map(({ id }) => id)
          .toSorted()
          .at(-1);
        if (!latestSessionId) return billingError(409);
        checkoutIntentKey = `${checkoutIntentKey}-after-${latestSessionId}`;
      }
      if (checkoutIntentKey.length > 255) return billingError(409);

      const session = await stripe.checkout.sessions.create(
        {
          mode: "subscription",
          adaptive_pricing: { enabled: false },
          automatic_tax: { enabled: false },
          allow_promotion_codes: false,
          payment_method_collection: "always",
          locale: input.locale,
          customer: customer.id,
          client_reference_id: user.id,
          line_items: [{ price: config.prices[input.planKey], quantity: 1 }],
          subscription_data: {
            ...(trialEligible ? { trial_period_days: 14 } : {}),
            metadata: { cleartag_user_id: user.id },
          },
          metadata: {
            cleartag_user_id: user.id,
            cleartag_plan_key: input.planKey,
            cleartag_trial_eligible: String(trialEligible),
            cleartag_checkout_policy_version: CHECKOUT_POLICY_VERSION,
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        {
          // A stable server-derived purchase-intent key serializes concurrent
          // requests even when callers supply different request UUIDs.
          idempotencyKey: checkoutIntentKey,
        },
      );
      if (!session.url) return billingError();
      return privateJson({ url: session.url });
    } catch (error) {
      return billingError(error instanceof BillingRequestError ? 400 : 500);
    }
  };
}

export function createPortalHandler(
  dependencies: HandlerDependencies = defaultDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const origin = requireSameOrigin(request);
      const user = await authenticatedUser(dependencies);
      if (user instanceof Response) return user;
      const input = parsePortalBody(await jsonBody(request));

      const config = dependencies.loadConfig();
      const stripe = dependencies.makeStripe(config);
      const customer = await findCustomerForUser(stripe, config, user);
      if (!customer) return billingError(404);
      const paths = billingReturnPaths(input.locale);
      const session = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${origin}${paths.portalReturnPath}`,
      });
      return privateJson({ url: session.url });
    } catch (error) {
      return billingError(error instanceof BillingRequestError ? 400 : 500);
    }
  };
}

export function createSummaryHandler(
  dependencies: HandlerDependencies = defaultDependencies,
): () => Promise<Response> {
  return async () => {
    try {
      const user = await authenticatedUser(dependencies);
      if (user instanceof Response) return user;
      const config = dependencies.loadConfig();
      const stripe = dependencies.makeStripe(config);
      const customer = await findCustomerForUser(stripe, config, user);
      if (!customer) return privateJson(FREE_BILLING_SUMMARY);

      const subscriptions = await listAllSubscriptionsForCustomer(stripe, customer.id);
      return privateJson(summarizeSubscriptions(subscriptions, config));
    } catch {
      return privateJson(UNAVAILABLE_BILLING_SUMMARY);
    }
  };
}

export const checkoutHandler = createCheckoutHandler();
export const portalHandler = createPortalHandler();
export const summaryHandler = createSummaryHandler();
