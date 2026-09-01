import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isLoginPath, isProtectedPath, loginPathFor } from "@/lib/auth/paths";
import { applyPrivateNoStore } from "@/lib/auth/response";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { requestUsesHttps } from "@/lib/supabase/protocol";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const isBilling = isBillingPagePath(request.nextUrl.pathname);
  const isProtected = isProtectedPath(request.nextUrl.pathname) || isBilling;
  const isLogin = isLoginPath(request.nextUrl.pathname);
  if (!isProtected && !isLogin) {
    return NextResponse.next({ request });
  }

  const config = getSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!config) {
    return isProtected
      ? protectedLoginRedirect(request, returnTo)
      : applyPrivateNoStore(NextResponse.next({ request }));
  }

  const pendingCookies: PendingCookie[] = [];
  const responseHeaders = new Headers();

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookieOptions: {
      secure: requestUsesHttps(request.nextUrl.protocol, request.headers),
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach((cookie) => {
          request.cookies.set(cookie.name, cookie.value);
          pendingCookies.push(cookie);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          responseHeaders.set(name, value);
        });
      },
    },
  });

  let authenticated = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    authenticated = !error && typeof data?.claims?.sub === "string";
  } catch {
    authenticated = false;
  }

  const response = authenticated || isLogin
    ? NextResponse.next({ request })
    : NextResponse.redirect(
        new URL(
          isBilling
            ? billingLoginPathFor(returnTo, request.nextUrl.pathname)
            : loginPathFor(returnTo),
          request.url,
        ),
        { status: 303 },
      );

  applySessionMutations(response, pendingCookies, responseHeaders);
  return applyPrivateNoStore(response);
}

export const config = {
  matcher: [
    "/login",
    "/zh/login",
    "/workspace/:path*",
    "/zh/workspace/:path*",
    "/billing/:path*",
    "/zh/billing/:path*",
  ],
};

function isBillingPagePath(pathname: string): boolean {
  return (
    pathname === "/billing" ||
    pathname.startsWith("/billing/") ||
    pathname === "/zh/billing" ||
    pathname.startsWith("/zh/billing/")
  );
}

function billingLoginPathFor(returnTo: string, pathname: string): string {
  const loginPath = pathname.startsWith("/zh/") ? "/zh/login" : "/login";
  return `${loginPath}?returnTo=${encodeURIComponent(returnTo)}`;
}

function protectedLoginRedirect(
  request: NextRequest,
  returnTo: string,
): NextResponse {
  const loginPath = isBillingPagePath(request.nextUrl.pathname)
    ? billingLoginPathFor(returnTo, request.nextUrl.pathname)
    : loginPathFor(returnTo);
  return applyPrivateNoStore(
    NextResponse.redirect(new URL(loginPath, request.url), {
      status: 303,
    }),
  );
}

function applySessionMutations(
  response: NextResponse,
  pendingCookies: PendingCookie[],
  responseHeaders: Headers,
): void {
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  responseHeaders.forEach((value, name) => {
    response.headers.set(name, value);
  });
}
