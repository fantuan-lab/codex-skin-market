import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
  StandardFonts,
  degrees,
} from "pdf-lib";
import { analyzePdf, fingerprintBytes, PdfAnalysisError } from "@/lib/pdf/analyze";
import { createMetadataRevision } from "@/lib/pdf/remediate";
import { buildEvidencePack, renderEvidenceHtml } from "@/lib/pdf/report";
import { restrictedMetadataEligibility, runPdfProbe } from "@/lib/pdf/safety";
import type { PdfAnalysis, PdfSafetyInspection } from "@/lib/pdf/types";

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
    expect(result.metadata.safetyInspection.markInfo).toBe("present");
    expect(result.findings.find((finding) => finding.ruleId === "META-001")?.safeFix).toBeUndefined();
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

describe("fail-closed metadata revision safety", () => {
  const safeInspection: PdfSafetyInspection = {
    metadata: "present",
    markInfo: "absent",
    fieldObjects: "absent",
    signatures: "absent",
    javaScriptActions: "absent",
    structureTrees: "absent",
  };

  it("treats every inconclusive analyzer probe as ineligible", async () => {
    for (const probe of Object.keys(safeInspection) as Array<keyof PdfSafetyInspection>) {
      const result = restrictedMetadataEligibility({
        textBased: true,
        encrypted: false,
        hasXfa: false,
        annotationCount: 0,
        imageCount: 0,
        linkCount: 0,
        tableCount: 0,
        safetyInspection: { ...safeInspection, [probe]: "unknown" },
      });
      expect(result.allowed, `${probe} unknown must fail closed`).toBe(false);
      expect(result.reasons.join(" ")).toContain("inconclusive");
    }

    const failedProbe = await runPdfProbe("signatures", async () => {
      throw new Error("parser failed");
    });
    expect(failedProbe).toEqual({
      state: "unknown",
      reason: "signatures inspection failed",
    });
  });

  it("treats every exposed restricted analyzer feature as ineligible", () => {
    const restricted = (Object.keys(safeInspection) as Array<keyof PdfSafetyInspection>)
      .filter((probe) => probe !== "metadata");
    for (const probe of restricted) {
      const result = restrictedMetadataEligibility({
        textBased: true,
        encrypted: false,
        hasXfa: false,
        annotationCount: 0,
        imageCount: 0,
        linkCount: 0,
        tableCount: 0,
        safetyInspection: { ...safeInspection, [probe]: "present" },
      });
      expect(result.allowed, `${probe} present must be rejected`).toBe(false);
    }
  });

  it.each([
    ["MarkInfo", /MarkInfo/, (document: PDFDocument) => {
      document.catalog.set(PDFName.of("MarkInfo"), document.context.obj({ Marked: true }));
    }],
    ["StructTreeRoot", /structure tree/, (document: PDFDocument) => {
      document.catalog.set(
        PDFName.of("StructTreeRoot"),
        document.context.obj({ Type: PDFName.of("StructTreeRoot"), K: [] }),
      );
    }],
    ["AcroForm", /AcroForm/, (document: PDFDocument) => {
      document.catalog.set(PDFName.of("AcroForm"), document.context.obj({ Fields: [] }));
    }],
    ["XFA", /XFA/, (document: PDFDocument) => {
      document.context.register(document.context.obj({ XFA: PDFString.of("<xfa/>") }));
    }],
    ["SigFlags", /signature flags/, (document: PDFDocument) => {
      document.context.register(document.context.obj({ SigFlags: 3 }));
    }],
    ["signature dictionary", /signature dictionary/, (document: PDFDocument) => {
      document.context.register(document.context.obj({
        Type: PDFName.of("Sig"),
        ByteRange: [0, 1, 2, 3],
        Contents: PDFHexString.of("00"),
      }));
    }],
    ["DocMDP", /document permissions/, (document: PDFDocument) => {
      document.catalog.set(
        PDFName.of("Perms"),
        document.context.obj({ DocMDP: document.context.obj({ Type: PDFName.of("Sig") }) }),
      );
    }],
    ["UR3", /usage-rights/, (document: PDFDocument) => {
      document.context.register(document.context.obj({ UR3: document.context.obj({}) }));
    }],
    ["OpenAction", /OpenAction/, (document: PDFDocument) => {
      document.catalog.set(
        PDFName.of("OpenAction"),
        document.context.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("x=1") }),
      );
    }],
    ["additional actions", /additional actions/, (document: PDFDocument) => {
      document.catalog.set(PDFName.of("AA"), document.context.obj({ WC: {} }));
    }],
    ["JavaScript action", /JavaScript/, (document: PDFDocument) => {
      document.context.register(
        document.context.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("x=1") }),
      );
    }],
    ["JavaScript name tree", /name tree/, (document: PDFDocument) => {
      document.addJavaScript("startup", "app.alert('x')");
    }],
    ["action entry", /action dictionary/, (document: PDFDocument) => {
      document.context.register(document.context.obj({
        A: document.context.obj({ S: PDFName.of("URI"), URI: PDFString.of("https://example.test") }),
      }));
    }],
    ["attachment name tree", /name tree/, async (document: PDFDocument) => {
      await document.attach(new TextEncoder().encode("secret"), "secret.txt", {
        mimeType: "text/plain",
      });
    }],
    ["embedded file", /embedded-file/, (document: PDFDocument) => {
      document.context.register(document.context.obj({ EF: document.context.obj({}) }));
    }],
    ["associated file", /associated-file/, (document: PDFDocument) => {
      document.catalog.set(PDFName.of("AF"), document.context.obj([]));
    }],
    ["collection", /PDF collection/, (document: PDFDocument) => {
      document.catalog.set(PDFName.of("Collection"), document.context.obj({}));
    }],
    ["annotation", /annotations|annotation dictionary/, (document: PDFDocument, page: ReturnType<PDFDocument["addPage"]>) => {
      page.node.set(
        PDFName.of("Annots"),
        document.context.obj([{
          Type: PDFName.of("Annot"),
          Subtype: PDFName.of("Text"),
          Rect: [10, 10, 20, 20],
        }]),
      );
    }],
    ["outlines", /document outlines/, (document: PDFDocument) => {
      document.catalog.set(PDFName.of("Outlines"), document.context.obj({ Count: 0 }));
    }],
    ["image XObject", /XObject/, (document: PDFDocument) => {
      document.context.register(document.context.stream(new Uint8Array([0]), {
        Type: PDFName.of("XObject"),
        Subtype: PDFName.of("Image"),
        Width: 1,
        Height: 1,
        ColorSpace: PDFName.of("DeviceGray"),
        BitsPerComponent: 8,
      }));
    }],
    ["Form XObject", /XObject/, (document: PDFDocument) => {
      document.context.register(document.context.formXObject([]));
    }],
    ["rich media", /annotation dictionary/, (document: PDFDocument) => {
      document.context.register(document.context.obj({
        Type: PDFName.of("Annot"),
        Subtype: PDFName.of("RichMedia"),
      }));
    }],
    ["XMP metadata", /XMP metadata/, (document: PDFDocument) => {
      document.catalog.set(
        PDFName.of("Metadata"),
        document.context.register(document.context.stream("<x:xmpmeta/>", {
          Type: PDFName.of("Metadata"),
          Subtype: PDFName.of("XML"),
        })),
      );
    }],
  ] as const)("rejects %s from real bytes even when analysis claims it is safe", async (
    _label,
    expected,
    configure,
  ) => {
    const bytes = await configurableTextPdf(configure);
    const actualAnalysis = await analyzePdf(bytes, {
      fileName: "dangerous.pdf",
      profileIds: ["wcag21"],
    });
    await expect(
      createMetadataRevision(bytes, lieAboutSafety(actualAnalysis), { title: "Unsafe attempt" }),
    ).rejects.toThrow(expected);
  });

  it("rejects malformed input even when a forged analysis has its fingerprint", async () => {
    const safeBytes = await metadataFixablePdf();
    const safeAnalysis = await analyzePdf(safeBytes, {
      fileName: "safe.pdf",
      profileIds: ["wcag21"],
    });
    const malformed = new TextEncoder().encode(
      "%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 99 0 R >>\nendobj\n",
    );
    const forged = { ...safeAnalysis, fingerprint: await fingerprintBytes(malformed) };
    await expect(
      createMetadataRevision(malformed, forged, { title: "Must not write" }),
    ).rejects.toThrow(/strict parsing/);
  });

  it("rejects an encryption trailer before attempting a rewrite", async () => {
    const safeBytes = await metadataFixablePdf();
    const safeAnalysis = await analyzePdf(safeBytes, {
      fileName: "safe.pdf",
      profileIds: ["wcag21"],
    });
    const source = new TextDecoder("latin1").decode(safeBytes);
    const encrypted = new TextEncoder().encode(
      source.replace(/trailer\s*<<\s*/, (match) => `${match}/Encrypt 1 0 R\n`),
    );
    const forged = { ...safeAnalysis, fingerprint: await fingerprintBytes(encrypted) };
    await expect(
      createMetadataRevision(encrypted, forged, { title: "Must not write" }),
    ).rejects.toThrow(/encrypted/);
  });

  it.each([
    ["PDF NUL whitespace", new Uint8Array([0x00])],
    ["a tolerated isolated delimiter", new TextEncoder().encode(">")],
  ])("rejects an inline image preceded by %s", async (_label, prefix) => {
    const bytes = await configurableTextPdf((document, page) => {
      const inlineImage = new TextEncoder().encode(
        "BI /W 1 /H 1 /CS /G /BPC 8 ID \u0000 EI\n",
      );
      const contents = new Uint8Array(prefix.byteLength + inlineImage.byteLength);
      contents.set(prefix);
      contents.set(inlineImage, prefix.byteLength);
      const reference = document.context.register(document.context.stream(contents));
      page.node.addContentStream(reference);
    });
    const actualAnalysis = await analyzePdf(bytes, {
      fileName: "inline-image.pdf",
      profileIds: ["wcag21"],
    });
    await expect(
      createMetadataRevision(bytes, lieAboutSafety(actualAnalysis), { title: "Must not write" }),
    ).rejects.toThrow(/page operators|image/);
  });

  it("supports a simple text PDF that has no trailer Info dictionary", async () => {
    const document = await PDFDocument.create({ updateMetadata: false });
    const page = document.addPage([612, 792]);
    const font = await document.embedFont(StandardFonts.Helvetica);
    page.drawText(
      "A simple text PDF without an Info dictionary should still permit a restricted revision.",
      { x: 54, y: 720, size: 12, font, maxWidth: 500 },
    );
    const bytes = await document.save({ useObjectStreams: false });
    const analysis = await analyzePdf(bytes, {
      fileName: "without-info.pdf",
      profileIds: ["wcag21"],
    });
    const strictSource = await PDFDocument.load(bytes, {
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
    expect(strictSource.context.trailerInfo.Info).toBeUndefined();
    expect(analysis.findings.find((finding) => finding.ruleId === "META-001")?.safeFix)
      .toBe("document-title");

    const revision = await createMetadataRevision(bytes, analysis, { title: "Added Title" });
    const output = await PDFDocument.load(revision.bytes, {
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
    expect(output.getTitle()).toBe("Added Title");
  });

  it("revises title and language without mutating the source or protected page state", async () => {
    const bytes = await configurableTextPdf((document, page) => {
      document.setAuthor("Original Author");
      document.setSubject("Original Subject");
      document.setKeywords(["original", "protected"]);
      page.setRotation(degrees(90));
      page.setCropBox(8, 10, 580, 740);
      page.setBleedBox(6, 8, 584, 744);
      page.setTrimBox(10, 12, 576, 736);
      page.setArtBox(12, 14, 572, 732);
      document.catalog.set(
        PDFName.of("ViewerPreferences"),
        document.context.obj({ DisplayDocTitle: false }),
      );
    });
    const sourceCopy = bytes.slice();
    const beforeDocument = await PDFDocument.load(bytes, {
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
    const beforeAnalysis = await analyzePdf(bytes, {
      fileName: "simple.pdf",
      profileIds: ["wcag21"],
    });
    const beforeText = await extractedPageText(bytes);

    const revision = await createMetadataRevision(bytes, beforeAnalysis, {
      title: "Verified Title",
      language: "en-US",
    });
    const output = await PDFDocument.load(revision.bytes, {
      updateMetadata: false,
      throwOnInvalidObject: true,
    });

    expect(bytes).toEqual(sourceCopy);
    expect(revision.bytes).not.toEqual(sourceCopy);
    expect(output.getTitle()).toBe("Verified Title");
    expect(readPdfNameOrString(output, "Lang")).toBe("en-US");
    expect(output.getAuthor()).toBe(beforeDocument.getAuthor());
    expect(output.getSubject()).toBe(beforeDocument.getSubject());
    expect(output.getKeywords()).toBe(beforeDocument.getKeywords());
    expect(pageGeometry(output)).toEqual(pageGeometry(beforeDocument));
    expect(await extractedPageText(revision.bytes)).toEqual(beforeText);
    expect(
      output.catalog.lookup(PDFName.of("ViewerPreferences"))?.toString(),
    ).toBe(beforeDocument.catalog.lookup(PDFName.of("ViewerPreferences"))?.toString());
    expect(revision.changes).toEqual(expect.arrayContaining([
      expect.stringContaining("Title"),
      expect.stringContaining("language"),
      expect.stringContaining("modification date"),
    ]));
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

async function configurableTextPdf(
  configure: (
    document: PDFDocument,
    page: ReturnType<PDFDocument["addPage"]>,
  ) => void | Promise<void>,
) {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText(
    "A plain text document with enough searchable characters for deterministic safety testing.",
    { x: 54, y: 720, size: 12, font, maxWidth: 500 },
  );
  await configure(document, page);
  return document.save({ useObjectStreams: false });
}

function lieAboutSafety(analysis: PdfAnalysis): PdfAnalysis {
  return {
    ...structuredClone(analysis),
    textBased: true,
    metadata: {
      ...analysis.metadata,
      tagged: false,
      encrypted: false,
      hasAcroForm: false,
      hasSignatures: false,
      hasXfa: false,
      hasJavaScript: false,
      safetyInspection: {
        metadata: "present",
        markInfo: "absent",
        fieldObjects: "absent",
        signatures: "absent",
        javaScriptActions: "absent",
        structureTrees: "absent",
      },
    },
    pages: analysis.pages.map((page) => ({
      ...page,
      annotationCount: 0,
      imagePaintOperations: 0,
      linkAnnotations: 0,
      widgetAnnotations: 0,
      tableCount: 0,
    })),
  };
}

async function extractedPageText(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: bytes.slice(), useWorkerFetch: false, verbosity: 0 });
  const document = await task.promise;
  try {
    const result: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      result.push(content.items.map((item) => "str" in item ? item.str : "").join(""));
      page.cleanup();
    }
    return result;
  } finally {
    await task.destroy();
  }
}

function pageGeometry(document: PDFDocument) {
  return document.getPages().map((page) => ({
    media: page.getMediaBox(),
    crop: page.getCropBox(),
    bleed: page.getBleedBox(),
    trim: page.getTrimBox(),
    art: page.getArtBox(),
    rotation: page.getRotation().angle,
  }));
}

function readPdfNameOrString(document: PDFDocument, key: string) {
  const value = document.catalog.lookup(PDFName.of(key)) as
    | { decodeText?: () => string }
    | undefined;
  return value?.decodeText?.();
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
