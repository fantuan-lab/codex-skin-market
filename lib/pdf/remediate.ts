import type {
  PDFDict,
  PDFDocument as PdfLibDocument,
  PDFObject,
  PDFStream,
} from "pdf-lib";
import { fingerprintBytes } from "./analyze";
import type { PdfAnalysis } from "./types";

type PdfLibModule = typeof import("pdf-lib");

export interface MetadataFixes {
  title?: string;
  language?: string;
}

export interface MetadataRevision {
  bytes: Uint8Array;
  changes: string[];
}

const REJECTED_KEYS = new Map<string, string>([
  ["StructTreeRoot", "a structure tree"],
  ["StructParents", "tagged-content parent references"],
  ["StructParent", "tagged-content parent references"],
  ["ParentTree", "a tagged-content parent tree"],
  ["RoleMap", "a tagged-content role map"],
  ["ClassMap", "a tagged-content class map"],
  ["MarkInfo", "MarkInfo"],
  ["AcroForm", "an AcroForm"],
  ["XFA", "XFA content"],
  ["SigFlags", "signature flags"],
  ["Perms", "document permissions"],
  ["DocMDP", "DocMDP permissions"],
  ["UR3", "usage-rights permissions"],
  ["OpenAction", "an OpenAction"],
  ["AA", "additional actions"],
  ["A", "an action dictionary"],
  ["Names", "a name tree"],
  ["JavaScript", "JavaScript"],
  ["JS", "JavaScript"],
  ["EmbeddedFiles", "embedded files"],
  ["EF", "an embedded-file reference"],
  ["AF", "an associated-file reference"],
  ["AFRelationship", "an associated-file relationship"],
  ["Collection", "a PDF collection"],
  ["Outlines", "document outlines"],
  ["Metadata", "an XMP metadata stream"],
  ["OCProperties", "optional-content properties"],
  ["PageLabels", "custom page labels"],
  ["RichMediaContent", "rich-media content"],
  ["RichMediaSettings", "rich-media settings"],
  ["3DD", "3D content"],
]);

const REJECTED_TYPES = new Map<string, string>([
  ["Sig", "a signature dictionary"],
  ["Annot", "an annotation dictionary"],
  ["Filespec", "a file specification"],
  ["EmbeddedFile", "an embedded file"],
  ["Collection", "a PDF collection"],
  ["Outlines", "document outlines"],
  ["Action", "an action dictionary"],
  ["XObject", "an XObject"],
  ["ObjStm", "an object stream"],
  ["XRef", "an XRef stream"],
]);

const REJECTED_SUBTYPES = new Map<string, string>([
  ["Image", "an image XObject"],
  ["Form", "a Form XObject"],
  ["Text", "a text annotation"],
  ["Link", "a link annotation"],
  ["FreeText", "a free-text annotation"],
  ["Line", "a line annotation"],
  ["Square", "a square annotation"],
  ["Circle", "a circle annotation"],
  ["Polygon", "a polygon annotation"],
  ["PolyLine", "a polyline annotation"],
  ["Highlight", "a highlight annotation"],
  ["Underline", "an underline annotation"],
  ["Squiggly", "a squiggly annotation"],
  ["StrikeOut", "a strikeout annotation"],
  ["Stamp", "a stamp annotation"],
  ["Caret", "a caret annotation"],
  ["Ink", "an ink annotation"],
  ["Popup", "a popup annotation"],
  ["FileAttachment", "a file-attachment annotation"],
  ["Sound", "a sound annotation"],
  ["Movie", "a movie annotation"],
  ["Widget", "a widget annotation"],
  ["Screen", "a screen annotation"],
  ["3D", "a 3D annotation"],
  ["Redact", "a redaction annotation"],
  ["RichMedia", "a rich-media annotation"],
]);

const REJECTED_ACTIONS = new Set([
  "GoTo",
  "GoToR",
  "GoToE",
  "Launch",
  "Thread",
  "URI",
  "Sound",
  "Movie",
  "Hide",
  "Named",
  "SubmitForm",
  "ResetForm",
  "ImportData",
  "JavaScript",
  "SetOCGState",
  "Rendition",
  "Trans",
  "GoTo3DView",
]);

