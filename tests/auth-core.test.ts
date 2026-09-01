import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const supabaseMock = vi.hoisted(() => ({
  clientsCreated: 0,
  claimsError: null as Error | null,
  claimsResult: {
    data: { claims: { sub: "user-123" } },
    error: null,
  } as {
    data: { claims: { sub?: string } | null } | null;
    error: Error | null;
  },
  exchangeError: null as Error | null,
  exchangeResult: { error: null as Error | null },
  exchangeCalls: [] as string[],
  writeCookiesOnClaims: false,
  writeCookiesOnExchange: false,
  cookieOptionsSeen: [] as Array<{
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  }>,
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(),
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      options: {
        cookieOptions?: {
          secure?: boolean;
          sameSite?: "lax" | "strict" | "none";
        };
        cookies: {
          setAll?: (
            cookies: Array<{
              name: string;
              value: string;
              options: {
                httpOnly?: boolean;
                path?: string;
                sameSite?: "lax" | "strict" | "none";
                secure?: boolean;
              };
            }>,
            headers: Record<string, string>,
          ) => void | Promise<void>;
        };
      },
    ) => {
      supabaseMock.clientsCreated += 1;
      supabaseMock.cookieOptionsSeen.push(options.cookieOptions ?? {});
      const writeRefresh = async () => {
        await options.cookies.setAll?.(
          [
            {
              name: "sb-refresh",
              value: "new-token",
              options: {
                httpOnly: true,
                path: "/",
                ...options.cookieOptions,
              },
            },
          ],
          {
            "Cache-Control":
              "private, no-cache, no-store, must-revalidate, max-age=0",
            Expires: "0",
            Pragma: "no-cache",
            "X-Auth-Refresh": "propagated",
          },
        );
      };

      return {
        auth: {
          getClaims: vi.fn(async () => {
            if (supabaseMock.writeCookiesOnClaims) await writeRefresh();
            if (supabaseMock.claimsError) throw supabaseMock.claimsError;
            return supabaseMock.claimsResult;
          }),
          exchangeCodeForSession: vi.fn(async (code: string) => {
            supabaseMock.exchangeCalls.push(code);
            if (supabaseMock.writeCookiesOnExchange) await writeRefresh();
            if (supabaseMock.exchangeError) throw supabaseMock.exchangeError;
            return supabaseMock.exchangeResult;
          }),
        },
      };
    },
  ),
}));

import {
  isProtectedPath,
  isPublicPath,
  loginPathFor,
  safeReturnPath,
} from "@/lib/auth/paths";
import {
  getSupabasePublicConfig,
  requireSupabasePublicConfig,
  SupabaseConfigurationError,
} from "@/lib/supabase/config";
import { requestUsesHttps } from "@/lib/supabase/protocol";
import { GET as authCallback } from "@/app/auth/callback/route";
import { proxy } from "@/proxy";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("authentication path policy", () => {
  it.each([
    ["/workspace", true],
    ["/workspace/reports", true],
    ["/zh/workspace", true],
    ["/zh/workspace/reports", true],
    ["/billing", true],
    ["/zh/billing", true],
    ["/", false],
    ["/login", false],
    ["/workspace-other", false],
    ["/zh/workspace-other", false],
  ])("classifies protected path %s", (pathname, expected) => {
    expect(isProtectedPath(pathname)).toBe(expected);
  });

  it.each(["/", "/zh", "/login", "/zh/login", "/auth", "/auth/callback"])(
    "keeps public path %s public",
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(true);
      expect(isProtectedPath(pathname)).toBe(false);
    },
  );

  it.each([
    ["/workspace", "/workspace"],
    ["/workspace?tab=evidence#finding-1", "/workspace?tab=evidence#finding-1"],
    ["/zh/workspace/reports?id=one", "/zh/workspace/reports?id=one"],
    ["/billing", "/billing"],
    ["/zh/billing?billing=success", "/zh/billing?billing=success"],
    [undefined, "/workspace"],
    [null, "/workspace"],
  ])("allows the strict relative return path %s", (candidate, expected) => {
    expect(safeReturnPath(candidate)).toBe(expected);
  });

  it.each([
    "https://attacker.example/workspace",
    "//attacker.example/workspace",
    "/\\attacker.example/workspace",
    "/",
    "/zh",
    "/login",
    "/zh/login",
    "/auth/callback",
    "/%2f%2fattacker.example",
    "workspace",
  ])("rejects unsafe return path %s", (candidate) => {
    expect(safeReturnPath(candidate)).toBe("/workspace");
  });

  it.each([
    ["/workspace", "/login?returnTo=%2Fworkspace"],
    [
      "/zh/workspace?view=review",
      "/zh/login?returnTo=%2Fzh%2Fworkspace%3Fview%3Dreview",
    ],
    ["/billing", "/login?returnTo=%2Fbilling"],
    ["/zh/billing", "/zh/login?returnTo=%2Fzh%2Fbilling"],
    ["https://attacker.example", "/login?returnTo=%2Fworkspace"],
  ])("builds a locale-safe login path for %s", (returnTo, expected) => {
    expect(loginPathFor(returnTo)).toBe(expected);
  });
});

