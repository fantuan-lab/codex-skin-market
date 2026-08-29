import { referencesFor } from "./standards";
import type {
  AnalyzeOptions,
  CoverageItem,
  Finding,
  FindingCategory,
  PageSignalSummary,
  PdfAnalysis,
  Severity,
  StandardProfileId,
} from "./types";

export const ANALYZER_VERSION = "0.1.0";
export const RULESET_VERSION = "2026.08-mvp.1";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_PAGES = 100;
export const MAX_TEXT_ITEMS = 250_000;
export const MAX_OPERATOR_COUNT = 1_000_000;

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

interface TextItemSignal {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnnotationSignal {
  subtype?: string;
  fieldName?: string;
  alternativeText?: string;
  rect?: number[];
  url?: string;
  unsafeUrl?: string;
  dest?: unknown;
}

interface StructNodeSignal {
  role?: string;
  alt?: string;
  actualText?: string;
  children?: StructNodeSignal[];
  scope?: string;
  headers?: string[];
}

interface StructSummary {
  roles: string[];
  headingRoles: string[];
  figures: number;
  figuresWithAlt: number;
  tables: number;
  tableHeaders: number;
  malformedLists: number;
  genericHeadings: number;
}

export class PdfAnalysisError extends Error {
  constructor(
    message: string,
    readonly code:
      | "file-too-large"
      | "not-pdf"
      | "page-limit"
      | "password"
      | "cancelled"
      | "analysis-budget"
      | "parse-error",
  ) {
    super(message);
    this.name = "PdfAnalysisError";
  }
}

export async function analyzePdf(
  input: ArrayBuffer | Uint8Array,
  options: AnalyzeOptions,
): Promise<PdfAnalysis> {
  const bytes = input instanceof Uint8Array ? input.slice() : new Uint8Array(input.slice(0));
  validateInput(bytes);
  assertNotCancelled(options.signal);

  const fingerprintPromise = fingerprintBytes(bytes);
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: bytes.slice(),
    useWorkerFetch: false,
    verbosity: 0,
  });
  const abortLoading = () => void loadingTask.destroy();
  options.signal?.addEventListener("abort", abortLoading, { once: true });

  let document: Awaited<typeof loadingTask.promise>;
  try {
    document = await loadingTask.promise;
  } catch (error) {
    options.signal?.removeEventListener("abort", abortLoading);
    await loadingTask.destroy().catch(() => undefined);
    if (options.signal?.aborted) {
      throw new PdfAnalysisError(
        "Analysis was cancelled. No file data was retained.",
        "cancelled",
      );
    }
    const name = error instanceof Error ? error.name : "";
    if (/password/i.test(name) || /password/i.test(String(error))) {
      throw new PdfAnalysisError(
        "This PDF is password-protected. Remove the password in an approved workflow before analysis.",
        "password",
      );
    }
    throw new PdfAnalysisError(
      "The file could not be parsed as a supported PDF.",
      "parse-error",
    );
  }

  if (document.numPages < 1 || document.numPages > MAX_PAGES) {
    await loadingTask.destroy();
    throw new PdfAnalysisError(
      `This MVP supports 1–${MAX_PAGES} pages. The selected file has ${document.numPages} pages.`,
      "page-limit",
    );
  }

  try {
    const [metadataResult, markInfo, fieldObjects, signatures, javaScriptActions] =
      await Promise.all([
        document.getMetadata().catch(() => ({ info: {}, metadata: null })),
        document.getMarkInfo().catch(() => null),
        document.getFieldObjects().catch(() => null),
        document.getSignatures().catch(() => null),
        document.getJSActions().catch(() => null),
      ]);

    const info = metadataResult.info as Record<string, unknown>;
    const markInfoMarked = readMarkInfo(markInfo, "Marked");
    const markInfoSuspects = readMarkInfo(markInfo, "Suspects");
    const xmpMetadata = metadataResult.metadata as
      | { get(name: string): string | null }
      | null;
    const title =
      cleanMetadataValue(info.Title) ??
      cleanMetadataValue(xmpMetadata?.get("dc:title"));
    let language =
      cleanMetadataValue(info.Language) ??
      cleanMetadataValue(xmpMetadata?.get("dc:language"));
    const pdfVersion = cleanMetadataValue(info.PDFFormatVersion ?? null);
    const profileIds = normalizeProfiles(options.profileIds);
    const analyzedAt = new Date().toISOString();
    const findings: Finding[] = [];
    const pages: PageSignalSummary[] = [];
    let findingSequence = 0;
    let firstTextLanguage: string | null = null;
    let totalTextCharacters = 0;
    let totalLinks = 0;
    let totalWidgets = 0;
    let totalImages = 0;
    let totalFigures = 0;
    let totalTables = 0;
    let totalTextItems = 0;
    let totalOperatorCount = 0;
    let hasAnyStructure = false;
    const headingSequence: Array<{ role: string; page: number }> = [];
    const visualHeadingPages: number[] = [];

    const addFinding = (
      finding: Omit<Finding, "id" | "status" | "history">,
    ) => {
      findingSequence += 1;
      const id = `${finding.ruleId}-${finding.page ?? "document"}-${findingSequence}`;
      findings.push({
        ...finding,
        id,
        status: "open",
        history: [
          {
            at: analyzedAt,
            from: null,
            to: "open",
            note: "Created from the recorded analysis signal.",
            actor: "analyzer",
          },
        ],
      });
    };

    options.onProgress?.({
      completedPages: 0,
      totalPages: document.numPages,
      message: "Reading document metadata",
    });

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      assertNotCancelled(options.signal);
      const page = await document.getPage(pageNumber);
      const [textContent, annotations, structTree, operatorList] = await Promise.all([
        page.getTextContent({ includeMarkedContent: true }),
        page.getAnnotations({ intent: "display" }),
        page.getStructTree().catch(() => null),
        page.getOperatorList(),
      ]);
      assertNotCancelled(options.signal);
      totalTextItems += textContent.items.length;
      totalOperatorCount += operatorList.fnArray.length;
      if (
        totalTextItems > MAX_TEXT_ITEMS ||
        totalOperatorCount > MAX_OPERATOR_COUNT
      ) {
        throw new PdfAnalysisError(
          "This PDF exceeds the MVP analysis safety budget. Escalate it for controlled desktop processing.",
          "analysis-budget",
        );
      }

      const textItems = textContent.items
        .filter((item): item is typeof item & { str: string; transform: number[]; width: number; height: number } =>
          "str" in item,
        )
        .map((item) => ({
          str: item.str,
          x: Number(item.transform[4] ?? 0),
          y: Number(item.transform[5] ?? 0),
          width: Number(item.width ?? 0),
          height: Math.abs(Number(item.height ?? item.transform[3] ?? 0)),
        }));
      const textCharacters = textItems.reduce(
        (total, item) => total + item.str.replace(/\s/g, "").length,
        0,
      );
      totalTextCharacters += textCharacters;
      if (!firstTextLanguage && textContent.lang) firstTextLanguage = textContent.lang;

      const typedAnnotations = annotations as AnnotationSignal[];
      const links = typedAnnotations.filter((annotation) => annotation.subtype === "Link");
      const widgets = typedAnnotations.filter(
        (annotation) => annotation.subtype === "Widget",
      );
      totalLinks += links.length;
      totalWidgets += widgets.length;

      const imagePaintOperations = countImageOperations(operatorList.fnArray, pdfjs);
      totalImages += imagePaintOperations;
      const structSummary = summarizeStructure(structTree as StructNodeSignal | null);
      hasAnyStructure ||= structSummary.roles.length > 0;
      totalFigures += structSummary.figures;
      totalTables += structSummary.tables;
      headingSequence.push(
        ...structSummary.headingRoles.map((role) => ({ role, page: pageNumber })),
      );

      const visualListCandidates = countVisualListCandidates(textItems);
      const visualTableRows = countVisualTableRows(textItems);
      const readingOrderRiskScore = calculateReadingOrderRisk(textItems);
      if (countVisualHeadingCandidates(textItems) > 0) visualHeadingPages.push(pageNumber);

      pages.push({
        page: pageNumber,
        textCharacters,
        textItems: textItems.length,
        imagePaintOperations,
        linkAnnotations: links.length,
        widgetAnnotations: widgets.length,
        structureRoles: unique(structSummary.roles),
        headingRoles: structSummary.headingRoles,
        figureCount: structSummary.figures,
        figuresWithAlt: structSummary.figuresWithAlt,
        tableCount: structSummary.tables,
        tableHeaderCount: structSummary.tableHeaders,
        visualListCandidates,
        visualTableRows,
        readingOrderRiskScore,
      });

      if (textCharacters < 20 && imagePaintOperations > 0) {
        addFinding({
          ruleId: "OCR-001",
          title: "Likely image-only page — OCR review required",
          category: "ocr",
          severity: "critical",
          detection: "heuristic",
          outcome: "review",
          page: pageNumber,
          location: `Page ${pageNumber}, page content stream`,
          evidence: `${textCharacters} extractable characters and ${imagePaintOperations} image paint operation${imagePaintOperations === 1 ? "" : "s"} were observed.`,
          metrics: { textCharacters, imagePaintOperations },
          method:
            "PDF.js text extraction and image-paint operator count. This does not verify whether the image contains text.",
          guidance: [
            "Confirm visually whether the page contains text that is only present in an image.",
            "Run approved OCR outside this MVP, then verify every character and the intended reading order.",
            "Re-export a searchable PDF and analyze the new version.",
          ],
          standardReferences: referencesFor("ocr", profileIds),
        });
      }

      if (structSummary.figures > structSummary.figuresWithAlt) {
        addFinding({
          ruleId: "FIG-001",
          title: "Tagged figure is missing alternate-description data",
          category: "images",
          severity: "high",
          detection: "machine",
          outcome: "failure",
          page: pageNumber,
          location: `Page ${pageNumber}, structure tree`,
          evidence: `${structSummary.figures - structSummary.figuresWithAlt} of ${structSummary.figures} Figure structure node${structSummary.figures === 1 ? "" : "s"} lacked an Alt or ActualText signal.`,
          metrics: {
            figures: structSummary.figures,
            figuresWithAlt: structSummary.figuresWithAlt,
          },
          method: "PDF.js structure-tree role and alternate-description inspection.",
          guidance: [
            "Determine whether each figure is informative, functional, or decorative.",
            "Add an equivalent alternate description for informative figures in a specialist PDF remediation tool.",
            "Mark truly decorative content as an artifact, then verify with assistive technology.",
          ],
          standardReferences: referencesFor("images", profileIds),
        });
      } else if (
        imagePaintOperations > structSummary.figures &&
        markInfoMarked
      ) {
        addFinding({
          ruleId: "FIG-002",
          title: "Image content needs structure and decorative-status review",
          category: "images",
          severity: "medium",
          detection: "heuristic",
          outcome: "review",
          page: pageNumber,
          location: `Page ${pageNumber}, image paint operations`,
          evidence: `${imagePaintOperations} image paint operation${imagePaintOperations === 1 ? "" : "s"} and ${structSummary.figures} Figure node${structSummary.figures === 1 ? "" : "s"} were observed.`,
          metrics: { imagePaintOperations, figures: structSummary.figures },
          method:
            "Comparison of PDF.js image-paint operations with exposed Figure structure nodes. Background and decorative images may be included.",
          guidance: [
            "Inspect each image and decide whether it is informative or decorative.",
            "Confirm that informative images map to Figure tags with accurate descriptions.",
            "Confirm decorative images are excluded from the reading order.",
          ],
          standardReferences: referencesFor("images", profileIds),
        });
      }

      if (structSummary.malformedLists > 0) {
        addFinding({
          ruleId: "LIST-001",
          title: "Tagged list structure is incomplete",
          category: "lists",
          severity: "high",
          detection: "machine",
          outcome: "failure",
          page: pageNumber,
          location: `Page ${pageNumber}, list structure`,
          evidence: `${structSummary.malformedLists} L node${structSummary.malformedLists === 1 ? "" : "s"} did not expose the expected LI / Lbl / LBody relationship.`,
          metrics: { malformedLists: structSummary.malformedLists },
          method: "PDF.js structure-tree relationship inspection.",
          guidance: [
            "Repair the list container and list-item hierarchy in a PDF tag editor.",
            "Keep labels and item bodies in their corresponding LI node.",
            "Verify list count and nesting with a screen reader.",
          ],
          standardReferences: referencesFor("lists", profileIds),
        });
      } else if (visualListCandidates >= 2 && !structSummary.roles.includes("L")) {
        addFinding({
          ruleId: "LIST-002",
          title: "Visual list pattern needs semantic list review",
          category: "lists",
          severity: "medium",
          detection: "heuristic",
          outcome: "review",
          page: pageNumber,
          location: `Page ${pageNumber}, extracted line starts`,
          evidence: `${visualListCandidates} bullet or numbered-line pattern${visualListCandidates === 1 ? "" : "s"} were found without an exposed L structure node.`,
          metrics: { visualListCandidates },
          method:
            "Text-line prefix heuristic compared with PDF.js structure-tree roles; decorative characters can produce false positives.",
          guidance: [
            "Confirm whether the lines form a real list.",
            "If they do, add L, LI, Lbl, and LBody structure in the intended nesting order.",
            "If they do not, record the reviewer rationale before dismissing this signal.",
          ],
          standardReferences: referencesFor("lists", profileIds),
        });
      }

      const unresolvedLinks = links.filter(
        (annotation) => !annotation.url && !annotation.unsafeUrl && !annotation.dest,
      );
      if (unresolvedLinks.length > 0) {
        addFinding({
          ruleId: "LINK-001",
          title: "Link annotation has no exposed destination",
          category: "links",
          severity: "high",
          detection: "machine",
          outcome: "failure",
          page: pageNumber,
          location: annotationLocations(unresolvedLinks, pageNumber),
          evidence: `${unresolvedLinks.length} Link annotation${unresolvedLinks.length === 1 ? "" : "s"} lacked an exposed URI or document destination.`,
          metrics: { unresolvedLinks: unresolvedLinks.length },
          method: "PDF.js Link annotation inspection. URLs are not retained in evidence.",
          guidance: [
            "Open each link and verify that it has a valid destination.",
            "Associate the annotation with the corresponding Link tag.",
            "Verify link text communicates purpose in context.",
          ],
          standardReferences: referencesFor("links", profileIds),
        });
      }

      const unlabeledWidgets = widgets.filter(
        (annotation) => !cleanMetadataValue(annotation.alternativeText),
      );
      if (unlabeledWidgets.length > 0) {
        addFinding({
          ruleId: "FORM-001",
          title: "Form field lacks a tooltip / accessibility-name signal",
          category: "forms",
          severity: "high",
          detection: "heuristic",
          outcome: "review",
          page: pageNumber,
          location: annotationLocations(unlabeledWidgets, pageNumber),
          evidence: `${unlabeledWidgets.length} Widget annotation${unlabeledWidgets.length === 1 ? "" : "s"} lacked the alternativeText (/TU tooltip) signal exposed by the parser. A field name alone does not establish an appropriate accessible name.`,
          metrics: { unlabeledWidgets: unlabeledWidgets.length },
          method:
            "PDF.js Widget annotation fieldName and alternativeText signal inspection. This signal cannot determine the final name announced by a PDF reader; field values are not retained.",
          guidance: [
            "Add a concise tooltip or accessible name that describes the requested input.",
            "Confirm the visible label, programmatic name, and instructions agree.",
            "Test focus order, keyboard operation, errors, and screen-reader output in a desktop PDF reader.",
          ],
          standardReferences: referencesFor("forms", profileIds),
        });
      }

      if (structSummary.tables > 0 && structSummary.tableHeaders === 0) {
        addFinding({
          ruleId: "TABLE-001",
          title: "Tagged table has no exposed header cells",
          category: "tables",
          severity: "high",
          detection: "machine",
          outcome: "failure",
          page: pageNumber,
          location: `Page ${pageNumber}, Table structure`,
          evidence: `${structSummary.tables} Table node${structSummary.tables === 1 ? "" : "s"} and no TH nodes were exposed.`,
          metrics: {
            tables: structSummary.tables,
            tableHeaders: structSummary.tableHeaders,
          },
          method: "PDF.js Table and TH structure-role inspection.",
          guidance: [
            "Confirm the content is a data table rather than a layout table.",
            "Add TH cells and associate headers with each data cell.",
            "Escalate merged cells, multi-level headers, or complex spans for specialist review.",
          ],
          standardReferences: referencesFor("tables", profileIds),
        });
      } else if (visualTableRows >= 3 && structSummary.tables === 0) {
        addFinding({
          ruleId: "TABLE-002",
          title: "Aligned multi-column content needs table review",
          category: "tables",
          severity: "medium",
          detection: "heuristic",
          outcome: "review",
          page: pageNumber,
          location: `Page ${pageNumber}, aligned text rows`,
          evidence: `${visualTableRows} rows with three or more aligned text items were observed without an exposed Table node.`,
          metrics: { visualTableRows },
          method:
            "Text-coordinate alignment heuristic compared with PDF.js structure roles; columns and forms can resemble tables.",
          guidance: [
            "Confirm whether the aligned content communicates row and column relationships.",
            "For a data table, add Table, TR, TH, and TD structure and header associations.",
            "Escalate complex spans and nested tables to a specialist.",
          ],
          standardReferences: referencesFor("tables", profileIds),
        });
      }

      if (readingOrderRiskScore >= 45) {
        addFinding({
          ruleId: "ORDER-001",
          title: "Content-stream order differs substantially from visual order",
          category: "reading-order",
          severity: "high",
          detection: "heuristic",
          outcome: "review",
          page: pageNumber,
          location: `Page ${pageNumber}, text content sequence`,
          evidence: `The geometry comparison produced a ${readingOrderRiskScore}/100 risk score.`,
          metrics: { readingOrderRiskScore },
          method:
            "PDF.js text-content sequence compared with a top-to-bottom, left-to-right geometric ordering. Multi-column layouts can legitimately differ.",
          guidance: [
            "Review the page in the tag tree and reading-order tools.",
            "Test linear reading with a screen reader in the intended PDF reader.",
            "Confirm sidebars, footnotes, captions, and repeated headers occur at a meaningful point.",
          ],
          standardReferences: referencesFor("reading-order", profileIds),
        });
      }

      const replacementCharacters = textItems.reduce(
        (total, item) => total + (item.str.match(/\uFFFD/g)?.length ?? 0),
        0,
      );
      if (textCharacters > 20 && replacementCharacters / textCharacters > 0.01) {
        addFinding({
          ruleId: "TEXT-001",
          title: "Extracted text contains replacement-character signals",
          category: "text-encoding",
          severity: "high",
          detection: "heuristic",
          outcome: "review",
          page: pageNumber,
          location: `Page ${pageNumber}, extracted character map`,
          evidence: `${replacementCharacters} replacement-character signal${replacementCharacters === 1 ? "" : "s"} were observed across ${textCharacters} non-space characters.`,
          metrics: { replacementCharacters, textCharacters },
          method: "PDF.js extracted Unicode text inspection. No document text is retained.",
          guidance: [
            "Copy sample text into a plain-text editor and compare it with the visible page.",
            "Verify character pronunciation with a screen reader.",
            "Re-export with embedded fonts and a valid ToUnicode map if the text is corrupted.",
          ],
          standardReferences: referencesFor("structure", profileIds),
        });
      }

      page.cleanup();
      options.onProgress?.({
        completedPages: pageNumber,
        totalPages: document.numPages,
        message: `Analyzed page ${pageNumber} of ${document.numPages}`,
      });
      await yieldToBrowser();
    }

    language ||= firstTextLanguage;
    const textBased = totalTextCharacters >= Math.max(40, document.numPages * 10);
    const tagged = hasAnyStructure;
    const encrypted = Boolean(info.EncryptFilterName ?? info.IsEncrypted);
    const hasSignatures = Boolean(info.IsSignaturesPresent || signatures?.length);
    const hasXfa = Boolean(
      info.IsXFAPresent ||
        (document as unknown as { isPureXfa?: boolean }).isPureXfa,
    );
    const hasJavaScript = Boolean(javaScriptActions && javaScriptActions.size > 0);
    const hasAcroForm = Boolean(
      info.IsAcroFormPresent ||
        totalWidgets > 0 ||
        (fieldObjects && Object.keys(fieldObjects).length > 0),
    );
    const allowsMetadataWriteback =
      textBased &&
      !encrypted &&
      !hasSignatures &&
      !hasXfa &&
      !hasJavaScript &&
      !hasAcroForm &&
      !hasAnyStructure &&
      totalImages === 0 &&
      totalLinks === 0 &&
      totalTables === 0;

    if (!title) {
      addFinding({
        ruleId: "META-001",
        title: "Document title metadata is missing",
        category: "metadata",
        severity: "high",
        detection: "machine",
        outcome: "failure",
        page: null,
        location: "Document information dictionary and XMP metadata",
        evidence: "No non-empty Title value was exposed by PDF.js metadata inspection.",
        metrics: { titlePresent: false },
        method: "PDF.js document information and XMP metadata inspection.",
        guidance: [
          "Enter a concise title that identifies the document's topic or purpose.",
          "Apply the metadata-only fix to a new PDF version.",
          "Recheck that the viewer displays the document title and that the title is accurate.",
        ],
        standardReferences: referencesFor("title", profileIds),
        ...(allowsMetadataWriteback ? { safeFix: "document-title" as const } : {}),
        before: "Missing",
      });
    }

    if (!language || !isPlausibleLanguageTag(language)) {
      addFinding({
        ruleId: "META-002",
        title: language
          ? "Document language value needs correction"
          : "Document language metadata is missing",
        category: "metadata",
        severity: "high",
        detection: "machine",
        outcome: "failure",
        page: null,
        location: "Document catalog /Lang and extracted text language",
        evidence: language
          ? "A language value was exposed, but it could not be parsed as a plausible BCP 47 language tag."
          : "No document language value was exposed by metadata or page text content.",
        metrics: { languagePresent: Boolean(language), languageSyntaxValid: false },
        method: "PDF.js language signals with Intl.Locale syntax validation.",
        guidance: [
          "Choose the primary natural language used by the document.",
          "Apply a valid BCP 47 language tag, such as en-US, to a new PDF version.",
          "Review passages in other languages and tag language changes separately in a specialist tool.",
        ],
        standardReferences: referencesFor("language", profileIds),
        ...(allowsMetadataWriteback ? { safeFix: "document-language" as const } : {}),
        before: language ?? "Missing",
      });
    }

    if (!tagged) {
      addFinding({
        ruleId: "STRUCT-001",
        title: "No usable tagged structure was exposed",
        category: "structure",
        severity: "critical",
        detection: "machine",
        outcome: "failure",
        page: null,
        location: "Document MarkInfo and page structure trees",
        evidence: markInfoMarked
          ? "MarkInfo declared the file as marked, but no page exposed usable structure roles. The declaration alone is not treated as structure evidence."
          : "MarkInfo did not indicate Marked content and no page returned structure roles.",
        metrics: {
          markInfoMarked,
          pageStructurePresent: hasAnyStructure,
        },
        method: "PDF.js MarkInfo and per-page structure-tree inspection.",
        guidance: [
          "Create a logical tag tree from the source document or a specialist PDF remediation tool.",
          "Map headings, paragraphs, lists, links, figures, tables, and form controls to semantic tags.",
          "Verify tag order and semantics manually; this MVP does not create a tag tree.",
        ],
        standardReferences: referencesFor("structure", profileIds),
      });
    } else if (markInfoSuspects) {
      addFinding({
        ruleId: "STRUCT-002",
        title: "PDF MarkInfo flags the structure as suspect",
        category: "structure",
        severity: "high",
        detection: "machine",
        outcome: "failure",
        page: null,
        location: "Document catalog MarkInfo /Suspects",
        evidence: "The MarkInfo Suspects flag was true.",
        metrics: { markInfoSuspects: true },
        method: "PDF.js MarkInfo inspection.",
        guidance: [
          "Audit the full structure tree for generated or incorrect tags.",
          "Resolve content incorrectly tagged as artifacts or assigned the wrong semantic role.",
          "Re-run a specialist PDF/UA validator after repair.",
        ],
        standardReferences: referencesFor("structure", profileIds),
      });
    }

    for (let index = 1; index < headingSequence.length; index += 1) {
      const previous = headingLevel(headingSequence[index - 1].role);
      const current = headingLevel(headingSequence[index].role);
      if (previous && current && current > previous + 1) {
        addFinding({
          ruleId: "HEAD-001",
          title: "Tagged heading hierarchy skips a level",
          category: "headings",
          severity: "high",
          detection: "machine",
          outcome: "failure",
          page: headingSequence[index].page,
          location: `Page ${headingSequence[index].page}, heading sequence`,
          evidence: `${headingSequence[index - 1].role} is followed by ${headingSequence[index].role}.`,
          metrics: {
            previousHeading: headingSequence[index - 1].role,
            currentHeading: headingSequence[index].role,
          },
          method: "Ordered PDF.js H1–H6 structure-role comparison.",
          guidance: [
            "Confirm the intended outline in the source document.",
            "Retag headings so levels reflect section nesting without relying on visual size alone.",
            "Review the complete heading list with a screen reader.",
          ],
          standardReferences: referencesFor("headings", profileIds),
        });
      }
    }

    if (headingSequence.some((heading) => heading.role === "H")) {
      addFinding({
        ruleId: "HEAD-002",
        title: "Generic heading tags need hierarchy verification",
        category: "headings",
        severity: "medium",
        detection: "manual",
        outcome: "review",
        page: null,
        location: "Document heading structure",
        evidence: "One or more generic H roles were exposed without an explicit H1–H6 level.",
        metrics: {
          genericHeadingCount: headingSequence.filter((heading) => heading.role === "H")
            .length,
        },
        method: "PDF.js heading-role inspection.",
        guidance: [
          "Compare each generic heading with the document outline.",
          "Assign explicit levels where the authoring and target standards require them.",
          "Confirm headings remain meaningful when read as a list out of context.",
        ],
        standardReferences: referencesFor("headings", profileIds),
      });
    } else if (!tagged && visualHeadingPages.length > 0) {
      addFinding({
        ruleId: "HEAD-003",
        title: "Visual heading candidates need semantic tagging review",
        category: "headings",
        severity: "medium",
        detection: "heuristic",
        outcome: "review",
        page: visualHeadingPages[0],
        location: `Pages ${visualHeadingPages.slice(0, 8).join(", ")}${visualHeadingPages.length > 8 ? " and others" : ""}`,
        evidence: `${visualHeadingPages.length} page${visualHeadingPages.length === 1 ? "" : "s"} contained short text with a font-height signal substantially larger than the page median.`,
        metrics: { candidatePages: visualHeadingPages.length },
        method:
          "Font-height and line-length heuristic. Large text may be decorative or a callout, so semantic intent requires review.",
        guidance: [
          "Identify text that functions as a section heading rather than relying on visual appearance.",
          "Add heading tags that match the document outline.",
          "Record a reviewer rationale for false-positive display text.",
        ],
        standardReferences: referencesFor("headings", profileIds),
      });
    }

    addFinding({
      ruleId: "ORDER-900",
      title: "Logical reading order requires human and assistive-technology review",
      category: "reading-order",
      severity: "high",
      detection: "manual",
      outcome: "review",
      page: null,
      location: "All pages",
      evidence:
        "Automated geometry and tag signals cannot establish a meaningful reading experience.",
      metrics: { pagesRequiringReview: document.numPages },
      method: "Required manual coverage item; no pass/fail result is inferred.",
      guidance: [
        "Read the document linearly with a screen reader in the target PDF reader.",
        "Verify columns, captions, footnotes, sidebars, repeated headers, and artifacts.",
        "Record the reader, assistive technology, version, reviewer, and outcome.",
      ],
      standardReferences: referencesFor("reading-order", profileIds),
    });

    if (totalLinks > 0) {
      addFinding({
        ruleId: "LINK-900",
        title: "Link purpose and behavior require human verification",
        category: "links",
        severity: "medium",
        detection: "manual",
        outcome: "review",
        page: null,
        location: `${totalLinks} link annotation${totalLinks === 1 ? "" : "s"} across the document`,
        evidence:
          "The parser can identify annotations but cannot determine whether visible link text communicates purpose or whether the destination is appropriate.",
        metrics: { linkAnnotations: totalLinks },
        method: "Required semantic and interaction review for observed link annotations.",
        guidance: [
          "Review every link in context and in a screen-reader links list.",
          "Verify focus, activation, destination, and distinction from surrounding text.",
          "Do not expose sensitive target URLs in the audit record unless required by the engagement.",
        ],
        standardReferences: referencesFor("links", profileIds),
      });
    }

    if (totalImages > 0 || totalFigures > 0) {
      addFinding({
        ruleId: "FIG-900",
        title: "Alternate-text accuracy and decorative intent require human review",
        category: "images",
        severity: "high",
        detection: "manual",
        outcome: "review",
        page: null,
        location: "All pages containing image or Figure signals",
        evidence: `${totalImages} image paint operation${totalImages === 1 ? "" : "s"} and ${totalFigures} Figure node${totalFigures === 1 ? "" : "s"} were observed.`,
        metrics: { imagePaintOperations: totalImages, figures: totalFigures },
        method: "Required semantic review for observed image and Figure signals.",
        guidance: [
          "Confirm each image's purpose in context.",
          "Evaluate whether descriptions provide equivalent information without unnecessary detail.",
          "Confirm decorative content is excluded from assistive-technology reading order.",
        ],
        standardReferences: referencesFor("images", profileIds),
      });
    }

    if (totalTables > 0 || pages.some((page) => page.visualTableRows >= 3)) {
      addFinding({
        ruleId: "TABLE-900",
        title: "Table relationships require human verification",
        category: "tables",
        severity: "high",
        detection: "manual",
        outcome: "review",
        page: null,
        location: "All pages containing table signals",
        evidence:
          "Cell meaning, complex spans, and header associations cannot be established from structural counts alone.",
        metrics: { tableNodes: totalTables },
        method: "Required semantic and assistive-technology review for observed table signals.",
        guidance: [
          "Navigate every data table by row and column with a screen reader.",
          "Verify header announcements, spans, abbreviations, and reading order.",
          "Escalate complex, nested, or layout-driven tables to a specialist.",
        ],
        standardReferences: referencesFor("tables", profileIds),
      });
    }

    if (totalWidgets > 0 || fieldObjects) {
      addFinding({
        ruleId: "FORM-900",
        title: "Interactive form behavior requires specialist verification",
        category: "forms",
        severity: "critical",
        detection: "manual",
        outcome: "review",
        page: null,
        location: "Interactive form fields",
        evidence: `${totalWidgets} Widget annotation${totalWidgets === 1 ? "" : "s"} were observed.`,
        metrics: { widgetAnnotations: totalWidgets },
        method:
          "Required interaction review. This MVP does not evaluate scripts, errors, field dependencies, or complete tab order.",
        guidance: [
          "Test every field using keyboard-only input and a screen reader.",
          "Verify labels, instructions, required state, errors, focus order, and submission behavior.",
          "Escalate XFA, calculations, signatures, and scripted validation.",
        ],
        standardReferences: referencesFor("forms", profileIds),
      });
    }

    addFinding({
      ruleId: "COVERAGE-001",
      title: "Visual presentation checks were not evaluated",
      category: "coverage",
      severity: "medium",
      detection: "not-evaluated",
      outcome: "not-evaluated",
      page: null,
      location: "Document-wide",
      evidence:
        "This browser analysis did not measure color contrast, color-only meaning, zoom, reflow, clipping, or visual focus indicators.",
      metrics: { evaluated: false },
      method: "Declared analyzer coverage limit.",
      guidance: [
        "Review visual contrast and information conveyed by color.",
        "Test zoom, magnification, and document usability in the target reader.",
        "Record the tools, settings, pages sampled, and reviewer outcome.",
      ],
      standardReferences: [],
    });

    addFinding({
      ruleId: "COVERAGE-002",
      title: "Complex semantics were not evaluated",
      category: "coverage",
      severity: "high",
      detection: "not-evaluated",
      outcome: "not-evaluated",
      page: null,
      location: "Document-wide",
      evidence:
        "Formula semantics, complex tag trees, complex tables, XFA, scripts, signatures, and complete PDF/UA syntax are outside the MVP ruleset.",
      metrics: {
        xfaSignal: Boolean((document as unknown as { isPureXfa?: boolean }).isPureXfa),
        signaturesPresent: Boolean(signatures?.length),
        javaScriptPresent: Boolean(javaScriptActions && javaScriptActions.size > 0),
      },
      method: "Declared analyzer coverage limit.",
      guidance: [
        "Escalate complex structures and interactive behavior to an accessibility specialist.",
        "Use a full PDF/UA validator and knowledge-person review where the target profile requires it.",
        "Document omitted methods and applicable procurement acceptance criteria.",
      ],
      standardReferences: [],
    });

    const fingerprint = await fingerprintPromise;
    const coverage = buildCoverage(findings, {
      titlePresent: Boolean(title),
      languagePresent: Boolean(language && isPlausibleLanguageTag(language)),
      tagged,
      totalLinks,
      totalImages,
      totalTables,
      totalWidgets,
    });

    return {
      tool: "ClearTag browser analyzer",
      toolVersion: ANALYZER_VERSION,
      rulesetVersion: RULESET_VERSION,
      analyzedAt,
      fileName: options.fileName,
      fileSize: bytes.byteLength,
      fingerprint,
      pageCount: document.numPages,
      textBased,
      profileIds,
      metadata: {
        title,
        language,
        pdfVersion,
        tagged,
        markInfoMarked,
        markInfoSuspects,
        encrypted,
        hasAcroForm,
        hasSignatures,
        hasXfa,
        hasJavaScript,
      },
      pages,
      findings: sortFindings(findings),
      coverage,
      versions: [
        {
          version: 1,
          label: "Original analyzed file",
          fingerprint,
          createdAt: analyzedAt,
          changes: ["Baseline analysis recorded"],
        },
      ],
      limits: [
        "Text-based PDFs from 1 to 100 pages; image-only pages receive an OCR risk signal, not OCR.",
        "No PDF body text, form values, or full link targets are sent to a server or persisted. Selected metadata, aggregate signals, and reviewer notes remain in this tab unless the reviewer downloads an evidence pack.",
        "Complex tag trees, formulas, complex tables, XFA, scripts, signatures, and interactive-form behavior require specialist review.",
        "A finding-free automated check is recorded as no machine-detectable issue found, never as compliance passed.",
      ],
    };
  } catch (error) {
    if (options.signal?.aborted) {
      throw new PdfAnalysisError(
        "Analysis was cancelled. No file data was retained.",
        "cancelled",
      );
    }
    if (error instanceof PdfAnalysisError) throw error;
    throw new PdfAnalysisError(
      "The PDF could not be fully analyzed within this MVP.",
      "parse-error",
    );
  } finally {
    options.signal?.removeEventListener("abort", abortLoading);
    await loadingTask.destroy().catch(() => undefined);
  }
}

