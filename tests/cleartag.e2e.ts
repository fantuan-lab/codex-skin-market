import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";

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

test("landing page is meaningful, keyboard reachable, responsive, and axe-clean", async ({
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
    "#analyzer",
  );
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
      ".analyzer-section",
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
    page.getByRole("banner").getByRole("link", { name: "Open local analyzer", exact: true }),
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
  await expect(page.locator(".header-cta-short")).toHaveText("Analyze");
  await expect(page.locator(".header-cta-short")).toBeVisible();
});

test("Chinese route, language switching, workspace state, and localized evidence stay accessible", async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/zh", { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/zh$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /把无障碍问题转化为可复核的修复和可追溯的证据/,
    }),
  ).toBeVisible();
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
  const sourceFingerprint = await page.locator(".workspace-meta code").textContent();

  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { level: 2, name: "known-accessibility-issues.pdf" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Document title metadata is missing/ })).toBeVisible();
  await expect(page.locator(".workspace-meta code")).toHaveText(sourceFingerprint!);

  await page.getByRole("link", { name: "中文", exact: true }).click();
  await expect(page).toHaveURL(/\/zh$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("button", { name: /缺少文档标题元数据/ })).toBeVisible();
  await expect(page.locator(".workspace-meta code")).toHaveText(sourceFingerprint!);

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

  await expectNoAxeViolations(page);
  expect(errors).toEqual([]);
});

test("Chinese restricted revision fails closed on a hidden raw-byte risk", async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/zh", { waitUntil: "networkidle" });
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
  await page.goto("/", { waitUntil: "networkidle" });
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
  await page.goto("/", { waitUntil: "networkidle" });
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
