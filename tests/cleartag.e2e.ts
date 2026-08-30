import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";

const TEST_EMAIL = "reviewer@example.com";
const TEST_PASSWORD = "Correct-Horse-42!";
const AUTH_STUB_ORIGIN = "http://127.0.0.1:43173";
const AUTH_COOKIE_NAME = "sb-127-auth-token";

type TestAuthSession = {
  access_token: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  user: Record<string, unknown>;
};

type AuthStubState = {
  oauthRequests: Array<{
    outcome: string;
    provider: string;
    scopes: string | null;
  }>;
  sessionIssues: Array<{
    accessTokenId: string;
    expiresAt: number;
    provider: string;
    refreshToken: string;
    source: string;
  }>;
  tokenRequests: Array<{
    authCode: string | null;
    grantType: string | null;
    refreshToken: string | null;
  }>;
};

function isAuthSessionCookie(name: string): boolean {
  return (
    name === AUTH_COOKIE_NAME ||
    (name.startsWith(`${AUTH_COOKIE_NAME}.`) &&
      /^\d+$/.test(name.slice(AUTH_COOKIE_NAME.length + 1)))
  );
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations,
    results.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n"),
  ).toEqual([]);
}

async function signInWithEmail(page: Page, locale: "en" | "zh" = "en") {
  const loginPath = locale === "zh" ? "/zh/login" : "/login";
  const workspacePath = locale === "zh" ? "/zh/workspace" : "/workspace";
  const emailLabel = locale === "zh" ? "工作邮箱" : "Work email";
  const passwordLabel = locale === "zh" ? "密码" : "Password";
  const submitLabel = locale === "zh" ? "使用邮箱登录" : "Sign in with email";

  await page.goto(`${loginPath}?returnTo=${encodeURIComponent(workspacePath)}`, {
    waitUntil: "networkidle",
  });
  await page.getByLabel(emailLabel).fill(TEST_EMAIL);
  await page.getByRole("textbox", { name: passwordLabel, exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: submitLabel, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${workspacePath.replaceAll("/", "\\/")}$`), {
    timeout: 30_000,
  });
  await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();
}

async function tabUntilFocused(page: Page, locator: ReturnType<Page["locator"]>) {
  for (let index = 0; index < 24; index += 1) {
    await page.keyboard.press("Tab");
    if (await locator.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error("The expected control was not reachable in the keyboard tab order.");
}

async function resetAuthStub(
  page: Page,
  config?: { oauthOutcome: "cancel" | "exchange-failure" | "success" },
) {
  const reset = await page.request.post(`${AUTH_STUB_ORIGIN}/__test/reset`);
  expect(reset.ok()).toBe(true);
  if (config) {
    const configured = await page.request.post(
      `${AUTH_STUB_ORIGIN}/__test/config`,
      { data: config },
    );
    expect(configured.ok()).toBe(true);
  }
}

async function readAuthStubState(page: Page): Promise<AuthStubState> {
  const response = await page.request.get(`${AUTH_STUB_ORIGIN}/__test/state`);
  expect(response.ok()).toBe(true);
  return response.json() as Promise<AuthStubState>;
}

async function installExpiredSession(page: Page): Promise<TestAuthSession> {
  await resetAuthStub(page);
  const response = await page.request.post(
    `${AUTH_STUB_ORIGIN}/__test/session`,
    { data: { expiresIn: -120, provider: "email" } },
  );
  expect(response.ok()).toBe(true);
  const session = (await response.json()) as TestAuthSession;
  expect(session.expires_at).toBeLessThan(Math.floor(Date.now() / 1000));

  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: encodeAuthSessionCookie(session),
      url: "http://localhost:43172",
      sameSite: "Lax",
      secure: false,
    },
  ]);
  return session;
}

async function readBrowserAuthSession(page: Page): Promise<TestAuthSession> {
  const cookies = (await page.context().cookies()).filter(
    (cookie) => isAuthSessionCookie(cookie.name),
  );
  expect(cookies.length).toBeGreaterThan(0);
  const unchunked = cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
  const value = unchunked
    ? unchunked.value
    : cookies
        .toSorted((left, right) =>
          Number(left.name.split(".").at(-1)) -
          Number(right.name.split(".").at(-1)),
        )
        .map((cookie) => cookie.value)
        .join("");
  expect(value).toMatch(/^base64-/);
  return JSON.parse(
    Buffer.from(value.slice("base64-".length), "base64url").toString("utf8"),
  ) as TestAuthSession;
}

function encodeAuthSessionCookie(session: TestAuthSession): string {
  return `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
}

test("landing page is meaningful, login-gated, responsive, and axe-clean", async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Turn accessibility findings into reviewable fixes/i,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".boundary-note", {
      hasText: "Guided remediation—not one-click compliance.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Illustrative UI example · not scan output")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "See the issue. Record the judgment. Deliver the evidence.",
    }),
  ).toBeVisible();
  await expect(page.locator(".standards-illustration")).toBeVisible();
  await expect(page.getByRole("link", { name: "Analyze locally", exact: true })).toHaveAttribute(
    "href",
    "/workspace",
  );
  await expect(page.getByRole("link", { name: "Sign in", exact: true }).first()).toHaveAttribute(
    "href",
    "/workspace",
  );
  await expect(page.locator(".analyzer-section")).toHaveCount(0);
  await expect(page.getByLabel("Choose or drop a PDF")).toHaveCount(0);
  const landingOrder = await page.evaluate(() =>
    [
      ".hero",
      ".confidence-strip",
      ".audience-section",
      ".workflow-section",
      ".product-proof-section",
      ".scope-section",
      ".standards-section",
      ".security-section",
      ".pricing-section",
      ".final-boundary",
    ].map((selector) => document.querySelector(selector)?.getBoundingClientRect().top ?? -1),
  );
  expect(landingOrder.every((top) => top >= 0)).toBe(true);
  expect(landingOrder).toEqual([...landingOrder].sort((a, b) => a - b));
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveText("");

  await expectNoAxeViolations(page);
  expect(errors).toEqual([]);

  await page.screenshot({ path: "test-results/cleartag-landing-viewport.png" });
  for (const selector of [".standards-illustration", ".final-boundary-asset"]) {
    const image = page.locator(selector);
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((node: HTMLImageElement) => node.decode());
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/cleartag-landing.png", fullPage: true });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Mobile section navigation" }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
  await page.screenshot({ path: "test-results/cleartag-mobile.png", fullPage: true });

  await page.setViewportSize({ width: 320, height: 760 });
  await page.reload({ waitUntil: "networkidle" });
  const narrowWidths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(narrowWidths.scroll).toBeLessThanOrEqual(narrowWidths.client + 1);
  await expect(page.locator(".header-cta-short")).toHaveText("Sign in");
  await expect(page.locator(".header-cta-short")).toBeVisible();
});

