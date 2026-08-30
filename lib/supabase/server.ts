import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { requestUsesHttps } from "@/lib/supabase/protocol";

export async function createServerSupabaseClient(): Promise<SupabaseClient | null> {
  const config = getSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!config) return null;

  const cookieStore = await cookies();
  const requestHeaders = await headers();

  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: { secure: requestUsesHttps(undefined, requestHeaders) },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always mutate cookies. The proxy refreshes
          // the session before protected Server Components are rendered.
        }
      },
    },
  });
}

export function createRouteHandlerSupabaseClient(
  request: NextRequest,
  response: NextResponse,
): SupabaseClient | null {
  const config = getSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!config) return null;

  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: {
      secure: requestUsesHttps(request.nextUrl.protocol, request.headers),
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, responseHeaders) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(responseHeaders).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });
}
