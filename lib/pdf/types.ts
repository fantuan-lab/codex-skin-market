export type Severity = "critical" | "high" | "medium" | "low";

export type DetectionKind =
  | "machine"
  | "heuristic"
  | "manual"
  | "not-evaluated";

export type FindingOutcome = "failure" | "review" | "not-evaluated";

export type FindingStatus =
  | "open"
  | "confirmed"
  | "dismissed"
  | "escalated"
  | "fixed";

export type StandardProfileId =
  | "wcag21"
  | "section508"
  | "pdfua1"
  | "en301549"
  | "eaa-context";

export type FindingCategory =
  | "input"
  | "ocr"
  | "metadata"
  | "structure"
  | "headings"
  | "lists"
  | "links"
  | "images"
  | "reading-order"
  | "tables"
  | "forms"
  | "text-encoding"
  | "coverage";

export interface StandardReference {
  profile: StandardProfileId;
  label: string;
}

export interface FindingHistoryEntry {
  at: string;
  from: FindingStatus | null;
  to: FindingStatus;
  note: string;
  actor: "analyzer" | "reviewer";
}

export interface Finding {
  id: string;
  ruleId: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  detection: DetectionKind;
  outcome: FindingOutcome;
  status: FindingStatus;
  page: number | null;
  location: string;
  evidence: string;
  metrics: Record<string, string | number | boolean | null>;
  method: string;
  guidance: string[];
  standardReferences: StandardReference[];
  safeFix?: "document-title" | "document-language";
  before?: string;
  after?: string;
  history: FindingHistoryEntry[];
}

export type CoverageState =
  | "issue-found"
  | "signal-present"
  | "manual"
  | "not-evaluated";

export type PdfSafetyProbeState = "present" | "absent" | "unknown";

export interface PdfSafetyInspection {
  metadata: PdfSafetyProbeState;
  markInfo: PdfSafetyProbeState;
  fieldObjects: PdfSafetyProbeState;
  signatures: PdfSafetyProbeState;
  javaScriptActions: PdfSafetyProbeState;
  structureTrees: PdfSafetyProbeState;
}

export interface CoverageItem {
  id: FindingCategory;
  label: string;
  state: CoverageState;
  note: string;
}

export interface PdfMetadataSummary {
  title: string | null;
  language: string | null;
  pdfVersion: string | null;
  tagged: boolean;
  markInfoMarked: boolean;
  markInfoSuspects: boolean;
  encrypted: boolean;
  hasAcroForm: boolean;
  hasSignatures: boolean;
  hasXfa: boolean;
  hasJavaScript: boolean;
  safetyInspection: PdfSafetyInspection;
}

export interface PageSignalSummary {
  page: number;
  textCharacters: number;
  textItems: number;
  imagePaintOperations: number;
  annotationCount: number;
  linkAnnotations: number;
  widgetAnnotations: number;
  structureRoles: string[];
  headingRoles: string[];
  figureCount: number;
  figuresWithAlt: number;
  tableCount: number;
  tableHeaderCount: number;
  visualListCandidates: number;
  visualTableRows: number;
  readingOrderRiskScore: number;
}

export interface PdfVersionRecord {
  version: number;
  label: string;
  fingerprint: string;
  createdAt: string;
  changes: string[];
}

export interface PdfAnalysis {
  tool: "ClearTag browser analyzer";
  toolVersion: string;
  rulesetVersion: string;
  analyzedAt: string;
  fileName: string;
  fileSize: number;
  fingerprint: string;
  pageCount: number;
  textBased: boolean;
  profileIds: StandardProfileId[];
  metadata: PdfMetadataSummary;
  pages: PageSignalSummary[];
  findings: Finding[];
  coverage: CoverageItem[];
  versions: PdfVersionRecord[];
  limits: string[];
}

export interface AnalysisProgress {
  completedPages: number;
  totalPages: number;
  message: string;
}

export interface AnalyzeOptions {
  fileName: string;
  profileIds: StandardProfileId[];
  signal?: AbortSignal;
  onProgress?: (progress: AnalysisProgress) => void;
}

export interface StandardProfile {
  id: StandardProfileId;
  shortName: string;
  name: string;
  description: string;
  scopeNote: string;
}
