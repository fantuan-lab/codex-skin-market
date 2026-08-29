import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import { analyzePdf, PdfAnalysisError } from "@/lib/pdf/analyze";
import { createMetadataRevision } from "@/lib/pdf/remediate";
import { buildEvidencePack, renderEvidenceHtml } from "@/lib/pdf/report";

const fixtureDirectory = path.resolve(process.cwd(), "public", "fixtures");
const profiles = ["wcag21", "section508", "pdfua1", "en301549"] as const;

describe("real PDF fixture analysis", () => {
  it("reads positive metadata and structure signals from the well-tagged fixture", async () => {
    const bytes = await fixture("well-tagged-basic.pdf");
    const result = await analyzePdf(bytes, {
      fileName: "well-tagged-basic.pdf",
      profileIds: [...profiles],
    });

    expect(result.pageCount).toBe(2);
    expect(result.textBased).toBe(true);
    expect(result.metadata.title).toBe("Student Services Orientation Guide");
    expect(result.metadata.language).toBe("en-US");
    expect(result.metadata.tagged).toBe(true);
    expect(result.pages.flatMap((page) => page.structureRoles)).toContain("H1");
    expect(result.pages.flatMap((page) => page.structureRoles)).toContain("Figure");
    expect(result.pages.reduce((sum, page) => sum + page.figuresWithAlt, 0)).toBeGreaterThan(0);
    expect(ruleIds(result)).not.toContain("META-001");
    expect(ruleIds(result)).not.toContain("META-002");
    expect(ruleIds(result)).not.toContain("STRUCT-001");
    expect(ruleIds(result)).not.toContain("OCR-001");
  });

  it("derives known findings from the untagged fixture rather than a fixture name", async () => {
    const bytes = await fixture("known-accessibility-issues.pdf");
    const result = await analyzePdf(bytes, {
      fileName: "renamed-input.pdf",
      profileIds: [...profiles],
    });

    expect(result.textBased).toBe(true);
    expect(result.metadata.title).toBeNull();
    expect(result.metadata.language).toBeNull();
    expect(result.metadata.tagged).toBe(false);
    expect(result.metadata.hasAcroForm).toBe(true);
    expect(ruleIds(result)).toEqual(
      expect.arrayContaining([
        "META-001",
        "META-002",
        "STRUCT-001",
        "LIST-002",
        "TABLE-002",
        "FORM-001",
        "FORM-900",
      ]),
    );
    expect(result.findings.find((finding) => finding.ruleId === "FORM-001")).toMatchObject({
      page: 1,
      detection: "heuristic",
      outcome: "review",
    });
    expect(result.findings.every((finding) => !finding.evidence.includes("$15,000"))).toBe(true);
  });

  it("flags the raster-only fixture as an OCR risk without claiming OCR was performed", async () => {
    const bytes = await fixture("image-only-scan.pdf");
    const result = await analyzePdf(bytes, {
      fileName: "image-only-scan.pdf",
      profileIds: ["wcag21"],
    });
    const ocrFinding = result.findings.find((finding) => finding.ruleId === "OCR-001");

    expect(result.textBased).toBe(false);
    expect(result.pages[0].textCharacters).toBe(0);
    expect(result.pages[0].imagePaintOperations).toBeGreaterThan(0);
    expect(ocrFinding?.detection).toBe("heuristic");
    expect(ocrFinding?.method).toContain("does not verify");
  });

  it("creates a separate metadata revision and removes only the targeted metadata findings", async () => {
    const bytes = await metadataFixablePdf();
    const before = await analyzePdf(bytes, {
      fileName: "metadata-only-issues.pdf",
      profileIds: [...profiles],
    });
    const revision = await createMetadataRevision(bytes, before, {
      title: "Community Grant Application",
      language: "en-US",
    });
    const after = await analyzePdf(revision.bytes, {
      fileName: "metadata-only-issues-remediated-v2.pdf",
      profileIds: [...profiles],
    });

    expect(after.fingerprint).not.toBe(before.fingerprint);
    expect(after.pageCount).toBe(before.pageCount);
    expect(after.pages.map(protectedSignals)).toEqual(before.pages.map(protectedSignals));
    expect(after.metadata.title).toBe("Community Grant Application");
    expect(after.metadata.language).toBe("en-US");
    expect(ruleIds(after)).not.toContain("META-001");
    expect(ruleIds(after)).not.toContain("META-002");
    expect(ruleIds(after)).toContain("STRUCT-001");
  });

  it("blocks metadata writeback for AcroForm files and mismatched analyzed versions", async () => {
    const formBytes = await fixture("known-accessibility-issues.pdf");
    const formAnalysis = await analyzePdf(formBytes, {
      fileName: "known-accessibility-issues.pdf",
      profileIds: [...profiles],
    });
    expect(formAnalysis.findings.find((finding) => finding.ruleId === "META-001")?.safeFix).toBeUndefined();
    await expect(
      createMetadataRevision(formBytes, formAnalysis, { title: "Unsafe attempt" }),
    ).rejects.toThrow(/AcroForm/);

    const safeBytes = await metadataFixablePdf();
    const safeAnalysis = await analyzePdf(safeBytes, {
      fileName: "safe-source.pdf",
      profileIds: ["wcag21"],
    });
    const otherBytes = await metadataFixablePdf("Different source text for a new fingerprint.");
    await expect(
      createMetadataRevision(otherBytes, safeAnalysis, { title: "Wrong version" }),
    ).rejects.toThrow(/fingerprint/);
  });

  it("does not treat a MarkInfo declaration without exposed structure as usable tags", async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([420, 300]);
    const font = await document.embedFont(StandardFonts.Helvetica);
    page.drawText("Marked declaration without a structure tree must still be reported.", {
      x: 30,
      y: 240,
      size: 14,
      font,
    });
    document.catalog.set(
      PDFName.of("MarkInfo"),
      document.context.obj({ Marked: true }),
    );
    const bytes = await document.save({ useObjectStreams: false });
    const result = await analyzePdf(bytes, {
      fileName: "marked-without-structure.pdf",
      profileIds: ["wcag21"],
    });

    expect(result.metadata.markInfoMarked).toBe(true);
    expect(result.metadata.tagged).toBe(false);
    expect(result.findings.find((finding) => finding.ruleId === "STRUCT-001")?.evidence).toContain(
      "declaration alone",
    );
  });

  it("rejects a real 101-page PDF at the stated boundary", async () => {
    const document = await PDFDocument.create();
    for (let index = 0; index < 101; index += 1) document.addPage([100, 100]);
    const bytes = await document.save();

    await expect(
      analyzePdf(bytes, {
        fileName: "101-pages.pdf",
        profileIds: ["wcag21"],
      }),
    ).rejects.toMatchObject({ code: "page-limit" } satisfies Partial<PdfAnalysisError>);
  });

  it("builds an accessible human-readable and machine-readable evidence pack", async () => {
    const result = await analyzePdf(await fixture("known-accessibility-issues.pdf"), {
      fileName: "known-accessibility-issues.pdf",
      profileIds: [...profiles],
    });
    const html = renderEvidenceHtml(result);
    const pack = await buildEvidencePack(result);
    const archive = await import("jszip").then(({ default: JSZip }) =>
      JSZip.loadAsync(pack.blob.arrayBuffer()),
    );

    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Not a certificate of conformance");
    expect(html).toContain('<th scope="col">');
    expect(html).toContain("WCAG 2.0");
    expect(html).not.toMatch(/>Passed</i);
    expect(Object.keys(archive.files)).toEqual(
      expect.arrayContaining(["remediation-evidence.html", "evidence.json", "README.txt"]),
    );
  });
});

async function fixture(name: string) {
  return new Uint8Array(await readFile(path.join(fixtureDirectory, name)));
}

async function metadataFixablePdf(
  text = "A text-based PDF with enough extractable content for deterministic metadata writeback testing.",
) {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 54, y: 720, size: 12, font, maxWidth: 500 });
  return document.save({ useObjectStreams: false });
}

function ruleIds(result: Awaited<ReturnType<typeof analyzePdf>>) {
  return result.findings.map((finding) => finding.ruleId);
}

function protectedSignals(page: Awaited<ReturnType<typeof analyzePdf>>["pages"][number]) {
  return {
    textCharacters: page.textCharacters,
    textItems: page.textItems,
    imagePaintOperations: page.imagePaintOperations,
    linkAnnotations: page.linkAnnotations,
    widgetAnnotations: page.widgetAnnotations,
    structureRoles: [...page.structureRoles].sort(),
  };
}