test("email login is generic on failure, persists on refresh, and signs out cleanly", async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/login?returnTo=%2Fworkspace", { waitUntil: "networkidle" });

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Sign in to keep your review workspace private.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  await expectNoAxeViolations(page);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await tabUntilFocused(page, page.getByLabel("Work email"));
  await page.keyboard.type(TEST_EMAIL);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "Password", exact: true })).toBeFocused();
  await page.keyboard.type("incorrect-password");
  await page.getByRole("button", { name: "Sign in with email", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "We couldn’t complete that request. Check your details and try again.",
  );
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fworkspace$/);
  // Chromium reports the deliberately rejected token request as a console
  // resource error. The generic UI response above is the behavior under test;
  // subsequent unexpected runtime errors must still fail the scenario.
  errors.length = 0;

  await page.getByRole("textbox", { name: "Password", exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in with email", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: "PDF review workspace" })).toBeVisible();
  await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();
  expect((await page.context().cookies()).some((cookie) => cookie.name.includes("auth-token"))).toBe(
    true,
  );
  await expectNoAxeViolations(page);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Turn accessibility findings",
  );
  await page.goto("/workspace", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fworkspace$/);
  await expect(page.getByRole("button", { name: "Sign in with email" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Google PKCE completes authorize, callback, exchange, cookie, and workspace", async ({
  page,
}) => {
  await resetAuthStub(page, { oauthOutcome: "success" });
  await page.goto("/login?returnTo=%2Fworkspace", { waitUntil: "networkidle" });

  const authorizeRequestPromise = page.waitForRequest((request) =>
    request.url().startsWith(`${AUTH_STUB_ORIGIN}/auth/v1/authorize`),
  );
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const authorizeRequest = await authorizeRequestPromise;
  const authorizeUrl = new URL(authorizeRequest.url());

  expect(authorizeUrl.searchParams.get("provider")).toBe("google");
  expect(authorizeUrl.searchParams.get("scopes")?.split(" ").sort()).toEqual([
    "email",
    "openid",
    "profile",
  ]);
  expect(authorizeUrl.searchParams.get("redirect_to")).toBe(
    "http://localhost:43172/auth/callback?returnTo=%2Fworkspace",
  );
  expect(authorizeUrl.searchParams.get("code_challenge")).toBeTruthy();
  expect(authorizeUrl.searchParams.get("code_challenge_method")).toBe("s256");
  expect(authorizeUrl.searchParams.has("access_type")).toBe(false);
  expect(authorizeUrl.searchParams.has("prompt")).toBe(false);
  await expect(page).toHaveURL(/\/workspace$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "PDF review workspace" })).toBeVisible();
  await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();

  const cookies = await page.context().cookies();
  const authCookies = cookies.filter((cookie) =>
    isAuthSessionCookie(cookie.name),
  );
  expect(authCookies.length).toBeGreaterThan(0);
  expect(authCookies.every((cookie) => cookie.secure === false)).toBe(true);

  const state = await readAuthStubState(page);
  expect(state.oauthRequests).toMatchObject([
    {
      outcome: "success",
      provider: "google",
      scopes: "openid email profile",
    },
  ]);
  expect(state.tokenRequests).toEqual([
    expect.objectContaining({ grantType: "pkce" }),
  ]);
  expect(state.sessionIssues).toEqual([
    expect.objectContaining({ provider: "google", source: "pkce" }),
  ]);
});

