type HeaderReader = {
  get(name: string): string | null;
};

export function requestUsesHttps(
  urlProtocol: string | null | undefined,
  requestHeaders: HeaderReader,
): boolean {
  if (urlProtocol?.toLowerCase() === "https:") return true;

  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProtocol === "https") return true;

  const cloudflareVisitor = requestHeaders.get("cf-visitor");
  if (!cloudflareVisitor) return false;

  try {
    const visitor = JSON.parse(cloudflareVisitor) as { scheme?: unknown };
    return visitor.scheme === "https";
  } catch {
    return false;
  }
}
