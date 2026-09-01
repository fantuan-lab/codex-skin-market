import { webhookHandler } from "@/lib/billing/webhook";

export const runtime = "edge";

export const POST = webhookHandler;
