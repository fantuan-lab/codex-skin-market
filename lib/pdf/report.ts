import {
  DEFAULT_LOCALE,
  actorLabel,
  coverageLabel,
  detectionLabel,
  formatBytes,
  formatDate,
  getStandardProfileCopy,
  getUiCopy,
  localizeAnalyzerLimit,
  localizeCoverageItem,
  localizeFinding,
  localizeFindingLocation,
  localizeVersionRecord,
  pageCountLabel,
  pageLabel,
  PDF_SAFETY_PROBE_KEYS,
  safetyProbeLabel,
  safetyStateEffect,
  safetyStateLabel,
  severityLabel,
  statusLabel,
  type Locale,
} from "../i18n";
import type {
  Finding,
  FindingHistoryEntry,
  PdfAnalysis,
  PdfVersionRecord,
} from "./types";

export async function buildEvidencePack(
  analysis: PdfAnalysis,
  locale: Locale = DEFAULT_LOCALE,
) {
  const { default: JSZip } = await import("jszip");
  const copy = getUiCopy(locale).report;
  const zip = new JSZip();
  const safeBaseName = analysis.fileName
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "document";
  zip.file("remediation-evidence.html", renderEvidenceHtml(analysis, locale));
  zip.file(
    "evidence.json",
    JSON.stringify(serializableAnalysis(analysis, locale), null, 2),
  );
  zip.file(
    "README.txt",
    [
      copy.readmeTitle,
      copy.readmeNotCertificate,
      "",
      `${copy.sourceFile}: ${analysis.fileName}`,
      `${copy.sourceHash}: ${analysis.fingerprint}`,
      `${copy.analyzed}: ${analysis.analyzedAt}`,
      "",
      copy.openHtml,
      copy.useJson,
      copy.sourceOmitted,
      "",
      copy.disclaimer,
    ].join("\n"),
  );
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return {
    blob,
    fileName: `${safeBaseName}-remediation-evidence.zip`,
  };
}