test("Google cancellation returns to login with a visible, localized error", async ({
  page,
}) => {
  await resetAuthStub(page, { oauthOutcome: "cancel" });
  await page.goto("/login?returnTo=%2Fworkspace", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Continue with Google" }).click();

  await expect(page).toHaveURL(
    /\/login\?returnTo=%2Fworkspace&error=access_denied$/,
    { timeout: 30_000 },
  );
  await expect(page.getByRole("alert")).toHaveText(
    "Google sign-in was cancelled or permission was not granted. Try again or use email and password.",
  );
  expect(
    (await page.context().cookies()).some((cookie) =>
      isAuthSessionCookie(cookie.name),
    ),
  ).toBe(false);
  const state = await readAuthStubState(page);
  expect(state.oauthRequests).toMatchObject([{ outcome: "cancel" }]);
  expect(state.tokenRequests).toEqual([]);
});

test("Google exchange failure returns to login with a visible error", async ({
  page,
}) => {
  await resetAuthStub(page, { oauthOutcome: "exchange-failure" });
  await page.goto("/login?returnTo=%2Fworkspace", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Continue with Google" }).click();

  await expect(page).toHaveURL(
    /\/login\?returnTo=%2Fworkspace&error=exchange_failed$/,
    { timeout: 30_000 },
  );
  await expect(page.getByRole("alert")).toHaveText(
    "Sign-in could not be completed. Try again or use the other sign-in method. If the problem continues, contact the deployment owner.",
  );
  expect(
    (await page.context().cookies()).some((cookie) =>
      isAuthSessionCookie(cookie.name),
    ),
  ).toBe(false);
  const state = await readAuthStubState(page);
  expect(state.tokenRequests).toEqual([
    expect.objectContaining({ grantType: "pkce" }),
  ]);
  expect(state.sessionIssues).toEqual([]);
});

test("an expired access token is refreshed and both session tokens rotate", async ({
  page,
}) => {
  const expired = await installExpiredSession(page);
  const expiredPayload = JSON.parse(
    Buffer.from(expired.access_token.split(".")[1], "base64url").toString("utf8"),
  ) as { exp: number };
  expect(expiredPayload.exp).toBeLessThan(Math.floor(Date.now() / 1000));

  const response = await page.goto("/workspace", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "PDF review workspace" })).toBeVisible();

  const rotated = await readBrowserAuthSession(page);
  expect(rotated.access_token).not.toBe(expired.access_token);
  expect(rotated.refresh_token).not.toBe(expired.refresh_token);
  expect(rotated.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  const state = await readAuthStubState(page);
  expect(state.tokenRequests).toContainEqual(
    expect.objectContaining({
      grantType: "refresh_token",
      refreshToken: expired.refresh_token,
    }),
  );
  expect(state.sessionIssues).toContainEqual(
    expect.objectContaining({ source: "refresh" }),
  );
});

test("the login entry propagates a rotated session cookie", async ({ page }) => {
  const expired = await installExpiredSession(page);

  await page.goto("/login?returnTo=%2Fworkspace", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/workspace$/, { timeout: 30_000 });
  await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();

  const rotated = await readBrowserAuthSession(page);
  expect(rotated.access_token).not.toBe(expired.access_token);
  expect(rotated.refresh_token).not.toBe(expired.refresh_token);
  const state = await readAuthStubState(page);
  expect(state.tokenRequests).toContainEqual(
    expect.objectContaining({
      grantType: "refresh_token",
      refreshToken: expired.refresh_token,
    }),
  );
});

test("Chinese login is localized, axe-clean, and usable at 320px", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/zh/login?returnTo=%2Fzh%2Fworkspace", { waitUntil: "networkidle" });

  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(
    page.getByRole("heading", { level: 1, name: "登录后，安全访问你的复核工作区。" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "登录", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "注册账号", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用邮箱登录", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "使用 Google 账号继续" })).toBeEnabled();
  await page.getByRole("button", { name: "注册账号", exact: true }).click();
  await expect(page.getByRole("button", { name: "使用邮箱注册", exact: true })).toBeVisible();
  await expect(page.getByText("注册账号时，请使用至少 8 个字符的密码。")).toBeVisible();

  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  await expectNoAxeViolations(page);
  await page.screenshot({ path: "test-results/cleartag-login-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("Chinese route, language switching boundary, and localized evidence stay accessible", async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await signInWithEmail(page, "zh");

  await expect(page).toHaveURL(/\/zh\/workspace$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "PDF 复核工作区",
    }),
  ).toBeVisible();
  await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "语言" })).toBeVisible();
  await expect(page.getByRole("link", { name: "中文", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "含已知问题的样例" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "known-accessibility-issues.pdf" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("机器检测到的问题", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /缺少文档标题元数据/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "分析器安全探测" })).toBeVisible();
  await expect(
    page.getByRole("row", {
      name: /表单字段对象 未检测到 分析器未暴露此信号.*独立预检真实字节/,
    }),
  ).toBeVisible();

  const evidenceDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载证据包" }).click();
  const evidence = await readEvidenceArchive(await evidenceDownloadPromise);
  expect(evidence.html).toContain('<html lang="zh-CN">');
  expect(evidence.html).toContain("本报告不是符合性证书");
  expect(evidence.html).toContain("受限修订安全探测");
  expect(evidence.json).toMatchObject({
    reportLocale: "zh",
    fileName: "known-accessibility-issues.pdf",
    certificateOfConformance: false,
    metadata: {
      hasAcroForm: true,
      safetyInspection: {
        fieldObjects: "absent",
      },
    },
    pages: [{ annotationCount: expect.any(Number) }],
  });
  expect(evidence.readme).toContain("不是符合性证书");

  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "PDF review workspace" })).toBeVisible();
  await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();
  await expect(page.getByText(/changing its language clears the current in-memory review/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "known-accessibility-issues.pdf" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Known-issues sample" })).toBeVisible();

  await page.getByRole("link", { name: "中文", exact: true }).click();
  await expect(page).toHaveURL(/\/zh\/workspace$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByText(TEST_EMAIL, { exact: true })).toBeVisible();
  await expect(page.getByText(/切换工作区语言会清除当前内存中的复核状态/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "known-accessibility-issues.pdf" })).toHaveCount(0);

  await expectNoAxeViolations(page);
  expect(errors).toEqual([]);
});

