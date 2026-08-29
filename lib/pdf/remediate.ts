import type { PDFDocument as PdfLibDocument } from "pdf-lib";
import { fingerprintBytes } from "./analyze";
import type { PdfAnalysis } from "./types";

export interface MetadataFixes {
  title?: string;
  language?: string;
}

export interface MetadataRevision {
  bytes: Uint8Array;
  changes: string[];
}

export async function createMetadataRevision(
  input: Uint8Array,
  analysis: PdfAnalysis,
  fixes: MetadataFixes,
): Promise<MetadataRevision> {
  const inputFingerprint = await fingerprintBytes(input);
  if (inputFingerprint !== analysis.fingerprint) {
    throw new Error(
      "The selected bytes do not match the analyzed file fingerprint. Analyze this exact version before writeback.",
    );
  }
  if (
    !analysis.textBased ||
    analysis.metadata.encrypted ||
    analysis.metadata.hasAcroForm ||
    analysis.metadata.hasSignatures ||
    analysis.metadata.hasXfa ||
    analysis.metadata.hasJavaScript
  ) {
    throw new Error(
      "Metadata writeback is disabled for image-only, encrypted, AcroForm, signed, XFA, or scripted PDFs. Escalate this file to a specialist.",
    );
  }
  if (
    analysis.metadata.tagged ||
    analysis.pages.some(
      (page) =>
        page.imagePaintOperations > 0 ||
        page.linkAnnotations > 0 ||
        page.tableCount > 0 ||
        page.widgetAnnotations > 0,
    )
  ) {
    throw new Error(
      "Metadata writeback is limited to simple text PDFs without exposed tags, images, links, tables, or widgets. Escalate richer files to a specialist.",
    );
  }

  const title = fixes.title?.trim();
  const language = fixes.language?.trim();
  if (!title && !language) throw new Error("Enter at least one metadata change.");
  if (title && title.length > 300) {
    throw new Error("Keep the document title at 300 characters or fewer.");
  }
  if (language && !isPlausibleLanguageTag(language)) {
    throw new Error("Enter a valid BCP 47 language tag, such as en-US.");
  }

  const { PDFDocument, PDFName } = await import("pdf-lib");
  const source = await PDFDocument.load(input, { updateMetadata: false });
  if (source.catalog.has(PDFName.of("AcroForm"))) {
    throw new Error(
      "Metadata writeback is disabled when an AcroForm catalog is present. Escalate this file to a specialist.",
    );
  }
  const before = structuralSnapshot(source, PDFName);
  const changes: string[] = [];

  if (title) {
    source.setTitle(title, { showInWindowTitleBar: true });
    changes.push("Set document Title and enabled DisplayDocTitle");
  }
  if (language) {
    source.setLanguage(language);
    changes.push(`Set document language to ${language}`);
  }
  source.setModificationDate(new Date());

  const bytes = await source.save({
    addDefaultPage: false,
    updateFieldAppearances: false,
    useObjectStreams: false,
  });
  const reopened = await PDFDocument.load(bytes, { updateMetadata: false });
  const after = structuralSnapshot(reopened, PDFName);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(
      "The metadata-only revision changed a protected structural signal, so the output was discarded.",
    );
  }

  if (title && reopened.getTitle()?.trim() !== title) {
    throw new Error("The saved document title did not verify after writeback.");
  }
  if (language && readCatalogText(reopened, PDFName, "Lang") !== language) {
    throw new Error("The saved document language did not verify after writeback.");
  }

  return { bytes, changes };
}

function readCatalogText(
  document: PdfLibDocument,
  PDFName: typeof import("pdf-lib")["PDFName"],
  key: string,
) {
  const value = document.catalog.lookup(PDFName.of(key)) as
    | { decodeText?: () => string }
    | undefined;
  return typeof value?.decodeText === "function" ? value.decodeText().trim() : null;
}

function structuralSnapshot(
  document: PdfLibDocument,
  PDFName: typeof import("pdf-lib")["PDFName"],
) {
  const structTreeRoot = PDFName.of("StructTreeRoot");
  const acroForm = PDFName.of("AcroForm");
  const annotations = PDFName.of("Annots");
  return {
    pages: document.getPageCount(),
    hasStructTreeRoot: document.catalog.has(structTreeRoot),
    hasAcroForm: document.catalog.has(acroForm),
    pageAnnotationCounts: document.getPages().map((page) => {
      const value = page.node.lookup(annotations);
      if (!value || typeof (value as unknown as { size?: () => number }).size !== "function") return 0;
      return (value as unknown as { size: () => number }).size();
    }),
  };
}

function isPlausibleLanguageTag(value: string) {
  try {
    const locale = new Intl.Locale(value);
    return Boolean(locale.language && /^[A-Za-z]{2,8}$/.test(locale.language));
  } catch {
    return false;
  }
}