describe("public Supabase configuration", () => {
  it.each([
    [{}, null],
    [{ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" }, null],
    [
      { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" },
      null,
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "http://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      },
      null,
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://user:pass@project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      },
      null,
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_do-not-expose",
      },
      null,
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacyKey("service_role"),
      },
      null,
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      },
      {
        url: "https://project.supabase.co",
        publishableKey: "sb_publishable_test",
      },
    ],
    [
      {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-anon-key",
      },
      {
        url: "http://127.0.0.1:54321",
        publishableKey: "local-anon-key",
      },
    ],
  ])("fails closed for configuration %#", (environment, expected) => {
    expect(getSupabasePublicConfig(environment)).toEqual(expected);
  });

  it("throws a typed error when required configuration is absent", () => {
    expect(() => requireSupabasePublicConfig({})).toThrow(
      SupabaseConfigurationError,
    );
  });
});

describe("authentication cookie protocol policy", () => {
  it.each([
    ["https:", {}, true],
    ["http:", {}, false],
    [undefined, { "x-forwarded-proto": "https" }, true],
    ["http:", { "x-forwarded-proto": "https,http" }, true],
    [undefined, { "cf-visitor": '{"scheme":"https"}' }, true],
    [undefined, { "cf-visitor": "invalid" }, false],
  ])(
    "uses protocol %s and headers %# => Secure=%s",
    (protocol, values, expected) => {
      expect(requestUsesHttps(protocol, new Headers(values))).toBe(expected);
    },
  );
});

