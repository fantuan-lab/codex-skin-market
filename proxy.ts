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
  const isProtected = isProtectedPath(request.nextUrl.pathname);
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
        new URL(loginPathFor(returnTo), request.url),
        { status: 303 },
      );

  applySessionMutations(response, pendingCookies, responseHeaders);
  return applyPrivateNoStore(response);
}

export const config = {
  matcher: ["/login", "/zh/login", "/workspace/:path*", "/zh/workspace/:path*"],
};

function protectedLoginRedirect(
  request: NextRequest,
  returnTo: string,
): NextResponse {
  return applyPrivateNoStore(
    NextResponse.redirect(new URL(loginPathFor(returnTo), request.url), {
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
