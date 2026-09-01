import Stripe from "stripe";

import { getBillingConfig } from "@/lib/billing/config";
import { billingError, privateJson } from "@/lib/billing/response";
import { createStripeClient } from "@/lib/billing/stripe";
import { readLimitedText } from "@/lib/billing/security";

type WebhookDependencies = {
  loadConfig: typeof getBillingConfig;
  makeStripe: typeof createStripeClient;
  log: (message: string) => void;
};

const defaultDependencies: WebhookDependencies = {
  loadConfig: getBillingConfig,
  makeStripe: createStripeClient,
  log: console.info,
};

export async function verifyWebhookEvent(
  stripe: Stripe,
  payload: string,
  signature: string,
  secret: string,
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEventAsync(
    payload,
    signature,
    secret,
    undefined,
    Stripe.createSubtleCryptoProvider(),
  );
}

export function createWebhookHandler(
  dependencies: WebhookDependencies = defaultDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const signature = request.headers.get("stripe-signature");
      if (!signature) return billingError(400);
      const config = dependencies.loadConfig();
      const stripe = dependencies.makeStripe(config);
      const payload = await readLimitedText(request, 1_048_576);
      const event = await verifyWebhookEvent(
        stripe,
        payload,
        signature,
        config.webhookSecret,
      );
      if (event.livemode !== config.expectLiveMode) return billingError(400);

      dependencies.log(
        `[stripe-webhook] event_id=${event.id} event_type=${event.type}`,
      );
      return privateJson({ received: true });
    } catch {
      return billingError(400);
    }
  };
}

export const webhookHandler = createWebhookHandler();