describe("protected-route proxy", () => {
  beforeEach(resetAuthState);

  it.each(["/", "/zh", "/auth/callback"])(
    "does not authenticate public route %s",
    async (pathname) => {
      const response = await proxy(request(pathname));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("cache-control")).toBeNull();
      expect(supabaseMock.clientsCreated).toBe(0);
    },
  );

  it.each([
    ["/workspace?tab=report", "/login?returnTo=%2Fworkspace%3Ftab%3Dreport"],
    ["/zh/workspace", "/zh/login?returnTo=%2Fzh%2Fworkspace"],
  ])(
    "fails closed without configuration for %s",
    async (pathname, loginLocation) => {
      clearConfig();
      const response = await proxy(request(pathname));

      expect(response.status).toBe(303);
      expect(new URL(response.headers.get("location")!).pathname).toBe(
        new URL(loginLocation, "https://cleartag.test").pathname,
      );
      expect(new URL(response.headers.get("location")!).search).toBe(
        new URL(loginLocation, "https://cleartag.test").search,
      );
      expectPrivateNoStore(response);
      expect(supabaseMock.clientsCreated).toBe(0);
    },
  );

  it("verifies claims and propagates refreshed cookies plus response headers", async () => {
    configure();
    supabaseMock.writeCookiesOnClaims = true;

    const response = await proxy(request("/workspace"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-auth-refresh")).toBe("propagated");
    expect(response.headers.get("set-cookie")).toContain("sb-refresh=new-token");
    expectPrivateNoStore(response);
  });

  it.each(["/login", "/zh/login"])(
    "propagates a refreshed session cookie through login entry %s",
    async (pathname) => {
      configure();
      supabaseMock.writeCookiesOnClaims = true;

      const response = await proxy(request(pathname));

      expect([200, 303]).toContain(response.status);
      expect(response.headers.get("set-cookie")).toContain(
        "sb-refresh=new-token",
      );
      expect(response.headers.get("x-auth-refresh")).toBe("propagated");
      expectPrivateNoStore(response);
      expect(supabaseMock.clientsCreated).toBe(1);
    },
  );

  it.each([
    ["https://cleartag.example", true],
    ["http://localhost:43172", false],
  ])(
    "sets Secure=%s for refreshed cookies served from %s",
    async (origin, expectedSecure) => {
      configure();
      supabaseMock.writeCookiesOnClaims = true;

      const response = await proxy(request("/workspace", origin));
      const setCookie = response.headers.get("set-cookie") ?? "";

      expect(/(?:^|;\s*)Secure(?:;|$)/i.test(setCookie)).toBe(
        expectedSecure,
      );
      expect(supabaseMock.cookieOptionsSeen.at(-1)?.secure).toBe(
        expectedSecure,
      );
    },
  );

  it.each(["missing claims", "claims error", "claims exception"])(
    "redirects when authentication has %s",
    async (failure) => {
      configure();
      if (failure === "missing claims") {
        supabaseMock.claimsResult = {
          data: { claims: {} },
          error: null,
        };
      } else if (failure === "claims error") {
        supabaseMock.claimsResult = {
          data: null,
          error: new Error("invalid token"),
        };
      } else {
        supabaseMock.claimsError = new Error("network unavailable");
      }

      const response = await proxy(request("/zh/workspace?view=review"));
      const location = new URL(response.headers.get("location")!);

      expect(response.status).toBe(303);
      expect(location.pathname).toBe("/zh/login");
      expect(location.searchParams.get("returnTo")).toBe(
        "/zh/workspace?view=review",
      );
      expectPrivateNoStore(response);
    },
  );
});

describe("OAuth callback", () => {
  beforeEach(resetAuthState);

  it.each([
    ["/workspace", "/workspace"],
    ["/zh/workspace?view=review", "/zh/workspace?view=review"],
    ["https://attacker.example/steal", "/workspace"],
    ["//attacker.example/steal", "/workspace"],
  ])("exchanges the code and redirects safely for %s", async (next, expected) => {
    configure();
    const response = await authCallback(
      request(`/auth/callback?code=oauth-code&next=${encodeURIComponent(next)}`),
    );
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(`${location.pathname}${location.search}`).toBe(expected);
    expect(supabaseMock.exchangeCalls).toEqual(["oauth-code"]);
    expectPrivateNoStore(response);
  });

  it("accepts the canonical returnTo parameter", async () => {
    configure();
    const response = await authCallback(
      request("/auth/callback?code=oauth-code&returnTo=%2Fzh%2Fworkspace"),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/zh/workspace",
    );
  });

  it("propagates cookie and cache headers emitted during code exchange", async () => {
    configure();
    supabaseMock.writeCookiesOnExchange = true;

    const response = await authCallback(
      request("/auth/callback?code=oauth-code&returnTo=%2Fworkspace"),
    );

    expect(response.headers.get("set-cookie")).toContain("sb-refresh=new-token");
    expect(response.headers.get("x-auth-refresh")).toBe("propagated");
    expectPrivateNoStore(response);
  });

  it.each([
    ["https://cleartag.example", true],
    ["http://localhost:43172", false],
  ])(
    "sets Secure=%s on callback session cookies served from %s",
    async (origin, expectedSecure) => {
      configure();
      supabaseMock.writeCookiesOnExchange = true;

      const response = await authCallback(
        request(
          "/auth/callback?code=oauth-code&returnTo=%2Fworkspace",
          origin,
        ),
      );
      const setCookie = response.headers.get("set-cookie") ?? "";

      expect(/(?:^|;\s*)Secure(?:;|$)/i.test(setCookie)).toBe(
        expectedSecure,
      );
      expect(supabaseMock.cookieOptionsSeen.at(-1)?.secure).toBe(
        expectedSecure,
      );
    },
  );

  it.each(["missing code", "missing configuration", "exchange error", "exchange exception"])(
    "fails closed for %s",
    async (failure) => {
      configure();
      let pathname = "/auth/callback?code=oauth-code&next=%2Fzh%2Fworkspace";
      if (failure === "missing code") pathname = "/auth/callback?next=%2Fworkspace";
      if (failure === "missing configuration") clearConfig();
      if (failure === "exchange error") {
        supabaseMock.exchangeResult = { error: new Error("code rejected") };
      }
      if (failure === "exchange exception") {
        supabaseMock.exchangeError = new Error("network unavailable");
      }

      const response = await authCallback(request(pathname));
      const location = new URL(response.headers.get("location")!);

      expect(response.status).toBe(303);
      expect(location.pathname).toMatch(/^\/(zh\/)?login$/);
      expect(location.searchParams.get("error")).toBeTruthy();
      expectPrivateNoStore(response);
    },
  );
});

afterAll(() => {
  restoreEnvironment("NEXT_PUBLIC_SUPABASE_URL", originalUrl);
  restoreEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalKey);
});

function request(
  pathname: string,
  origin = "https://cleartag.test",
): NextRequest {
  return new NextRequest(new URL(pathname, origin));
}

function configure(): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
}

function clearConfig(): void {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

function resetAuthState(): void {
  clearConfig();
  supabaseMock.clientsCreated = 0;
  supabaseMock.claimsError = null;
  supabaseMock.claimsResult = {
    data: { claims: { sub: "user-123" } },
    error: null,
  };
  supabaseMock.exchangeError = null;
  supabaseMock.exchangeResult = { error: null };
  supabaseMock.exchangeCalls = [];
  supabaseMock.writeCookiesOnClaims = false;
  supabaseMock.writeCookiesOnExchange = false;
  supabaseMock.cookieOptionsSeen = [];
}

function expectPrivateNoStore(response: Response): void {
  expect(response.headers.get("cache-control")).toContain("private");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("expires")).toBe("0");
  expect(response.headers.get("pragma")).toBe("no-cache");
}

function legacyKey(role: string): string {
  return `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
