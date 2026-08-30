import type {
  PdfSafetyInspection,
  PdfSafetyProbeState,
} from "./types";

export type PdfProbe<T> =
  | { state: "known"; value: T }
  | { state: "unknown"; reason: string };

/** @internal Production probe wrapper that deliberately discards parser details. */
export async function runPdfProbe<T>(
  label: string,
  read: () => Promise<T>,
): Promise<PdfProbe<T>> {
  try {
    return { state: "known", value: await read() };
  } catch {
    return { state: "unknown", reason: `${label} inspection failed` };
  }
}

export function featureProbeState<T>(
  probe: PdfProbe<T>,
  isPresent: (value: T) => boolean,
): PdfSafetyProbeState {
  if (probe.state === "unknown") return "unknown";
  return isPresent(probe.value) ? "present" : "absent";
}

export function mergeFeatureProbeState(
  current: PdfSafetyProbeState,
  next: PdfSafetyProbeState,
): PdfSafetyProbeState {
  if (current === "unknown" || next === "unknown") return "unknown";
  if (current === "present" || next === "present") return "present";
  return "absent";
}

export interface RestrictedMetadataEligibilityInput {
  textBased: boolean;
  encrypted: boolean;
  hasXfa: boolean;
  annotationCount: number;
  imageCount: number;
  linkCount: number;
  tableCount: number;
  safetyInspection: PdfSafetyInspection;
}

export function restrictedMetadataEligibility(
  input: RestrictedMetadataEligibilityInput,
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.textBased) reasons.push("The PDF is not text based.");
  if (input.encrypted) reasons.push("Encryption was detected.");
  if (input.hasXfa) reasons.push("XFA was detected.");
  if (input.annotationCount > 0) reasons.push("Annotations were detected.");
  if (input.imageCount > 0) reasons.push("Image content was detected.");
  if (input.linkCount > 0) reasons.push("Links were detected.");
  if (input.tableCount > 0) reasons.push("Table structure was detected.");

  for (const [name, state] of Object.entries(input.safetyInspection) as Array<
    [keyof PdfSafetyInspection, PdfSafetyProbeState]
  >) {
    if (state === "unknown") reasons.push(`${name} inspection was inconclusive.`);
    if (name !== "metadata" && state === "present") {
      reasons.push(`${name} content was detected.`);
    }
  }
  return { allowed: reasons.length === 0, reasons };
}
