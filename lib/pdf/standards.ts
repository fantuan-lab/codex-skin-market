import type {
  StandardProfile,
  StandardProfileId,
  StandardReference,
} from "./types";

export const STANDARD_PROFILES: StandardProfile[] = [
  {
    id: "wcag21",
    shortName: "WCAG 2.1 AA",
    name: "WCAG 2.1 AA — document interpretation",
    description:
      "Maps findings to relevant WCAG 2.1 A/AA success criteria and informative W3C PDF techniques.",
    scopeNote:
      "A partial automated mapping is not a WCAG conformance determination.",
  },
  {
    id: "section508",
    shortName: "Section 508",
    name: "Revised Section 508 — electronic documents",
    description:
      "Maps covered document findings to E205 and applicable WCAG 2.0 A/AA criteria.",
    scopeNote:
      "The contract, agency method, and acceptance process determine required evidence.",
  },
  {
    id: "pdfua1",
    shortName: "PDF/UA-1",
    name: "PDF/UA-1 preflight — ISO 14289-1:2014",
    description:
      "Checks selected machine-verifiable structure and syntax signals for PDF 1.x files.",
    scopeNote:
      "Semantic correctness and full PDF/UA validation require specialist tools and human review.",
  },
  {
    id: "en301549",
    shortName: "EN 301 549 / WAD",
    name: "EN 301 549 v3.2.1 / WAD context",
    description:
      "Maps downloadable-document findings to relevant clause 10 requirements.",
    scopeNote:
      "WCAG-only coverage is not equivalent to WAD conformity.",
  },
  {
    id: "eaa-context",
    shortName: "EAA context",
    name: "EAA context — informational",
    description:
      "Adds scope notes for selected consumer products and services covered by the EAA.",
    scopeNote:
      "The EAA does not cover every PDF. Confirm sector scope, national law, and current harmonised standards.",
  },
];

const mapping: Record<string, Partial<Record<StandardProfileId, string[]>>> = {
  ocr: {
    wcag21: ["WCAG 1.1.1", "WCAG 1.4.5", "PDF7"],
    section508: ["E205", "WCAG 2.0 1.1.1", "WCAG 2.0 1.4.5"],
    pdfua1: ["ISO 14289-1:2014 — content representation"],
    en301549: ["EN 301 549 10.1.1.1", "10.1.4.5"],
  },
  title: {
    wcag21: ["WCAG 2.4.2", "PDF18"],
    section508: ["E205", "WCAG 2.0 2.4.2"],
    pdfua1: ["ISO 14289-1:2014 — document metadata"],
    en301549: ["EN 301 549 10.2.4.2"],
  },
  language: {
    wcag21: ["WCAG 3.1.1", "WCAG 3.1.2", "PDF16", "PDF19"],
    section508: ["E205", "WCAG 2.0 3.1.1", "WCAG 2.0 3.1.2"],
    pdfua1: ["ISO 14289-1:2014 — natural language"],
    en301549: ["EN 301 549 10.3.1.1", "10.3.1.2"],
  },
  structure: {
    wcag21: ["WCAG 1.3.1"],
    section508: ["E205", "WCAG 2.0 1.3.1"],
    pdfua1: ["ISO 14289-1:2014 — logical structure"],
    en301549: ["EN 301 549 10.1.3.1"],
  },
  headings: {
    wcag21: ["WCAG 1.3.1", "WCAG 2.4.6", "PDF9"],
    section508: ["E205", "WCAG 2.0 1.3.1", "WCAG 2.0 2.4.6"],
    pdfua1: ["ISO 14289-1:2014 — heading structure"],
    en301549: ["EN 301 549 10.1.3.1", "10.2.4.6"],
  },
  lists: {
    wcag21: ["WCAG 1.3.1", "PDF21"],
    section508: ["E205", "WCAG 2.0 1.3.1"],
    pdfua1: ["ISO 14289-1:2014 — list structure"],
    en301549: ["EN 301 549 10.1.3.1"],
  },
  links: {
    wcag21: ["WCAG 2.4.4", "PDF11", "PDF13"],
    section508: ["E205", "WCAG 2.0 2.4.4"],
    pdfua1: ["ISO 14289-1:2014 — link annotations"],
    en301549: ["EN 301 549 10.2.4.4"],
  },
  images: {
    wcag21: ["WCAG 1.1.1", "PDF1", "PDF4"],
    section508: ["E205", "WCAG 2.0 1.1.1"],
    pdfua1: ["ISO 14289-1:2014 — Figure alternate description"],
    en301549: ["EN 301 549 10.1.1.1"],
  },
  "reading-order": {
    wcag21: ["WCAG 1.3.2", "PDF3"],
    section508: ["E205", "WCAG 2.0 1.3.2"],
    pdfua1: ["ISO 14289-1:2014 — content order"],
    en301549: ["EN 301 549 10.1.3.2"],
  },
  tables: {
    wcag21: ["WCAG 1.3.1", "PDF6", "PDF20"],
    section508: ["E205", "WCAG 2.0 1.3.1"],
    pdfua1: ["ISO 14289-1:2014 — table structure"],
    en301549: ["EN 301 549 10.1.3.1"],
  },
  forms: {
    wcag21: ["WCAG 1.3.1", "WCAG 3.3.2", "WCAG 4.1.2", "PDF10", "PDF12", "PDF23"],
    section508: ["E205", "WCAG 2.0 1.3.1", "WCAG 2.0 3.3.2", "WCAG 2.0 4.1.2"],
    pdfua1: ["ISO 14289-1:2014 — form annotations"],
    en301549: ["EN 301 549 10.3.3.2", "10.4.1.2"],
  },
};

export function referencesFor(
  ruleGroup: keyof typeof mapping,
  profileIds: StandardProfileId[],
): StandardReference[] {
  return profileIds.flatMap((profile) =>
    (mapping[ruleGroup]?.[profile] ?? []).map((label) => ({ profile, label })),
  );
}

export function profileById(id: StandardProfileId) {
  return STANDARD_PROFILES.find((profile) => profile.id === id);
}
