import { readFileSync } from "node:fs";

import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { config, proxy } from "@/proxy";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("billing route protection", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  afterAll(() => {
    restoreEnvironment(
      "NEXT_PUBLIC_SUPABASE_URL",
      originalSupabaseUrl,
    );
    restoreEnvironment(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      originalSupabaseKey,
    );
  });

  it.each([
    ["/billing?source=nav", "/login", "/billing?source=nav"],
    ["/zh/billing", "/zh/login", "/zh/billing"],
  ])(
    "fails closed without Auth configuration for %s",
    async (pathname, loginPath, returnTo) => {
      const response = await proxy(request(pathname));
      const location = new URL(response.headers.get("location")!);

      expect(response.status).toBe(303);
      expect(location.pathname).toBe(loginPath);
      expect(location.searchParams.get("returnTo")).toBe(returnTo);
      expect(response.headers.get("cache-control")).toContain("no-store");
    },
  );

  it("matches billing pages without intercepting the Stripe webhook", async () => {
    expect(config.matcher).toEqual(
      expect.arrayContaining(["/billing/:path*", "/zh/billing/:path*"]),
    );
    expect(config.matcher.join(" ")).not.toContain("stripe/webhook");

    const response = await proxy(request("/api/stripe/webhook"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBeNull();
  });
});

describe("billing deployment documentation", () => {
  const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  it.each([
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_MONTHLY_PRICE_ID",
    "STRIPE_ANNUAL_PRICE_ID",
    "STRIPE_EXPECT_LIVE_MODE",
  ])("documents required server billing variable %s", (variable) => {
    expect(envExample).toMatch(new RegExp(`^${variable}=`, "m"));
  });

  it("records the stable billing and privacy boundaries", () => {
    expect(envExample).not.toContain("NEXT_PUBLIC_STRIPE");
    expect(readme).toContain("14-day trial");
    expect(readme).toContain("Customer Portal");
    expect(readme).toContain("does not include human remediation");
    expect(readme).toContain("does not send PDF bytes");
    expect(readme).toContain("compliance certificate");
    expect(readme).toContain("Never mix modes");
  });
});

function request(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "https://cleartag.test"));
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
