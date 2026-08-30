import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  categoryLabel,
  detectionLabel,
  getStandardProfileCopy,
  getUiCopy,
  isLocale,
  localizeFinding,
  localizeFindingLocation,
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
    expect(chinese.report.htmlLang).toBe("zh-CN");

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
});