const MAX_PREFLIGHT_OBJECTS = 50_000;
const MAX_PREFLIGHT_DEPTH = 100;
const MAX_DECODED_STREAM_BYTES = 100 * 1024 * 1024;

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

  const title = fixes.title?.trim();
  const language = fixes.language?.trim();
  if (!title && !language) throw new Error("Enter at least one metadata change.");
  if (title && title.length > 300) {
    throw new Error("Keep the document title at 300 characters or fewer.");
  }
  if (language && !isPlausibleLanguageTag(language)) {
    throw new Error("Enter a valid BCP 47 language tag, such as en-US.");
  }

  const pdfLib = await import("pdf-lib");
  const originalBytes = input.slice();
  const source = await strictLoad(originalBytes.slice(), pdfLib, "input");
  assertRestrictedMetadataPreflight(source, pdfLib);
  await assertNoRestrictedPageOperators(originalBytes.slice());
  const before = protectedDocumentSnapshot(source, pdfLib);
  const changes: string[] = [];

  if (title) {
    // showInWindowTitleBar would also create or alter ViewerPreferences.
    source.setTitle(title);
    changes.push("Set document Title in the document information dictionary");
  }
  if (language) {
    source.setLanguage(language);
    changes.push(`Set document catalog language to ${language}`);
  }
  source.setModificationDate(new Date());
  changes.push("Updated the document modification date for the new revision");

  const bytes = await source.save({
    addDefaultPage: false,
    updateFieldAppearances: false,
    useObjectStreams: false,
  });
  if (!equalBytes(input, originalBytes)) {
    throw new Error("The source byte array changed during revision creation, so the output was discarded.");
  }

  const reopened = await strictLoad(bytes.slice(), pdfLib, "output");
  await assertNoRestrictedPageOperators(bytes.slice());
  assertRestrictedMetadataPreflight(reopened, pdfLib);
  const after = protectedDocumentSnapshot(reopened, pdfLib);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(
      "The restricted metadata revision changed a protected document object, so the output was discarded.",
    );
  }

  if (title && reopened.getTitle()?.trim() !== title) {
    throw new Error("The saved document title did not verify after writeback.");
  }
  if (language && readCatalogText(reopened, pdfLib, "Lang") !== language) {
    throw new Error("The saved document language did not verify after writeback.");
  }

  return { bytes, changes };
}

async function strictLoad(
  bytes: Uint8Array,
  pdfLib: PdfLibModule,
  label: "input" | "output",
) {
  try {
    return await pdfLib.PDFDocument.load(bytes, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
      updateMetadata: false,
    });
  } catch {
    throw new Error(
      `The ${label} PDF failed strict parsing or may be encrypted. Restricted metadata revision was refused.`,
    );
  }
}

function assertRestrictedMetadataPreflight(
  document: PdfLibDocument,
  pdfLib: PdfLibModule,
) {
  try {
    performRestrictedMetadataPreflight(document, pdfLib);
  } catch (error) {
    if (error instanceof UnsafePdfFeatureError) throw error;
    throw new Error(
      "The PDF failed strict parsing during structural preflight. Restricted metadata revision was refused.",
    );
  }
}

function performRestrictedMetadataPreflight(
  document: PdfLibDocument,
  pdfLib: PdfLibModule,
) {
  if (document.isEncrypted || document.context.trailerInfo.Encrypt) {
    throwUnsafe("encryption");
  }
  if (document.getPageCount() < 1) {
    throw new Error("Restricted metadata revision requires at least one valid page.");
  }

  const state = {
    objectCount: 0,
    decodedBytes: 0,
    seen: new WeakSet<object>(),
  };
  // Inspect the catalog first so the user sees the highest-level blocking feature.
  validateObject(document.catalog, document, pdfLib, state, 0);
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    validateObject(object, document, pdfLib, state, 0);
  }

  for (const page of document.getPages()) {
    const annotations = lookupEntry(page.node, "Annots", document, pdfLib);
    if (annotations) {
      if (!(annotations instanceof pdfLib.PDFArray)) {
        throw new Error("An annotation entry could not be proven to be a valid array.");
      }
      if (annotations.size() > 0) throwUnsafe("annotations");
    }
  }
}