export function renderEvidenceHtml(
  analysis: PdfAnalysis,
  locale: Locale = DEFAULT_LOCALE,
) {
  const copy = getUiCopy(locale).report;
  const profiles = analysis.profileIds.map((id) =>
    getStandardProfileCopy(id, locale),
  );
  const counts = analysis.findings.reduce(
    (summary, finding) => {
      summary[finding.status] = (summary[finding.status] ?? 0) + 1;
      return summary;
    },
    {} as Partial<Record<Finding["status"], number>>,
  );
  const coverage = analysis.coverage.map((item) =>
    localizeCoverageItem(item, locale),
  );
  const versions = analysis.versions.map((version) =>
    localizedVersionRecord(version, locale),
  );

  return `<!doctype html>
<html lang="${escapeHtml(copy.htmlLang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(copy.titlePrefix)} — ${escapeHtml(analysis.fileName)}</title>
  <style>
    :root{color-scheme:light;--ink:#102421;--muted:#52635f;--line:#aab8b4;--paper:#fff;--wash:#f2f1ec;--teal:#0b554c;--amber:#71400c;--amber-bg:#fff1d9;--red:#852f28;--red-bg:#fbe9e6}
    *{box-sizing:border-box}html{font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:var(--ink);background:var(--wash)}body{margin:0}.skip{position:absolute;left:1rem;top:-5rem;background:var(--ink);color:#fff;padding:.75rem 1rem}.skip:focus{top:1rem}main{width:min(70rem,calc(100% - 2rem));margin:1rem auto 4rem;padding:clamp(1.25rem,4vw,3.5rem);background:var(--paper);border:1px solid var(--line)}h1,h2,h3{line-height:1.18}h1{font-family:Georgia,serif;font-size:clamp(2.1rem,6vw,4.4rem);font-weight:500;margin:.2rem 0 1rem}h2{margin-top:3rem;border-top:2px solid var(--ink);padding-top:1rem}h3{font-size:1.12rem}.eyebrow{font-size:.78rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--teal)}.warning{padding:1rem;border:1px solid #c6934e;background:var(--amber-bg);color:#55320e;font-weight:700}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem 2rem}.meta dt{font-size:.75rem;font-weight:800;text-transform:uppercase;color:var(--muted)}.meta dd{margin:0 0 1rem;overflow-wrap:anywhere}.hash{font-family:ui-monospace,monospace;font-size:.8rem}.summary{display:flex;flex-wrap:wrap;gap:.6rem}.summary span,.pill{display:inline-block;border:1px solid var(--line);padding:.35rem .55rem;border-radius:.25rem;background:#f7faf9;font-size:.78rem;font-weight:700}.profiles,.limits{padding-left:1.2rem}.profiles li,.limits li{margin:.65rem 0}.finding{margin:1rem 0;padding:1.1rem;border:1px solid var(--line);border-left:5px solid var(--teal)}.finding[data-outcome="failure"]{border-left-color:var(--red)}.finding[data-outcome="not-evaluated"]{border-left-color:var(--amber)}.finding-meta{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0 1rem}.finding dl{display:grid;grid-template-columns:minmax(9rem,.3fr) 1fr;gap:.4rem 1rem}.finding dt{font-weight:800}.finding dd{margin:0;overflow-wrap:anywhere}.finding ul{padding-left:1.25rem}.history{width:100%;border-collapse:collapse;margin-top:.75rem}.history caption{text-align:left;font-weight:800;margin-bottom:.4rem}.history th,.history td{padding:.5rem;border:1px solid var(--line);text-align:left;vertical-align:top}.history th{background:#edf3f1}.coverage{width:100%;border-collapse:collapse}.coverage th,.coverage td{padding:.65rem;border:1px solid var(--line);text-align:left;vertical-align:top}.coverage th{background:#edf3f1}.footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);font-size:.82rem;color:var(--muted)}a:focus-visible{outline:3px solid #1769aa;outline-offset:3px}@media(max-width:42rem){main{width:100%;margin:0;border:0}.meta{grid-template-columns:1fr}.finding dl{grid-template-columns:1fr}.history,.coverage{display:block;overflow-x:auto}}@media print{body{background:#fff}.skip{display:none}main{width:auto;margin:0;border:0}.finding{break-inside:avoid}a{color:#000}}
  </style>
</head>
<body>
  <a class="skip" href="#report">${escapeHtml(copy.skip)}</a>
  <main id="report">
    <header>
      <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
      <h1>${escapeHtml(copy.title)}</h1>
      <p class="warning">${escapeHtml(copy.notCertificate)} ${escapeHtml(copy.disclaimer)}</p>
    </header>

    <section aria-labelledby="scope-heading">
      <h2 id="scope-heading">${escapeHtml(copy.scopeHeading)}</h2>
      <dl class="meta">
        <div><dt>${escapeHtml(copy.fileName)}</dt><dd>${escapeHtml(analysis.fileName)}</dd></div>
        <div><dt>${escapeHtml(copy.pagesAndSize)}</dt><dd>${escapeHtml(pageCountLabel(analysis.pageCount, locale))} · ${escapeHtml(formatBytes(analysis.fileSize, locale))}</dd></div>
        <div><dt>SHA-256</dt><dd class="hash">${escapeHtml(analysis.fingerprint)}</dd></div>
        <div><dt>${escapeHtml(copy.analyzed)}</dt><dd>${escapeHtml(formatDate(analysis.analyzedAt, locale))}</dd></div>
        <div><dt>${escapeHtml(copy.tool)}</dt><dd>${escapeHtml(analysis.tool)} ${escapeHtml(analysis.toolVersion)}</dd></div>
        <div><dt>${escapeHtml(copy.ruleset)}</dt><dd>${escapeHtml(analysis.rulesetVersion)}</dd></div>
      </dl>
      <div class="summary" aria-label="${escapeHtml(copy.totalsAria)}">
        ${typedEntries(counts).map(([status, count]) => `<span>${escapeHtml(statusLabel(status, locale))}: ${count}</span>`).join("")}
      </div>
      <h3>${escapeHtml(copy.evidenceMappings)}</h3>
      <ul class="profiles">
        ${profiles.map((profile) => `<li><strong>${escapeHtml(profile.name)}</strong><br>${escapeHtml(profile.description)} ${escapeHtml(profile.scopeNote)}</li>`).join("")}
      </ul>
      <h3>${escapeHtml(copy.declaredLimits)}</h3>
      <ul class="limits">${analysis.limits.map((limit) => `<li>${escapeHtml(localizeAnalyzerLimit(limit, locale))}</li>`).join("")}</ul>
    </section>

    <section aria-labelledby="safety-heading">
      <h2 id="safety-heading">${escapeHtml(copy.safetyHeading)}</h2>
      <table class="coverage safety-probes">
        <caption>${escapeHtml(copy.safetyCaption)}</caption>
        <thead><tr><th scope="col">${escapeHtml(copy.safetyProbe)}</th><th scope="col">${escapeHtml(copy.safetyState)}</th><th scope="col">${escapeHtml(copy.safetyEffect)}</th></tr></thead>
        <tbody>
          ${PDF_SAFETY_PROBE_KEYS.map((probe) => {
            const state = analysis.metadata.safetyInspection[probe];
            return `<tr data-probe-state="${escapeHtml(state)}"><th scope="row">${escapeHtml(safetyProbeLabel(probe, locale))}</th><td>${escapeHtml(safetyStateLabel(state, locale))}</td><td>${escapeHtml(safetyStateEffect(probe, state, locale))}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </section>

    <section aria-labelledby="coverage-heading">
      <h2 id="coverage-heading">${escapeHtml(copy.coverageHeading)}</h2>
      <table class="coverage">
        <caption>${escapeHtml(copy.coverageCaption)}</caption>
        <thead><tr><th scope="col">${escapeHtml(copy.check)}</th><th scope="col">${escapeHtml(copy.recordedState)}</th><th scope="col">${escapeHtml(copy.evidenceNote)}</th></tr></thead>
        <tbody>
          ${coverage.map((item) => `<tr><th scope="row">${escapeHtml(item.label)}</th><td>${escapeHtml(coverageLabel(item.state, locale))}</td><td>${escapeHtml(item.note)}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>

    <section aria-labelledby="findings-heading">
      <h2 id="findings-heading">${escapeHtml(copy.findingsHeading)}</h2>
      ${analysis.findings.map((finding) => renderFinding(finding, locale)).join("")}
    </section>

    <section aria-labelledby="versions-heading">
      <h2 id="versions-heading">${escapeHtml(copy.versionsHeading)}</h2>
      ${versions.map((version) => `<article class="finding"><h3>${escapeHtml(copy.version)} ${version.version}: ${escapeHtml(version.label)}</h3><p class="hash">SHA-256 ${escapeHtml(version.fingerprint)}</p><p>${escapeHtml(formatDate(version.createdAt, locale))}</p><ul>${version.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ul></article>`).join("")}
    </section>

    <p class="footer">${escapeHtml(copy.footer)}</p>
  </main>
</body>
</html>`;
}

function renderFinding(finding: Finding, locale: Locale) {
  const copy = getUiCopy(locale).report;
  const localized = localizeFinding(finding, locale);
  const location = localizeFindingLocation(finding, locale);

  return `<article class="finding" data-outcome="${escapeHtml(finding.outcome)}">
    <h3>${escapeHtml(localized.title)}</h3>
    <div class="finding-meta">
      <span class="pill">${escapeHtml(severityLabel(finding.severity, locale))}</span>
      <span class="pill">${escapeHtml(detectionLabel(finding.detection, locale))}</span>
      <span class="pill">${escapeHtml(statusLabel(finding.status, locale))}</span>
      <span class="pill">${escapeHtml(pageLabel(finding.page, locale))}</span>
    </div>
    <dl>
      <dt>${escapeHtml(copy.rule)}</dt><dd>${escapeHtml(finding.ruleId)}</dd>
      <dt>${escapeHtml(copy.location)}</dt><dd>${escapeHtml(location)}</dd>
      <dt>${escapeHtml(copy.evidence)}</dt><dd>${escapeHtml(localized.evidence)}</dd>
      <dt>${escapeHtml(copy.method)}</dt><dd>${escapeHtml(localized.method)}</dd>
      <dt>${escapeHtml(copy.standardsMapping)}</dt><dd>${finding.standardReferences.length ? finding.standardReferences.map((reference) => escapeHtml(reference.label)).join(" · ") : escapeHtml(copy.noNormativeResult)}</dd>
      ${finding.before ? `<dt>${escapeHtml(copy.before)}</dt><dd>${escapeHtml(finding.before)}</dd>` : ""}
      ${finding.after ? `<dt>${escapeHtml(copy.after)}</dt><dd>${escapeHtml(finding.after)}</dd>` : ""}
    </dl>
    <h4>${escapeHtml(copy.guidedSteps)}</h4>
    <ol>${localized.guidance.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    <table class="history">
      <caption>${escapeHtml(copy.statusHistory)}</caption>
      <thead><tr><th scope="col">${escapeHtml(copy.date)}</th><th scope="col">${escapeHtml(copy.actor)}</th><th scope="col">${escapeHtml(copy.change)}</th><th scope="col">${escapeHtml(copy.note)}</th></tr></thead>
      <tbody>${finding.history.map((entry) => `<tr><td>${escapeHtml(formatDate(entry.at, locale))}</td><td>${escapeHtml(actorLabel(entry.actor, locale))}</td><td>${escapeHtml(`${entry.from ? statusLabel(entry.from, locale) : copy.created} → ${statusLabel(entry.to, locale)}`)}</td><td>${escapeHtml(localizedHistoryNote(entry, locale))}</td></tr>`).join("")}</tbody>
    </table>
  </article>`;
}

function serializableAnalysis(analysis: PdfAnalysis, locale: Locale) {
  const copy = getUiCopy(locale).report;
  return {
    schema: "https://cleartag.local/schemas/remediation-evidence-v1.json",
    reportType: "remediation-evidence-pack",
    reportLocale: locale,
    certificateOfConformance: false,
    disclaimer: copy.disclaimer,
    ...analysis,
    findings: analysis.findings.map((finding) => {
      const localized = localizeFinding(finding, locale);
      return {
        ...localized,
        location: localizeFindingLocation(finding, locale),
        history: finding.history.map((entry) => ({
          ...entry,
          note: localizedHistoryNote(entry, locale),
        })),
      };
    }),
    coverage: analysis.coverage.map((item) =>
      localizeCoverageItem(item, locale),
    ),
    versions: analysis.versions.map((version) =>
      localizedVersionRecord(version, locale),
    ),
    limits: analysis.limits.map((limit) =>
      localizeAnalyzerLimit(limit, locale),
    ),
  };
}

function localizedHistoryNote(entry: FindingHistoryEntry, locale: Locale) {
  if (locale === "en" || entry.actor === "reviewer") return entry.note;
  if (entry.note === "Created from the recorded analysis signal.") {
    return "根据已记录的分析信号创建。";
  }
  const restrictedRevision =
    /^Restricted metadata revision rechecked after writeback: (.*)$/.exec(entry.note);
  return restrictedRevision
    ? `受限元数据修订写回后已复查：${restrictedRevision[1]}`
    : entry.note;
}

function localizedVersionRecord(
  version: PdfVersionRecord,
  locale: Locale,
): PdfVersionRecord {
  return localizeVersionRecord(version, locale);
}

function typedEntries<T extends string>(
  value: Partial<Record<T, number>>,
): Array<[T, number]> {
  return Object.entries(value) as Array<[T, number]>;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
