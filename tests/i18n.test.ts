import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  categoryLabel,
  detectionLabel,
  getStandardProfileCopy,
  getUiCopy,
  isLocale,
  localizeAnalyzerLimit,
  localizeFinding,
  localizeFindingLocation,
  localizeVersionRecord,
  severityLabel,
  statusLabel,
} from "@/lib/i18n";
import type { Finding } from "@/lib/pdf/types";

const metadataFinding: Finding = {
  id: "metadata-title",
  ruleId: "META-001",
  title: "Document title metadata is missing",
  category: "metadata",
  severity: "high",
  detection: "machine",
  outcome: "failure",
  status: "open",
  page: null,
  location: "Document metadata",
  evidence: "No non-empty Title value was exposed.",
  metrics: {},
  method: "Inspect document information and XMP metadata.",
  guidance: ["Enter an accurate document title."],
  standardReferences: [{ profile: "wcag21", label: "WCAG 2.4.2" }],
  safeFix: "document-title",
  before: "Untitled customer source.pdf",
  history: [],
};

describe("bilingual UI copy", () => {
  it("uses English as the explicit fallback and accepts only supported locale slugs", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(LOCALES).toEqual(["en", "zh"]);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("zh-CN")).toBe(false);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("provides parallel English and Chinese product copy without changing standard names", () => {
    const english = getUiCopy("en");
    const chinese = getUiCopy("zh");

    expect(english.hero.title).toContain("reviewable fixes");
    expect(chinese.hero.title).toContain("可复核的修复");
    expect(english.hero.boundaryNote).toContain("not one-click compliance");
    expect(chinese.hero.boundaryNote).toContain("不承诺一键合规");
    expect(english.hero.primaryAction).toBe("Analyze locally");
    expect(chinese.hero.primaryAction).toBe("在浏览器中分析 PDF");
    expect(english.navigation.mobileAria).toBe("Mobile section navigation");
    expect(english.navigation.openAnalyzer).toBe("Sign in");
    expect(chinese.navigation.openAnalyzerShort).toBe("登录");
    expect(english.hero.preview.location).toContain("Page 12");
    expect(chinese.hero.preview.method).toBe("批注与结构检查");
    expect(english.hero.preview.label).toBe("Illustrative UI example · not scan output");
    expect(english.hero.preview.fileName).not.toBe("known-accessibility-issues.pdf");
    expect(english.productProof.fixtureLabel).toContain("not scan output");
    expect(chinese.hero.preview.label).toBe("界面示意 · 并非扫描结果");
    expect(chinese.productProof.fixtureLabel).toContain("并非扫描结果");
    expect(english.productProof.packItems).toHaveLength(4);
    expect(chinese.productProof.packItems).toHaveLength(4);
    expect(english.intake.sectionIntro).toContain("PDF bytes");
    expect(chinese.intake.sectionIntro).toContain("真实 PDF 字节");
    expect(english.standards.illustrationAlt).toContain("WCAG 2.2");
    expect(chinese.footer.navigationAria).toBe("页脚导航");
    expect(chinese.report.htmlLang).toBe("zh-CN");

    expect(english.auth.signInAction).toBe("Sign in with email");
    expect(english.auth.googleAction).toBe("Continue with Google");
    expect(english.auth.genericError).not.toMatch(/account|email.*exists/i);
    expect(english.auth.configurationMissing).toContain("not configured");
    expect(english.auth.pdfPrivacy).toContain("not sent to Supabase");
    expect(english.auth.googlePrivacy).toContain("does not request access to Google Drive");
    expect(chinese.auth.signInAction).toBe("使用邮箱登录");
    expect(chinese.auth.googleAction).toBe("使用 Google 账号继续");
    expect(chinese.auth.configurationMissing).toContain("尚未配置");
    expect(chinese.account.signOut).toBe("退出登录");

    expect(english.pricing.cards[0]).toMatchObject({
      title: "Local review",
      price: "$0",
    });
    expect(english.pricing.cards[1]).toMatchObject({
      title: "Reviewer Pro",
      price: "$19/month",
    });
    expect(english.pricing.cards[1].copy).toContain("Eligible new subscribers");
    expect(english.pricing.cards[1].action).toBe("View Reviewer Pro");
    expect(english.pricing.cards[2].title).toBe("Organization");
    expect(chinese.pricing.cards[1].price).toBe("$19/月");
    expect(chinese.pricing.cards[1].copy).toContain("符合条件的新订阅者");
    expect(chinese.pricing.cards[1].action).toBe("查看 Reviewer Pro");
    expect(english.billing.monthlyPrice).toBe("$19/month");
    expect(english.billing.annualPrice).toBe("$190/year");
    expect(english.billing.privacy).toContain("never sent to Stripe");
    expect(english.billing.status.unavailable).toBe("Billing unavailable");
    expect(english.billing.activeAccess).toContain("access is active");
    expect(english.billing.monthlyImmediateRenewal).toContain("charged immediately");
    expect(chinese.billing.monthlyPrice).toBe("$19/月");
    expect(chinese.billing.annualPrice).toBe("$190/年");
    expect(chinese.billing.annualImmediateRenewal).toContain("立即扣取 USD $190");
    expect(chinese.billing.proGateCopy).toContain("免费版仍可本地分析");

    expect(getStandardProfileCopy("section508", "zh")).toMatchObject({
      shortName: "Section 508",
      name: expect.stringContaining("Section 508"),
    });
    expect(getStandardProfileCopy("pdfua1", "zh").shortName).toBe("PDF/UA-1");
  });

  it("localizes rule-authored content while preserving PDF-derived and reviewer data", () => {
    const localized = localizeFinding(metadataFinding, "zh");

    expect(localized.title).toBe("缺少文档标题元数据");
    expect(localized.evidence).toContain("Title");
    expect(localized.before).toBe("Untitled customer source.pdf");
    expect(localized.standardReferences).toEqual(metadataFinding.standardReferences);
    expect(localizeFindingLocation(metadataFinding, "zh")).toBe("文档元数据");

    const unknownFinding = {
      ...metadataFinding,
      id: "future-rule",
      ruleId: "FUTURE-001",
      title: "Customer-authored future finding",
      evidence: "Never machine translate this evidence.",
    };
    expect(localizeFinding(unknownFinding, "zh")).toMatchObject({
      title: unknownFinding.title,
      evidence: unknownFinding.evidence,
    });
  });

  it("localizes reusable status, severity, detection, and category labels", () => {
    expect(statusLabel("escalated", "en")).toBe("Escalated to specialist");
    expect(statusLabel("escalated", "zh")).toBe("已升级给专业人员");
    expect(severityLabel("high", "zh")).toBe("高");
    expect(detectionLabel("manual", "zh")).toBe("需要人工验证");
    expect(categoryLabel("reading-order", "zh")).toBe("阅读顺序");
  });

  it("localizes the fail-closed revision boundary and restricted revision records", () => {
    expect(
      localizeAnalyzerLimit(
        "Restricted metadata revision is offered only for PDF 1.7 files whose analyzer safety probes are conclusive and whose exposed signals remain inside the simple-document boundary.",
        "zh",
      ),
    ).toContain("安全探测均有明确结论");

    expect(
      localizeVersionRecord(
        {
          version: 2,
          label: "Rechecked restricted metadata revision",
          fingerprint: "sha256-after",
          createdAt: "2026-08-30T00:00:00.000Z",
          changes: [
            "Set document Title in the document information dictionary",
            "Set document catalog language to zh-CN",
            "Updated the document modification date for the new revision",
          ],
        },
        "zh",
      ),
    ).toMatchObject({
      label: "已复查的受限元数据修订版",
      changes: [
        "在文档信息字典中设置文档标题",
        "将文档目录语言设置为 zh-CN",
        "为新修订版更新文档修改日期",
      ],
    });
  });
});