async function assertNoRestrictedPageOperators(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    useWorkerFetch: false,
    verbosity: 0,
  });
  try {
    const document = await loadingTask.promise;
    const restricted = new Set([
      pdfjs.OPS.beginInlineImage,
      pdfjs.OPS.beginImageData,
      pdfjs.OPS.endInlineImage,
      pdfjs.OPS.paintXObject,
      pdfjs.OPS.paintFormXObjectBegin,
      pdfjs.OPS.paintFormXObjectEnd,
      pdfjs.OPS.paintImageMaskXObject,
      pdfjs.OPS.paintImageMaskXObjectGroup,
      pdfjs.OPS.paintImageXObject,
      pdfjs.OPS.paintInlineImageXObject,
      pdfjs.OPS.paintInlineImageXObjectGroup,
      pdfjs.OPS.paintImageXObjectRepeat,
      pdfjs.OPS.paintImageMaskXObjectRepeat,
      pdfjs.OPS.paintSolidColorImageMask,
    ]);
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const operators = await page.getOperatorList();
      page.cleanup();
      if (operators.fnArray.some((operator) => restricted.has(operator))) {
        throwUnsafe("image or Form XObject page operators");
      }
    }
  } catch (error) {
    if (error instanceof UnsafePdfFeatureError) throw error;
    throw new Error(
      "The PDF page operators could not be conclusively inspected. Restricted metadata revision was refused.",
    );
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

function validateObject(
  object: PDFObject,
  document: PdfLibDocument,
  pdfLib: PdfLibModule,
  state: { objectCount: number; decodedBytes: number; seen: WeakSet<object> },
  depth: number,
) {
  if (depth > MAX_PREFLIGHT_DEPTH) {
    throw new Error("The PDF object graph exceeded the strict preflight depth budget.");
  }
  if (object instanceof pdfLib.PDFRef) {
    const resolved = document.context.lookup(object);
    if (!resolved) throw new Error(`The PDF contains an unresolved object reference (${object}).`);
    return;
  }
  if (state.seen.has(object)) return;
  state.seen.add(object);
  state.objectCount += 1;
  if (state.objectCount > MAX_PREFLIGHT_OBJECTS) {
    throw new Error("The PDF object graph exceeded the strict preflight object budget.");
  }
  if (object instanceof pdfLib.PDFInvalidObject) {
    throw new Error("The PDF contains an invalid object that cannot be safely rewritten.");
  }
  if (object instanceof pdfLib.PDFStream) {
    inspectDictionary(object.dict, document, pdfLib);
    validateObject(object.dict, document, pdfLib, state, depth + 1);
    if (object instanceof pdfLib.PDFRawStream) {
      const decoded = decodeStream(object, pdfLib);
      state.decodedBytes += decoded.byteLength;
      if (state.decodedBytes > MAX_DECODED_STREAM_BYTES) {
        throw new Error("Decoded PDF streams exceeded the strict preflight safety budget.");
      }
    }
    return;
  }
  if (object instanceof pdfLib.PDFDict) {
    inspectDictionary(object, document, pdfLib);
    for (const value of object.values()) {
      validateObject(value, document, pdfLib, state, depth + 1);
    }
    return;
  }
  if (object instanceof pdfLib.PDFArray) {
    for (let index = 0; index < object.size(); index += 1) {
      validateObject(object.get(index), document, pdfLib, state, depth + 1);
    }
    return;
  }
  if (
    object instanceof pdfLib.PDFName ||
    object instanceof pdfLib.PDFNumber ||
    object instanceof pdfLib.PDFBool ||
    object instanceof pdfLib.PDFString ||
    object instanceof pdfLib.PDFHexString ||
    object === pdfLib.PDFNull
  ) {
    return;
  }
  throw new Error(
    `The PDF contains an unsupported ${object.constructor.name || "object"}; strict preflight refused the rewrite.`,
  );
}

function inspectDictionary(
  dictionary: PDFDict,
  document: PdfLibDocument,
  pdfLib: PdfLibModule,
) {
  for (const [key, label] of REJECTED_KEYS) {
    if (dictionary.has(pdfLib.PDFName.of(key))) throwUnsafe(label);
  }
  const type = readName(dictionary, "Type", document, pdfLib);
  const subtype = readName(dictionary, "Subtype", document, pdfLib);
  const fieldType = readName(dictionary, "FT", document, pdfLib);
  const action = readName(dictionary, "S", document, pdfLib);
  if (type && REJECTED_TYPES.has(type)) throwUnsafe(REJECTED_TYPES.get(type)!);
  if (subtype && REJECTED_SUBTYPES.has(subtype)) {
    throwUnsafe(REJECTED_SUBTYPES.get(subtype)!);
  }
  if (fieldType === "Sig") throwUnsafe("a signature field");
  if (action && REJECTED_ACTIONS.has(action)) throwUnsafe(`a ${action} action`);
  if (dictionary.has(pdfLib.PDFName.of("ByteRange"))) throwUnsafe("a signature byte range");

  const annotations = lookupEntry(dictionary, "Annots", document, pdfLib);
  if (annotations) {
    if (!(annotations instanceof pdfLib.PDFArray)) {
      throw new Error("An annotation entry could not be proven to be a valid array.");
    }
    if (annotations.size() > 0) throwUnsafe("annotations");
  }
  const xObjects = lookupEntry(dictionary, "XObject", document, pdfLib);
  if (xObjects) {
    if (!(xObjects instanceof pdfLib.PDFDict)) {
      throw new Error("An XObject resource entry could not be proven to be a valid dictionary.");
    }
    if (xObjects.keys().length > 0) throwUnsafe("XObject resources");
  }
}

function readName(
  dictionary: PDFDict,
  key: string,
  document: PdfLibDocument,
  pdfLib: PdfLibModule,
) {
  const value = lookupEntry(dictionary, key, document, pdfLib);
  if (!value) return null;
  if (!(value instanceof pdfLib.PDFName)) {
    throw new Error(`The /${key} entry was malformed or could not be safely interpreted.`);
  }
  return value.decodeText();
}

function lookupEntry(
  dictionary: PDFDict,
  key: string,
  document: PdfLibDocument,
  pdfLib: PdfLibModule,
) {
  const raw = dictionary.get(pdfLib.PDFName.of(key), true);
  if (!raw) return undefined;
  const resolved = document.context.lookup(raw);
  if (!resolved) throw new Error(`The /${key} entry contains an unresolved reference.`);
  return resolved;
}

function decodeStream(stream: PDFStream, pdfLib: PdfLibModule) {
  try {
    if (stream instanceof pdfLib.PDFRawStream) {
      return pdfLib.decodePDFRawStream(stream).decode();
    }
    return stream.getContents();
  } catch {
    throw new Error("A PDF stream could not be decoded during strict preflight.");
  }
}

function protectedDocumentSnapshot(
  document: PdfLibDocument,
  pdfLib: PdfLibModule,
) {
  const infoObject = document.context.lookup(document.context.trailerInfo.Info);
  const objects = document.context.enumerateIndirectObjects()
    .filter(([, object]) => object !== infoObject)
    .map(([reference, object]) => [
      reference.toString(),
      object === document.catalog
        ? canonicalObject(object, pdfLib, new Set(["Lang"]))
        : canonicalObject(object, pdfLib),
    ])
    .sort(([left], [right]) => String(left).localeCompare(String(right)));
  return {
    header: document.context.header.toString(),
    trailer: {
      root: document.context.trailerInfo.Root?.toString() ?? null,
      id: document.context.trailerInfo.ID?.toString() ?? null,
      encrypt: document.context.trailerInfo.Encrypt?.toString() ?? null,
    },
    info: infoObject instanceof pdfLib.PDFDict
      ? canonicalObject(infoObject, pdfLib, new Set(["Title", "ModDate"]))
      : [],
    pages: document.getPages().map((page) => ({
      reference: page.ref.toString(),
      mediaBox: page.getMediaBox(),
      cropBox: page.getCropBox(),
      bleedBox: page.getBleedBox(),
      trimBox: page.getTrimBox(),
      artBox: page.getArtBox(),
      rotation: page.getRotation().angle,
    })),
    objects,
  };
}

function canonicalObject(
  object: PDFObject,
  pdfLib: PdfLibModule,
  excludedKeys = new Set<string>(),
  seen = new WeakSet<object>(),
): unknown {
  if (object instanceof pdfLib.PDFRef) return object.toString();
  if (seen.has(object)) return "[direct-cycle]";
  seen.add(object);
  if (object instanceof pdfLib.PDFStream) {
    return {
      dictionary: canonicalObject(object.dict, pdfLib, excludedKeys, seen),
      contents: byteDigest(object.getContents()),
    };
  }
  if (object instanceof pdfLib.PDFDict) {
    return object.entries()
      .filter(([key]) => !excludedKeys.has(key.decodeText()))
      .map(([key, value]) => [
        key.decodeText(),
        canonicalObject(value, pdfLib, new Set(), seen),
      ])
      .sort(([left], [right]) => String(left).localeCompare(String(right)));
  }
  if (object instanceof pdfLib.PDFArray) {
    return object.asArray().map((value) => canonicalObject(value, pdfLib, new Set(), seen));
  }
  return object.toString();
}

function byteDigest(bytes: Uint8Array) {
  let first = 2166136261;
  let second = 0;
  for (const byte of bytes) {
    first = Math.imul(first ^ byte, 16777619) >>> 0;
    second = (Math.imul(second, 33) + byte) >>> 0;
  }
  return `${bytes.byteLength}:${first.toString(16)}:${second.toString(16)}`;
}

function readCatalogText(
  document: PdfLibDocument,
  pdfLib: PdfLibModule,
  key: string,
) {
  const value = document.catalog.lookup(pdfLib.PDFName.of(key)) as
    | { decodeText?: () => string }
    | undefined;
  return typeof value?.decodeText === "function" ? value.decodeText().trim() : null;
}

function throwUnsafe(feature: string): never {
  throw new UnsafePdfFeatureError(
    `Restricted metadata revision is unavailable because strict preflight detected ${feature}. Preserve the original and escalate this PDF to a specialist.`,
  );
}

class UnsafePdfFeatureError extends Error {}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function isPlausibleLanguageTag(value: string) {
  try {
    const locale = new Intl.Locale(value);
    return Boolean(locale.language && /^[A-Za-z]{2,8}$/.test(locale.language));
  } catch {
    return false;
  }
}
