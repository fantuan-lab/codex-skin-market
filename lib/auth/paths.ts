const DEFAULT_RETURN_PATH = "/workspace";
const LOCAL_ORIGIN = "https://cleartag.local";

const PUBLIC_PATHS = new Set(["/", "/zh", "/login", "/zh/login"]);
const RESERVED_AUTH_PATHS = ["/auth", "/login", "/zh/login"];
const PROTECTED_ROOTS = ["/workspace", "/zh/workspace"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/auth/") ||
    pathname === "/auth"
  );
}

export function safeReturnPath(
  candidate: string | null | undefined,
  fallback = DEFAULT_RETURN_PATH,
): string {
  const safeFallback = parseAllowedReturnPath(fallback) ?? DEFAULT_RETURN_PATH;
  if (!candidate) return safeFallback;
  return parseAllowedReturnPath(candidate) ?? safeFallback;
}

export function loginPathFor(returnTo: string): string {
  const safeReturnTo = safeReturnPath(returnTo);
  const loginPath = safeReturnTo.startsWith("/zh/") ? "/zh/login" : "/login";
  return `${loginPath}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

function parseAllowedReturnPath(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;

  try {
    const url = new URL(value, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN) return null;
    if (!isProtectedPath(url.pathname)) return null;
    if (RESERVED_AUTH_PATHS.some((path) => url.pathname.startsWith(path))) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
