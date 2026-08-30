"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createBrowserSupabaseClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  return createBrowserClient(config.url, config.publishableKey);
}