function validateInput(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new PdfAnalysisError(
      `This MVP accepts files up to ${MAX_FILE_BYTES / (1024 * 1024)} MB.`,
      "file-too-large",
    );
  }
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
  if (!header.includes("%PDF-")) {
    throw new PdfAnalysisError("The selected file does not contain a PDF header.", "not-pdf");
  }
}

async function loadPdfJs(): Promise<PdfJsModule> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  return pdfjs;
}

function countImageOperations(fnArray: number[], pdfjs: PdfJsModule) {
  const imageOperations = new Set([
    pdfjs.OPS.paintImageXObject,
    pdfjs.OPS.paintInlineImageXObject,
    pdfjs.OPS.paintImageMaskXObject,
    pdfjs.OPS.paintSolidColorImageMask,
  ]);
  return fnArray.filter((operation) => imageOperations.has(operation)).length;
}

function summarizeStructure(root: StructNodeSignal | null): StructSummary {
  const summary: StructSummary = {
    roles: [],
    headingRoles: [],
    figures: 0,
    figuresWithAlt: 0,
    tables: 0,
    tableHeaders: 0,
    malformedLists: 0,
    genericHeadings: 0,
  };
  if (!root) return summary;

  const visit = (node: StructNodeSignal, depth: number) => {
    if (depth > 40) return;
    const role = typeof node.role === "string" ? node.role : null;
    if (role) {
      summary.roles.push(role);
      if (role === "H" || /^H[1-6]$/.test(role)) {
        summary.headingRoles.push(role);
        if (role === "H") summary.genericHeadings += 1;
      }
      if (role === "Figure") {
        summary.figures += 1;
        if (cleanMetadataValue(node.alt) || cleanMetadataValue(node.actualText)) {
          summary.figuresWithAlt += 1;
        }
      }
      if (role === "Table") summary.tables += 1;
      if (role === "TH") summary.tableHeaders += 1;
      if (role === "L" && !isWellFormedList(node)) summary.malformedLists += 1;
    }
    for (const child of node.children ?? []) visit(child, depth + 1);
  };
  visit(root, 0);
  return summary;
}

