"use client";

import {
  ArrowDown,
  ArrowSquareOut,
  Check,
  DownloadSimple,
  FilePdf,
  Flag,
  Info,
  ShieldWarning,
  X,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { analyzePdf } from "@/lib/pdf/analyze";
import { createMetadataRevision } from "@/lib/pdf/remediate";
import { buildEvidencePack } from "@/lib/pdf/report";
import { profileById } from "@/lib/pdf/standards";
import type {
  Finding,
  FindingCategory,
  FindingStatus,
  PdfAnalysis,
  Severity,
} from "@/lib/pdf/types";

interface Props {
  initialAnalysis: PdfAnalysis;
  initialBytes: Uint8Array;
  onReset: () => void;
}

const statusOptions: Array<{ value: FindingStatus; label: string }> = [
  { value: "confirmed", label: "Confirm finding" },
  { value: "dismissed", label: "Dismiss with rationale" },
  { value: "escalated", label: "Escalate to specialist" },
];

export function AnalysisWorkspace({ initialAnalysis, initialBytes, onReset }: Props) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [currentBytes, setCurrentBytes] = useState(initialBytes);
  const [selectedId, setSelectedId] = useState(initialAnalysis.findings[0]?.id ?? "");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | "all">("all");
  const [reviewNote, setReviewNote] = useState("");
  const [fixValue, setFixValue] = useState("");
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isBusy = busyMessage !== null;

  const filtered = useMemo(
    () =>
      analysis.findings.filter(
        (finding) =>
          (severityFilter === "all" || finding.severity === severityFilter) &&
          (statusFilter === "all" || finding.status === statusFilter) &&
          (categoryFilter === "all" || finding.category === categoryFilter),
      ),
    [analysis.findings, categoryFilter, severityFilter, statusFilter],
  );
  const selected =
    filtered.find((finding) => finding.id === selectedId) ?? filtered[0] ?? null;

  const summary = useMemo(
    () => ({
      machine: analysis.findings.filter(
        (finding) => finding.detection === "machine" && finding.status !== "fixed",
      ).length,
      review: analysis.findings.filter(
        (finding) =>
          ["heuristic", "manual"].includes(finding.detection) &&
          finding.status === "open",
      ).length,
      notEvaluated: analysis.findings.filter(
        (finding) => finding.detection === "not-evaluated",
      ).length,
      decided: analysis.findings.filter((finding) => finding.status !== "open").length,
    }),
    [analysis.findings],
  );

  const updateFindingStatus = (status: FindingStatus) => {
    if (!selected || !reviewNote.trim()) return;
    const at = new Date().toISOString();
    setAnalysis((current) => ({
      ...current,
      findings: current.findings.map((finding) =>
        finding.id === selected.id
          ? {
              ...finding,
              status,
              history: [
                ...finding.history,
                {
                  at,
                  from: finding.status,
                  to: status,
                  note: reviewNote.trim(),
                  actor: "reviewer" as const,
                },
              ],
            }
          : finding,
      ),
    }));
    setReviewNote("");
    setMessage(`Status recorded: ${statusLabel(status)}.`);
    window.setTimeout(() => {
      const nextTarget =
        document.getElementById("finding-detail-title") ??
        document.getElementById("finding-queue-title");
      nextTarget?.focus();
    }, 0);
  };

  const applySafeFix = async () => {
    if (!selected?.safeFix || !fixValue.trim()) return;
    setBusyMessage("Strictly preflighting and rechecking a restricted metadata revision");
    setError(null);
    setMessage(null);
    try {
      const fixes =
        selected.safeFix === "document-title"
          ? { title: fixValue.trim() }
          : { language: fixValue.trim() };
      const revision = await createMetadataRevision(currentBytes, analysis, fixes);
      const nextFileName = remediatedFileName(analysis.fileName, analysis.versions.length + 1);
      const rescanned = await analyzePdf(revision.bytes, {
        fileName: nextFileName,
        profileIds: analysis.profileIds,
      });
      verifyRestrictedRevisionParity(analysis, rescanned);
      verifyTargetFindingResolved(rescanned, selected);

      const merged = mergeRevision(analysis, rescanned, selected, fixValue.trim(), revision.changes);
      setCurrentBytes(revision.bytes);
      setAnalysis(merged);
      setSelectedId(selected.id);
      setFixValue("");
      downloadBlob(
        new Blob([revision.bytes.slice().buffer], { type: "application/pdf" }),
        nextFileName,
      );
      setMessage(
        `Version ${merged.versions.length} verified and downloaded. The original file was not overwritten.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The metadata revision failed.");
    } finally {
      setBusyMessage(null);
    }
  };

  const downloadReport = async () => {
    setBusyMessage("Building the local evidence pack");
    setError(null);
    try {
      const pack = await buildEvidencePack(analysis);
      downloadBlob(pack.blob, pack.fileName);
      setMessage("Evidence pack downloaded as accessible HTML, JSON, and README files.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The evidence pack failed.");
    } finally {
      setBusyMessage(null);
    }
  };

  const selectFinding = (findingId: string) => {
    setSelectedId(findingId);
    setReviewNote("");
    setFixValue("");
    setMessage(null);
    window.setTimeout(() => {
      document.getElementById("finding-detail-title")?.focus();
    }, 0);
  };

  return (
    <section
      className="workspace-section"
      aria-labelledby="analysis-workspace-title"
      aria-busy={isBusy}
    >
      <div className="workspace-topline">
        <div>
          <p className="section-label">Analysis workspace</p>
          <h2 id="analysis-workspace-title" tabIndex={-1}>
            {analysis.fileName}
          </h2>
          <p className="workspace-meta">
            {analysis.pageCount} pages · {formatBytes(analysis.fileSize)} · SHA-256{" "}
            <code>{analysis.fingerprint.slice(0, 16)}…</code>
          </p>
        </div>
        <div className="workspace-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={isBusy}
            onClick={onReset}
          >
            Review another file
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isBusy}
            onClick={() => void downloadReport()}
          >
            <DownloadSimple aria-hidden="true" /> Download evidence pack
          </button>
        </div>
      </div>

      {!analysis.textBased ? (
        <div className="workspace-alert" role="status">
          <ShieldWarning weight="fill" aria-hidden="true" />
          <div>
            <strong>Text-based remediation is out of scope for this version.</strong>
            <span>
              The analyzer recorded image-only signals and metadata evidence, but
              OCR and content verification must happen in an approved external
              workflow.
            </span>
          </div>
        </div>
      ) : null}

      <div className="workspace-summary" aria-label="Finding summary">
        <div><strong>{summary.machine}</strong><span>machine-detected failures</span></div>
        <div><strong>{summary.review}</strong><span>open review items</span></div>
        <div><strong>{summary.notEvaluated}</strong><span>not evaluated</span></div>
        <div><strong>{summary.decided}</strong><span>reviewer decisions</span></div>
      </div>

      <div className="mapping-summary" aria-label="Selected evidence mappings">
        <strong>Evidence mappings:</strong>
        {analysis.profileIds.map((id) => (
          <span key={id}>{profileById(id)?.shortName ?? id}</span>
        ))}
        <small>Mappings organize evidence; they are not conformance results.</small>
      </div>

      <div className="workspace-grid">
        <aside className="finding-queue" aria-labelledby="finding-queue-title">
          <div className="queue-heading">
            <div>
              <p className="section-label">Review queue</p>
              <h3 id="finding-queue-title" tabIndex={-1}>{filtered.length} findings</h3>
            </div>
            <ArrowDown aria-hidden="true" />
          </div>
          <div className="queue-filters">
            <label>
              Severity
              <select
                value={severityFilter}
                disabled={isBusy}
                onChange={(event) => setSeverityFilter(event.target.value as Severity | "all")}
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={statusFilter}
                disabled={isBusy}
                onChange={(event) =>
                  setStatusFilter(event.target.value as FindingStatus | "all")
                }
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="confirmed">Confirmed</option>
                <option value="dismissed">Dismissed</option>
                <option value="escalated">Escalated</option>
                <option value="fixed">Fixed</option>
              </select>
            </label>
            <label>
              Category
              <select
                value={categoryFilter}
                disabled={isBusy}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as FindingCategory | "all")
                }
              >
                <option value="all">All</option>
                {[...new Set(analysis.findings.map((finding) => finding.category))].map(
                  (category) => (
                    <option key={category} value={category}>
                      {categoryLabel(category)}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          {filtered.length ? (
            <ol className="finding-list">
              {filtered.map((finding) => (
                <li key={finding.id}>
                  <button
                    type="button"
                    className={finding.id === selected?.id ? "is-selected" : ""}
                    aria-current={finding.id === selected?.id ? "true" : undefined}
                    disabled={isBusy}
                    onClick={() => selectFinding(finding.id)}
                  >
                    <span className={`severity-dot severity-${finding.severity}`} aria-hidden="true" />
                    <span className="finding-list-copy">
                      <small>
                        {finding.page ? `Page ${finding.page}` : "Document-wide"} ·{" "}
                        {severityLabel(finding.severity)} · {detectionLabel(finding)}
                      </small>
                      <strong>{finding.title}</strong>
                      <span>{finding.evidence}</span>
                    </span>
                    <span className={`status-badge status-${finding.status}`}>
                      {statusLabel(finding.status)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-filter">No findings match these filters.</p>
          )}
        </aside>

        <article
          className="finding-detail"
          aria-labelledby={selected ? "finding-detail-title" : undefined}
        >
          {selected ? (
            <>
              <div className="detail-heading">
                <div>
                  <p className="section-label">{selected.ruleId}</p>
                  <h3 id="finding-detail-title" tabIndex={-1}>{selected.title}</h3>
                </div>
                <span className={`severity-badge severity-${selected.severity}`}>
                  {selected.severity}
                </span>
              </div>

              <div className="finding-badges">
                <span>{detectionLabel(selected)}</span>
                <span>{selected.page ? `Page ${selected.page}` : "Document-wide"}</span>
                <span>{statusLabel(selected.status)}</span>
              </div>

              <dl className="evidence-grid">
                <div><dt>Location</dt><dd>{selected.location}</dd></div>
                <div><dt>Evidence</dt><dd>{selected.evidence}</dd></div>
                <div><dt>Method</dt><dd>{selected.method}</dd></div>
              </dl>

              <section className="detail-section" aria-labelledby="mapping-title">
                <h4 id="mapping-title">Evidence mapping</h4>
                {selected.standardReferences.length ? (
                  <ul className="standard-chips">
                    {selected.standardReferences.map((reference, index) => (
                      <li key={`${reference.profile}-${reference.label}-${index}`}>
                        {reference.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="detail-note">
                    No normative result is assigned to this declared coverage limit.
                  </p>
                )}
              </section>

              <section className="detail-section" aria-labelledby="guidance-title">
                <h4 id="guidance-title">Guided next steps</h4>
                <ol className="guidance-list">
                  {selected.guidance.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </section>

              {selected.safeFix && selected.status !== "fixed" ? (
                <section className="safe-fix-panel" aria-labelledby="safe-fix-title">
                  <div>
                    <p className="section-label">Restricted writeback</p>
                    <h4 id="safe-fix-title">Create a restricted metadata revision</h4>
                    <p>
                      The original is never overwritten. ClearTag strictly preflights
                      the real input bytes, refuses rich or uncertain structures, writes
                      a separately serialized PDF, then reopens and rechecks it. Preserve
                      the original and review the output; this is not a guarantee that
                      only metadata bytes changed or that the PDF is undamaged.
                    </p>
                  </div>
                  <label>
                    {selected.safeFix === "document-title"
                      ? "Accurate document title"
                      : "Primary language tag"}
                    <input
                      type="text"
                      value={fixValue}
                      disabled={isBusy}
                      placeholder={
                        selected.safeFix === "document-title"
                          ? "Example: 2026–27 Financial Aid Guide"
                          : "Example: en-US"
                      }
                      onChange={(event) => setFixValue(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!fixValue.trim() || isBusy}
                    onClick={() => void applySafeFix()}
                  >
                    <FilePdf aria-hidden="true" /> Create and recheck version
                  </button>
                </section>
              ) : null}

              <section className="review-panel" aria-labelledby="review-title">
                <div>
                  <p className="section-label">Human decision</p>
                  <h4 id="review-title">Record reviewer status</h4>
                </div>
                <label>
                  Reviewer rationale <span>(required)</span>
                  <textarea
                    value={reviewNote}
                    required
                    disabled={isBusy}
                    aria-describedby="review-rationale-help"
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Record what was checked, the decision, and any follow-up. Do not paste sensitive PDF content."
                    rows={3}
                  />
                </label>
                <small id="review-rationale-help" className="review-help">
                  Record what was checked before a status action becomes available.
                </small>
                <div className="review-actions">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!reviewNote.trim() || isBusy}
                      onClick={() => updateFindingStatus(option.value)}
                    >
                      {option.value === "confirmed" ? <Check aria-hidden="true" /> : null}
                      {option.value === "dismissed" ? <X aria-hidden="true" /> : null}
                      {option.value === "escalated" ? <Flag aria-hidden="true" /> : null}
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <details className="history-panel">
                <summary>Status and version history ({selected.history.length})</summary>
                <ol>
                  {selected.history.map((entry, index) => (
                    <li key={`${entry.at}-${index}`}>
                      <strong>{statusLabel(entry.to)}</strong>
                      <span>{formatDate(entry.at)} · {entry.actor}</span>
                      <p>{entry.note}</p>
                    </li>
                  ))}
                </ol>
              </details>
            </>
          ) : (
            <p>Select a finding to review its evidence.</p>
          )}
        </article>
      </div>

      <div className="coverage-register">
        <div className="coverage-heading">
          <div>
            <p className="section-label">Coverage register</p>
            <h3>What was checked—and what was not</h3>
          </div>
          <Info aria-hidden="true" />
        </div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Coverage register table">
          <table>
            <caption className="visually-hidden">
              Analyzer coverage and required follow-up
            </caption>
            <thead><tr><th scope="col">Check</th><th scope="col">Recorded state</th><th scope="col">Evidence note</th></tr></thead>
            <tbody>
              {analysis.coverage.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.label}</th>
                  <td><span className={`coverage-state state-${item.state}`}>{coverageLabel(item.state)}</span></td>
                  <td>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="version-strip">
        <div>
          <p className="section-label">Version record</p>
          <h3>{analysis.versions.length} file version{analysis.versions.length === 1 ? "" : "s"}</h3>
        </div>
        <ol>
          {analysis.versions.map((version) => (
            <li key={`${version.version}-${version.fingerprint}`}>
              <span>v{version.version}</span>
              <div><strong>{version.label}</strong><small>{version.fingerprint.slice(0, 12)}… · {formatDate(version.createdAt)}</small></div>
            </li>
          ))}
        </ol>
        <p>
          <ArrowSquareOut aria-hidden="true" /> Audit packs identify exact PDF
          versions; they do not certify compliance.
        </p>
      </div>

      <div className="live-message" aria-live="polite" aria-atomic="true">
        {busyMessage ? <span>{busyMessage}…</span> : null}
        {message ? <span>{message}</span> : null}
        {error ? <span className="error-message" role="alert">{error}</span> : null}
      </div>
    </section>
  );
}

function mergeRevision(
  previous: PdfAnalysis,
  rescanned: PdfAnalysis,
  fixedFinding: Finding,
  after: string,
  changes: string[],
): PdfAnalysis {
  const at = new Date().toISOString();
  const previousPools = new Map<string, Finding[]>();
  for (const finding of previous.findings) {
    const key = findingIdentity(finding);
    previousPools.set(key, [...(previousPools.get(key) ?? []), finding]);
  }
  const matchedPreviousIds = new Set<string>();
  const mergedNew = rescanned.findings.map((finding) => {
    const prior = previousPools.get(findingIdentity(finding))?.shift();
    if (prior) matchedPreviousIds.add(prior.id);
    return prior
      ? { ...finding, id: prior.id, status: prior.status, history: prior.history }
      : finding;
  });
  const priorDecisionRecords = previous.findings.filter(
    (finding) =>
      finding.status !== "open" &&
      finding.id !== fixedFinding.id &&
      !matchedPreviousIds.has(finding.id),
  );
  const fixed: Finding = {
    ...fixedFinding,
    status: "fixed",
    after,
    history: [
      ...fixedFinding.history,
      {
        at,
        from: fixedFinding.status,
        to: "fixed",
        note: `Restricted metadata revision rechecked after writeback: ${after}`,
        actor: "analyzer",
      },
    ],
  };
  const withoutReplacement = mergedNew.filter(
    (finding) =>
      !(
        finding.ruleId === fixedFinding.ruleId &&
        finding.page === fixedFinding.page
      ),
  );
  return {
    ...rescanned,
    findings: [fixed, ...priorDecisionRecords, ...withoutReplacement],
    versions: [
      ...previous.versions,
      {
        version: previous.versions.length + 1,
        label: "Rechecked restricted metadata revision",
        fingerprint: rescanned.fingerprint,
        createdAt: at,
        changes,
      },
    ],
  };
}

function findingIdentity(finding: Finding) {
  return [
    finding.ruleId,
    finding.page ?? "document",
    finding.location,
    finding.evidence,
  ].join("\u241f");
}

function verifyTargetFindingResolved(after: PdfAnalysis, target: Finding) {
  const targetStillPresent = after.findings.some(
    (finding) =>
      finding.ruleId === target.ruleId && finding.page === target.page,
  );
  if (targetStillPresent) {
    throw new Error(
      "The target finding was still present after recheck, so the revision was discarded.",
    );
  }
}

function verifyRestrictedRevisionParity(before: PdfAnalysis, after: PdfAnalysis) {
  if (before.pageCount !== after.pageCount) throw new Error("Page count changed during writeback.");
  const beforeSignals = before.pages.map(protectedPageSignals);
  const afterSignals = after.pages.map(protectedPageSignals);
  if (JSON.stringify(beforeSignals) !== JSON.stringify(afterSignals)) {
    throw new Error(
      "Protected text, structure, image, link, table, or form signals changed, so the revision was discarded.",
    );
  }
}

function protectedPageSignals(page: PdfAnalysis["pages"][number]) {
  return {
    textCharacters: page.textCharacters,
    textItems: page.textItems,
    imagePaintOperations: page.imagePaintOperations,
    annotationCount: page.annotationCount,
    linkAnnotations: page.linkAnnotations,
    widgetAnnotations: page.widgetAnnotations,
    structureRoles: [...page.structureRoles].sort(),
    figureCount: page.figureCount,
    tableCount: page.tableCount,
  };
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function remediatedFileName(fileName: string, version: number) {
  const base = fileName.replace(/\.pdf$/i, "");
  return `${base}-remediated-v${version}.pdf`;
}

function detectionLabel(finding: Finding) {
  return {
    machine: "Machine-detected failure",
    heuristic: "Potential issue — review required",
    manual: "Manual verification required",
    "not-evaluated": "Not evaluated",
  }[finding.detection];
}

function severityLabel(severity: Severity) {
  return `${severity.charAt(0).toUpperCase()}${severity.slice(1)} severity`;
}

function statusLabel(status: FindingStatus) {
  return {
    open: "Open",
    confirmed: "Confirmed",
    dismissed: "Dismissed",
    escalated: "Escalated",
    fixed: "Resolved and rechecked",
  }[status];
}

function coverageLabel(state: PdfAnalysis["coverage"][number]["state"]) {
  return {
    "issue-found": "Issue or risk signal found",
    "signal-present": "No machine-detectable issue found",
    manual: "Manual verification required",
    "not-evaluated": "Not evaluated",
  }[state];
}

function categoryLabel(category: FindingCategory) {
  return category
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date) + " UTC";
}
