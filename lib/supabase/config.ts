export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export class SupabaseConfigurationError extends Error {
  constructor() {
    super(
      "Supabase authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
    this.name = "SupabaseConfigurationError";
  }
}

type PublicEnvironment = Readonly<{
  [name: string]: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}>;

export function getSupabasePublicConfig(
  environment: PublicEnvironment = process.env,
): SupabasePublicConfig | null {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey || !isAllowedSupabaseUrl(url)) return null;
  if (isPrivilegedKey(publishableKey)) return null;

  return { url, publishableKey };
}

export function requireSupabasePublicConfig(
  environment: PublicEnvironment = process.env,
): SupabasePublicConfig {
  const config = getSupabasePublicConfig(environment);
  if (!config) throw new SupabaseConfigurationError();
  return config;
}

function isAllowedSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (url.protocol === "https:") return true;

    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function isPrivilegedKey(value: string): boolean {
  if (value.startsWith("sb_secret_")) return true;

  const [, payload] = value.split(".");
  if (!payload) return false;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const decoded = JSON.parse(globalThis.atob(padded)) as { role?: unknown };
    return decoded.role === "service_role" || decoded.role === "supabase_admin";
  } catch {
    return false;
  }
}
