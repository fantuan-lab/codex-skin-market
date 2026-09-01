import { applyPrivateNoStore } from "@/lib/auth/response";

export function privateJson(
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return applyPrivateNoStore(
    new Response(JSON.stringify(body), { ...init, headers }),
  );
}

export function billingError(status = 500): Response {
  return privateJson({ error: "Unable to complete the billing request." }, { status });
}
