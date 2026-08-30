import { type NextRequest, NextResponse } from "next/server";

import { loginPathFor, safeReturnPath } from "@/lib/auth/paths";
import { applyPrivateNoStore } from "@/lib/auth/response";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const returnTo = safeReturnPath(
    request.nextUrl.searchParams.get("returnTo") ??
      request.nextUrl.searchParams.get("next"),
  );

  if (!code) return callbackFailure(request, returnTo, "missing_code");

  const response = applyPrivateNoStore(
    NextResponse.redirect(new URL(returnTo, request.url), { status: 303 }),
  );
  const supabase = createRouteHandlerSupabaseClient(request, response);
  if (!supabase) return callbackFailure(request, returnTo, "not_configured");

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return callbackFailure(request, returnTo, "exchange_failed");
  } catch {
    return callbackFailure(request, returnTo, "exchange_failed");
  }

  return response;
}

function callbackFailure(
  request: NextRequest,
  returnTo: string,
  reason: "missing_code" | "not_configured" | "exchange_failed",
): NextResponse {
  const loginUrl = new URL(loginPathFor(returnTo), request.url);
  loginUrl.searchParams.set("error", reason);
  return applyPrivateNoStore(NextResponse.redirect(loginUrl, { status: 303 }));
}