function isWellFormedList(node: StructNodeSignal) {
  const children = (node.children ?? []).filter((child) => child.role);
  const listItems = children.filter((child) => child.role === "LI");
  if (listItems.length === 0) return false;
  return listItems.every((item) => {
    const roles = (item.children ?? []).map((child) => child.role);
    return roles.includes("Lbl") && roles.includes("LBody");
  });
}

function countVisualListCandidates(items: TextItemSignal[]) {
  const prefix = /^\s*(?:[•●▪◦‣]|[-–—]|\d{1,3}[.)]|[A-Za-z][.)])\s+/;
  return items.filter((item) => prefix.test(item.str)).length;
}

function countVisualHeadingCandidates(items: TextItemSignal[]) {
  const heights = items
    .filter((item) => item.str.trim() && item.height > 0)
    .map((item) => item.height)
    .sort((a, b) => a - b);
  if (heights.length < 4) return 0;
  const median = heights[Math.floor(heights.length / 2)];
  return items.filter(
    (item) =>
      item.height >= median * 1.45 &&
      item.str.trim().length >= 3 &&
      item.str.trim().length <= 100,
  ).length;
}

function countVisualTableRows(items: TextItemSignal[]) {
  const rows = new Map<number, TextItemSignal[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const key = Math.round(item.y / 3) * 3;
    rows.set(key, [...(rows.get(key) ?? []), item]);
  }
  return [...rows.values()].filter((row) => {
    const sorted = row.sort((a, b) => a.x - b.x);
    const distinctColumns = sorted.filter(
      (item, index) => index === 0 || item.x - sorted[index - 1].x > 35,
    );
    return distinctColumns.length >= 3;
  }).length;
}

