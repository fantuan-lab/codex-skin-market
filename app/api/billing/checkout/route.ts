import { checkoutHandler } from "@/lib/billing/handlers";

export const runtime = "edge";

export const POST = checkoutHandler;
