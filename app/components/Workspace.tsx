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
import {
  actorLabel,
  categoryLabel,
  coverageLabel,
  detectionLabel,
  formatBytes,
  formatDate,
  getStandardProfileCopy,
  getUiCopy,
  localizeCoverageItem,
  localizeFinding,
  localizeFindingLocation,
  localizeVersionRecord,
  pageCountLabel,
  pageLabel,
  severityLabel,
  statusLabel,
  type Locale,
} from "@/lib/i18n";
import { analyzePdf } from "@/lib/pdf/analyze";
import { createMetadataRevision } from "@/lib/pdf/remediate";
import { buildEvidencePack } from "@/lib/pdf/report";
import type {
  Finding,
  FindingCategory,
  FindingStatus,
  PdfAnalysis,
  Severity,
} from "@/lib/pdf/types";

interface Props {
  locale: Locale;
  initialAnalysis: PdfAnalysis;
  initialBytes: Uint8Array;
  onReset: () => void;
}

const statusValues = ["confirmed", "dismissed", "escalated"] as const;

export function AnalysisWorkspace({
  locale,
  initialAnalysis,
  initialBytes,
  onReset,
}: Props) {
  const copy = getUiCopy(locale).workspace;
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
  const localizedSelected = selected
    ? {
        ...localizeFinding(selected, locale),
        location: localizeFindingLocation(selected, locale),
      }
    : null;

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
    setMessage(`${copy.messages.statusRecorded}: ${statusLabel(status, locale)}.`);
    window.setTimeout(() => {
      const nextTarget =
        document.getElementById("finding-detail-title") ??
        document.getElementById("finding-queue-title");
      nextTarget?.focus();
    }, 0);
  };

  const applySafeFix = async () => {
    if (!selected?.safeFix || !fixValue.trim()) return;
    setBusyMessage(copy.busy.revision);
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
        locale === "zh"
          ? `版本 ${merged.versions.length} ${copy.messages.versionVerified}`
          : `Version ${merged.versions.length} ${copy.messages.versionVerified}`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? localizeWorkspaceError(caught.message, locale)
          : copy.messages.revisionFailed,
      );
    } finally {
      setBusyMessage(null);
    }
  };

  const downloadReport = async () => {
    setBusyMessage(copy.busy.report);
    setError(null);
    try {
      const pack = await buildEvidencePack(analysis, locale);
      downloadBlob(pack.blob, pack.fileName);
      setMessage(copy.messages.reportDownloaded);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? localizeWorkspaceError(caught.message, locale)
          : copy.messages.reportFailed,
      );
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
          <p className="section-label">{copy.label}</p>
          <h2 id="analysis-workspace-title" tabIndex={-1}>
            {analysis.fileName}
          </h2>
          <p className="workspace-meta">
            {pageCountLabel(analysis.pageCount, locale)} ·{" "}
            {formatBytes(analysis.fileSize, locale)} · SHA-256{" "}
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
            {copy.reviewAnother}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isBusy}
            onClick={() => void downloadReport()}
          >
            <DownloadSimple aria-hidden="true" /> {copy.downloadPack}
          </button>
        </div>
      </div>

      {!analysis.textBased ? (
        <div className="workspace-alert" role="status">
          <ShieldWarning weight="fill" aria-hidden="true" />
          <div>
            <strong>{copy.imageOnlyTitle}</strong>
            <span>{copy.imageOnlyCopy}</span>
          </div>
        </div>
      ) : null}

      <div className="workspace-summary" aria-label={copy.findingSummaryAria}>
        <div><strong>{summary.machine}</strong><span>{copy.summary.machine}</span></div>
        <div><strong>{summary.review}</strong><span>{copy.summary.review}</span></div>
        <div><strong>{summary.notEvaluated}</strong><span>{copy.summary.notEvaluated}</span></div>
        <div><strong>{summary.decided}</strong><span>{copy.summary.decided}</span></div>
      </div>

      <div className="mapping-summary" aria-label={copy.selectedMappingsAria}>
        <strong>{copy.evidenceMappings}</strong>
        {analysis.profileIds.map((id) => (
          <span key={id}>{getStandardProfileCopy(id, locale).shortName}</span>
        ))}
        <small>{copy.mappingCaveat}</small>
      </div>

      <div className="workspace-grid">
        <aside className="finding-queue" aria-labelledby="finding-queue-title">
          <div className="queue-heading">
            <div>
              <p className="section-label">{copy.queue}</p>
              <h3 id="finding-queue-title" tabIndex={-1}>
                {filtered.length} {copy.findings}
              </h3>
            </div>
            <ArrowDown aria-hidden="true" />
          </div>
          <div className="queue-filters">
            <label>
              {copy.severity}
              <select
                value={severityFilter}
                disabled={isBusy}
                onChange={(event) => setSeverityFilter(event.target.value as Severity | "all")}
              >
                <option value="all">{copy.all}</option>
                <option value="critical">{severityLabel("critical", locale)}</option>
                <option value="high">{severityLabel("high", locale)}</option>
                <option value="medium">{severityLabel("medium", locale)}</option>
                <option value="low">{severityLabel("low", locale)}</option>
              </select>
            </label>
            <label>
              {copy.status}
              <select
                value={statusFilter}
                disabled={isBusy}
                onChange={(event) =>
                  setStatusFilter(event.target.value as FindingStatus | "all")
                }
              >
                <option value="all">{copy.all}</option>
                <option value="open">{statusLabel("open", locale)}</option>
                <option value="confirmed">{statusLabel("confirmed", locale)}</option>
                <option value="dismissed">{statusLabel("dismissed", locale)}</option>
                <option value="escalated">{statusLabel("escalated", locale)}</option>
                <option value="fixed">{statusLabel("fixed", locale)}</option>
              </select>
            </label>
            <label>
              {copy.category}
              <select
                value={categoryFilter}
                disabled={isBusy}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as FindingCategory | "all")
                }
              >
                <option value="all">{copy.all}</option>
                {[...new Set(analysis.findings.map((finding) => finding.category))].map(
                  (category) => (
                    <option key={category} value={category}>
                      {categoryLabel(category, locale)}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          {filtered.length ? (
            <ol className="finding-list">
              {filtered.map((finding) => {
                const localizedFinding = localizeFinding(finding, locale);
                return (
                <li key={finding.id}>
                  <button
                    type="button"
                    data-rule-id={finding.ruleId}
                    className={finding.id === selected?.id ? "is-selected" : ""}
                    aria-current={finding.id === selected?.id ? "true" : undefined}
                    disabled={isBusy}
                    onClick={() => selectFinding(finding.id)}
                  >
                    <span className={`severity-dot severity-${finding.severity}`} aria-hidden="true" />
                    <span className="finding-list-copy">
                      <small>
                        {pageLabel(finding.page, locale)} ·{" "}
                        {severityLabel(finding.severity, locale)} ·{" "}
                        {detectionLabel(finding.detection, locale)}
                      </small>
                      <strong>{localizedFinding.title}</strong>
                      <span>{localizedFinding.evidence}</span>
                    </span>
                    <span className={`status-badge status-${finding.status}`}>
                      {statusLabel(finding.status, locale)}
                    </span>
                  </button>
                </li>
                );
              })}
            </ol>
          ) : (
            <p className="empty-filter">{copy.noMatches}</p>
          )}
        </aside>

        <article
          className="finding-detail"
          aria-labelledby={selected ? "finding-detail-title" : undefined}
        >
          {selected && localizedSelected ? (
            <>
              <div className="detail-heading">
                <div>
                  <p className="section-label">{selected.ruleId}</p>
                  <h3 id="finding-detail-title" tabIndex={-1}>
                    {localizedSelected.title}
                  </h3>
                </div>
                <span className={`severity-badge severity-${selected.severity}`}>
                  {severityLabel(selected.severity, locale)}
                </span>
              </div>

              <div className="finding-badges">
                <span>{detectionLabel(selected.detection, locale)}</span>
                <span>{pageLabel(selected.page, locale)}</span>
                <span>{statusLabel(selected.status, locale)}</span>
              </div>

              <dl className="evidence-grid">
                <div><dt>{copy.location}</dt><dd>{localizedSelected.location}</dd></div>
                <div><dt>{copy.evidence}</dt><dd>{localizedSelected.evidence}</dd></div>
                <div><dt>{copy.method}</dt><dd>{localizedSelected.method}</dd></div>
              </dl>

              <section className="detail-section" aria-labelledby="mapping-title">
                <h4 id="mapping-title">{copy.mapping}</h4>
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
                    {copy.noNormativeResult}
                  </p>
                )}
              </section>

              <section className="detail-section" aria-labelledby="guidance-title">
                <h4 id="guidance-title">{copy.guidance}</h4>
                <ol className="guidance-list">
                  {localizedSelected.guidance.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </section>

              {selected.safeFix && selected.status !== "fixed" ? (
                <section className="safe-fix-panel" aria-labelledby="safe-fix-title">
                  <div>
                    <p className="section-label">{copy.restrictedWriteback}</p>
                    <h4 id="safe-fix-title">{copy.createRevision}</h4>
                    <p>{copy.revisionBoundary}</p>
                  </div>
                  <label>
                    {selected.safeFix === "document-title"
                      ? copy.accurateTitle
                      : copy.primaryLanguage}
                    <input
                      type="text"
                      value={fixValue}
                      disabled={isBusy}
                      placeholder={
                        selected.safeFix === "document-title"
                          ? copy.titleExample
                          : copy.languageExample
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
                    <FilePdf aria-hidden="true" /> {copy.createAndRecheck}
                  </button>
                </section>
              ) : null}

              <section className="review-panel" aria-labelledby="review-title">
                <div>
                  <p className="section-label">{copy.humanDecision}</p>
                  <h4 id="review-title">{copy.recordStatus}</h4>
                </div>
                <label>
                  {copy.reviewerRationale} <span>({copy.required})</span>
                  <textarea
                    value={reviewNote}
                    required
                    disabled={isBusy}
                    aria-describedby="review-rationale-help"
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder={copy.rationalePlaceholder}
                    rows={3}
                  />
                </label>
                <small id="review-rationale-help" className="review-help">
                  {copy.rationaleHelp}
                </small>
                <div className="review-actions">
                  {statusValues.map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!reviewNote.trim() || isBusy}
                      onClick={() => updateFindingStatus(value)}
                    >
                      {value === "confirmed" ? <Check aria-hidden="true" /> : null}
                      {value === "dismissed" ? <X aria-hidden="true" /> : null}
                      {value === "escalated" ? <Flag aria-hidden="true" /> : null}
                      {copy.actions[value]}
                    </button>
                  ))}
                </div>
              </section>

              <details className="history-panel">
                <summary>{copy.history} ({selected.history.length})</summary>
                <ol>
                  {selected.history.map((entry, index) => (
                    <li key={`${entry.at}-${index}`}>
                      <strong>{statusLabel(entry.to, locale)}</strong>
                      <span>
                        {formatDate(entry.at, locale)} · {actorLabel(entry.actor, locale)}
                      </span>
                      <p>{localizeHistoryNote(entry.note, entry.actor, locale)}</p>
                    </li>
                  ))}
                </ol>
              </details>
            </>
          ) : (
            <p>{copy.selectFinding}</p>
          )}
        </article>
      </div>

      <div className="coverage-register">
        <div className="coverage-heading">
          <div>
            <p className="section-label">{copy.coverageLabel}</p>
            <h3>{copy.coverageTitle}</h3>
          </div>
          <Info aria-hidden="true" />
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label={copy.coverageRegionAria}
        >
          <table>
            <caption className="visually-hidden">{copy.coverageCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{copy.check}</th>
                <th scope="col">{copy.recordedState}</th>
                <th scope="col">{copy.evidenceNote}</th>
              </tr>
            </thead>
            <tbody>
              {analysis.coverage.map((item) => {
                const localizedItem = localizeCoverageItem(item, locale);
                return (
                  <tr key={item.id}>
                    <th scope="row">{localizedItem.label}</th>
                    <td>
                      <span className={`coverage-state state-${item.state}`}>
                        {coverageLabel(item.state, locale)}
                      </span>
                    </td>
                    <td>{localizedItem.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="version-strip">
        <div>
          <p className="section-label">{copy.versionRecord}</p>
          <h3>
            {analysis.versions.length}{" "}
            {analysis.versions.length === 1 ? copy.fileVersion : copy.fileVersions}
          </h3>
        </div>
        <ol>
          {analysis.versions.map((version) => {
            const localizedVersion = localizeVersionRecord(version, locale);
            return (
              <li key={`${version.version}-${version.fingerprint}`}>
                <span>v{version.version}</span>
                <div>
                  <strong>{localizedVersion.label}</strong>
                  <small>
                    {version.fingerprint.slice(0, 12)}… ·{" "}
                    {formatDate(version.createdAt, locale)}
                  </small>
                </div>
              </li>
            );
          })}
        </ol>
        <p>
          <ArrowSquareOut aria-hidden="true" /> {copy.versionCaveat}
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

function localizeHistoryNote(
  note: string,
  actor: "analyzer" | "reviewer",
  locale: Locale,
) {
  if (locale === "en" || actor === "reviewer") return note;
  if (note === "Created from the recorded analysis signal.") {
    return "根据已记录的分析信号创建。";
  }
  const legacyRevision = /^Metadata-only revision verified after writeback: (.*)$/.exec(note);
  if (legacyRevision) return `受限元数据修订写回后已验证：${legacyRevision[1]}`;
  const restrictedRevision = /^Restricted metadata revision rechecked after writeback: (.*)$/.exec(note);
  return restrictedRevision ? `受限元数据修订写回后已复查：${restrictedRevision[1]}` : note;
}

function localizeWorkspaceError(message: string, locale: Locale) {
  if (locale === "en") return message;
  const exactMessages: Record<string, string> = {
    "The target finding was still present after recheck, so the revision was discarded.":
      "重新检查后目标问题仍然存在，因此已丢弃该修订版。",
    "Page count changed during writeback.": "写回过程中页数发生变化，因此已丢弃该修订版。",
    "Protected text, structure, image, link, table, or form signals changed, so the revision was discarded.":
      "受保护的文本、结构、图像、链接、表格或表单信号发生变化，因此已丢弃该修订版。",
  };
  return exactMessages[message] ?? `操作失败：${message}`;
}