function calculateReadingOrderRisk(items: TextItemSignal[]) {
  const meaningful = items.filter((item) => item.str.trim().length > 0);
  if (meaningful.length < 12) return 0;
  const visual = [...meaningful].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 4) return b.y - a.y;
    return a.x - b.x;
  });
  const visualIndex = new Map(visual.map((item, index) => [item, index]));
  const threshold = Math.max(4, Math.floor(meaningful.length * 0.24));
  const mismatches = meaningful.filter(
    (item, index) => Math.abs((visualIndex.get(item) ?? index) - index) > threshold,
  ).length;
  return Math.min(100, Math.round((mismatches / meaningful.length) * 100));
}

function annotationLocations(annotations: AnnotationSignal[], pageNumber: number) {
  const rects = annotations
    .map((annotation) => annotation.rect)
    .filter((rect): rect is number[] => Array.isArray(rect) && rect.length >= 4)
    .slice(0, 3)
    .map((rect) => `[${rect.map((value) => Math.round(value)).join(", ")}]`);
  return rects.length
    ? `Page ${pageNumber}, annotation rectangles ${rects.join("; ")}`
    : `Page ${pageNumber}, annotation layer`;
}

function headingLevel(role: string) {
  const match = /^H([1-6])$/.exec(role);
  return match ? Number(match[1]) : null;
}

function cleanMetadataValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean : null;
}

function readMarkInfo(value: unknown, key: "Marked" | "Suspects") {
  if (value instanceof Map) return Boolean(value.get(key));
  if (value && typeof value === "object") {
    return Boolean((value as Record<string, unknown>)[key]);
  }
  return false;
}

function isPlausibleLanguageTag(value: string) {
  try {
    const locale = new Intl.Locale(value);
    return Boolean(locale.language && /^[A-Za-z]{2,8}$/.test(locale.language));
  } catch {
    return false;
  }
}

function normalizeProfiles(profileIds: StandardProfileId[]) {
  const allowed = new Set<StandardProfileId>([
    "wcag21",
    "section508",
    "pdfua1",
    "en301549",
    "eaa-context",
  ]);
  const normalized = unique(profileIds.filter((id) => allowed.has(id)));
  return normalized.length > 0
    ? normalized
    : (["wcag21", "section508"] satisfies StandardProfileId[]);
}

function buildCoverage(
  findings: Finding[],
  signals: {
    titlePresent: boolean;
    languagePresent: boolean;
    tagged: boolean;
    totalLinks: number;
    totalImages: number;
    totalTables: number;
    totalWidgets: number;
  },
): CoverageItem[] {
  const issueCategories = new Set(
    findings
      .filter((finding) => finding.outcome === "failure" || finding.detection === "heuristic")
      .map((finding) => finding.category),
  );
  const state = (
    category: FindingCategory,
    signalPresent: boolean,
  ): CoverageItem["state"] =>
    issueCategories.has(category)
      ? "issue-found"
      : signalPresent
        ? "signal-present"
        : "manual";

  return [
    {
      id: "ocr",
      label: "Searchable text / OCR risk",
      state: state("ocr", true),
      note: issueCategories.has("ocr")
        ? "One or more image-dominant pages need review."
        : "No machine-detectable image-only page signal found.",
    },
    {
      id: "metadata",
      label: "Title and document language",
      state: state("metadata", signals.titlePresent && signals.languagePresent),
      note: issueCategories.has("metadata")
        ? "A metadata signal is missing or invalid."
        : "Required metadata signals were present; semantic accuracy still needs review.",
    },
    {
      id: "structure",
      label: "Tagged structure",
      state: state("structure", signals.tagged),
      note: signals.tagged
        ? "Structure signals were exposed; presence does not establish semantic correctness."
        : "No usable structure signal was exposed.",
    },
    {
      id: "headings",
      label: "Heading hierarchy",
      state: state("headings", signals.tagged),
      note: issueCategories.has("headings")
        ? "A heading hierarchy signal needs action."
        : "No machine-detectable heading-level break found; meaning still needs review.",
    },
    {
      id: "lists",
      label: "List structure",
      state: state("lists", signals.tagged),
      note: issueCategories.has("lists")
        ? "A list structure or visual-list signal needs review."
        : "No machine-detectable list structure issue found.",
    },
    {
      id: "links",
      label: "Links",
      state: signals.totalLinks === 0 ? "manual" : state("links", true),
      note:
        signals.totalLinks === 0
          ? "No link annotations were exposed; visually styled links still require review."
          : "Annotations were inspected; purpose and behavior require human review.",
    },
    {
      id: "images",
      label: "Images and alternate descriptions",
      state:
        signals.totalImages === 0 ? "manual" : state("images", signals.totalImages > 0),
      note:
        signals.totalImages === 0
          ? "No image paint signal was exposed; decorative and vector content still require review."
          : "Image signals were inspected; description quality and intent require human review.",
    },
    {
      id: "reading-order",
      label: "Logical reading order",
      state: "manual",
      note: "Always requires tag-tree and assistive-technology verification.",
    },
    {
      id: "tables",
      label: "Basic table structure",
      state: signals.totalTables === 0 ? "manual" : state("tables", true),
      note: "Header relationships, spans, and meaning require human review.",
    },
    {
      id: "forms",
      label: "Form-field naming signals",
      state: signals.totalWidgets === 0 ? "manual" : state("forms", true),
      note: "Field behavior, instructions, errors, and focus order require specialist review.",
    },
    {
      id: "coverage",
      label: "Visual, formula, and complex-interaction coverage",
      state: "not-evaluated",
      note: "Explicitly outside this MVP ruleset.",
    },
  ];
}

function sortFindings(findings: Finding[]) {
  const severityRank: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return findings.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      (a.page ?? Number.MAX_SAFE_INTEGER) - (b.page ?? Number.MAX_SAFE_INTEGER) ||
      a.title.localeCompare(b.title),
  );
}

export async function fingerprintBytes(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function assertNotCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new PdfAnalysisError("Analysis was cancelled. No file data was retained.", "cancelled");
  }
}

async function yieldToBrowser() {
  if (typeof window === "undefined") return;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}