test("Chinese restricted revision fails closed on a hidden raw-byte risk", async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await signInWithEmail(page, "zh");
  const riskyPdf = await createMetadataPdfWithOutlines();
  await page.getByLabel("选择或拖入 PDF").setInputFiles({
    name: "hidden-outlines.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(riskyPdf),
  });
  await page.getByRole("button", { name: "在本地分析" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "hidden-outlines.pdf" }),
  ).toBeVisible({ timeout: 30_000 });

  const sourceFingerprint = await page.locator(".workspace-meta code").textContent();
  await page.getByRole("button", { name: /缺少文档标题元数据/ }).click();
  await page.getByLabel("准确的文档标题").fill("不得写回的标题");
  let downloadCount = 0;
  page.on("download", () => {
    downloadCount += 1;
  });
  await page.getByRole("button", { name: "创建并复查新版本" }).click();

  await expect(
    page.getByRole("alert").filter({
      hasText: /严格安全预检检测到受限特征.*document outlines.*升级给专业人员/,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "1 个文件版本" })).toBeVisible();
  await expect(page.locator(".workspace-meta code")).toHaveText(sourceFingerprint!);
  await expect.poll(() => downloadCount).toBe(0);
  await expectNoAxeViolations(page);
  expect(errors).toEqual([]);
});

