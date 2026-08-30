"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createBrowserSupabaseClient(): SupabaseClient | null {
  // Keep these as direct process.env references so Vinext/Vite can replace the
  // public values in the browser bundle at build time. Passing process.env as a
  // dynamic object leaves it empty in the client runtime.
  const config = getSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!config) return null;

  return createBrowserClient(config.url, config.publishableKey, {
    cookieOptions: {
      secure: window.location.protocol === "https:",
    },
  });
}