test("real PDF analysis, human status, safe writeback, and evidence download work", async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await signInWithEmail(page);
  await page.getByRole("button", { name: "Known-issues sample" }).click();

  await expect(
    page.getByRole("heading", { level: 2, name: "known-accessibility-issues.pdf" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("machine-detected failures", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Document title metadata is missing/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /No usable tagged structure was exposed/ })).toBeVisible();

  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("open");
  await page.getByRole("button", { name: /No usable tagged structure was exposed/ }).click();
  await page.getByRole("textbox", { name: /Reviewer rationale/ }).fill(
    "Structure tree absence confirmed against the page structure signal; specialist remediation required.",
  );
  await page.getByRole("button", { name: "Escalate to specialist" }).click();
  await expect(page.getByText("Status recorded: Escalated to specialist.")).toBeVisible();
  await expect(page.locator("#finding-detail-title")).toBeFocused();

  const reviewEvidencePromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download evidence pack" }).click();
  const reviewEvidence = await readEvidenceArchive(await reviewEvidencePromise);
  expect(reviewEvidence.html).toContain("Escalated to specialist");
  expect(reviewEvidence.html).toContain("known-accessibility-issues.pdf");

  await page.getByRole("button", { name: "Review another file" }).click();
  const metadataPdf = await createSafeMetadataPdf();
  await page.getByLabel("Choose or drop a PDF").setInputFiles({
    name: "metadata-only-issues.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(metadataPdf),
  });
  await page.getByRole("button", { name: "Analyze locally" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "metadata-only-issues.pdf" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Document title metadata is missing/ }).click();
  await page.getByLabel("Accurate document title").fill("Community Grant Application");
  const pdfDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create and recheck version" }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toMatch(/remediated-v2\.pdf$/);
  await expect(page.getByText(/Version 2 verified and downloaded/)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: "2 file versions" })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Document title metadata is missing.*Resolved and rechecked/,
    }),
  ).toBeVisible();

  const evidenceDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download evidence pack" }).click();
  const evidenceDownload = await evidenceDownloadPromise;
  expect(evidenceDownload.suggestedFilename()).toMatch(/remediation-evidence\.zip$/);
  const remediationEvidence = await readEvidenceArchive(evidenceDownload);
  expect(remediationEvidence.files).toEqual([
    "README.txt",
    "evidence.json",
    "remediation-evidence.html",
  ]);
  expect(remediationEvidence.html).toContain("Not a certificate of conformance");
  expect(remediationEvidence.html).toContain("Community Grant Application");
  expect(remediationEvidence.html).toContain("Resolved and rechecked");
  const reportPage = await page.context().newPage();
  await reportPage.setContent(remediationEvidence.html, { waitUntil: "load" });
  await expectNoAxeViolations(reportPage);
  await reportPage.close();

  await expectNoAxeViolations(page);
  expect(errors).toEqual([]);
  await page.getByRole("heading", { name: /metadata-only-issues-remediated-v2\.pdf/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/cleartag-workspace-viewport.png" });
  await page.screenshot({ path: "test-results/cleartag-workspace.png", fullPage: true });
});

test("the scan fixture produces real OCR-risk evidence without claiming OCR", async ({ page }) => {
  await signInWithEmail(page);
  await page.getByLabel("Choose or drop a PDF").setInputFiles(
    path.join(process.cwd(), "public/fixtures/image-only-scan.pdf"),
  );
  await page.getByRole("button", { name: "Analyze locally" }).click();

  await expect(page.getByText("Text-based remediation is out of scope for this version.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: /Likely image-only page — OCR review required/ })).toBeVisible();
  await expect(page.getByText(/image paint operation/).first()).toBeVisible();
});

async function createSafeMetadataPdf() {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText(
    "A text-based PDF with enough extractable content for deterministic browser writeback testing.",
    { x: 54, y: 720, size: 12, font, maxWidth: 500 },
  );
  return document.save({ useObjectStreams: false });
}

async function createMetadataPdfWithOutlines() {
  const bytes = await createSafeMetadataPdf();
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  document.catalog.set(
    PDFName.of("Outlines"),
    document.context.obj({ Count: 0 }),
  );
  return document.save({ useObjectStreams: false, updateFieldAppearances: false });
}

async function readEvidenceArchive(download: Download) {
  const evidencePath = await download.path();
  expect(evidencePath).not.toBeNull();
  const archive = await JSZip.loadAsync(await readFile(evidencePath!));
  return {
    files: Object.keys(archive.files).sort(),
    html: await archive.file("remediation-evidence.html")!.async("string"),
    json: JSON.parse(await archive.file("evidence.json")!.async("string")) as Record<
      string,
      unknown
    >,
    readme: await archive.file("README.txt")!.async("string"),
  };
}
