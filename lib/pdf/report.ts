import { STANDARD_PROFILES } from "./standards";
import type { Finding, PdfAnalysis } from "./types";

const DISCLAIMER =
  "This evidence pack records the checks performed, findings, changes, and reviewer decisions for the identified PDF version. It is not an accessibility certification, legal opinion, or guarantee of conformance with WCAG, Section 508, PDF/UA, EN 301 549, the WAD, the EAA, or any procurement requirement. Automated checks cover only the methods and scope listed in this report. Manual and assistive-technology testing may still be required. Applicable obligations and exceptions depend on the publisher, content, jurisdiction, contract, and use.";

export async function buildEvidencePack(analysis: PdfAnalysis) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const safeBaseName = analysis.fileName
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "document";
  zip.file("remediation-evidence.html", renderEvidenceHtml(analysis));
  zip.file("evidence.json", JSON.stringify(serializableAnalysis(analysis), null, 2));
  zip.file(
    "README.txt",
    [
      "ClearTag Remediation Evidence Pack",
      "Not a certificate of conformance",
      "",
      `Source file: ${analysis.fileName}`,
      `Source SHA-256: ${analysis.fingerprint}`,
      `Analyzed: ${analysis.analyzedAt}`,
      "",
      "Open remediation-evidence.html in a browser for the accessible human-readable report.",
      "Use evidence.json for machine-readable review records.",
      "The source PDF is intentionally not included in this package.",
      "",
      DISCLAIMER,
    ].join("\n"),
  );
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return {
    blob,
    fileName: `${safeBaseName}-remediation-evidence.zip`,
  };
}

export function renderEvidenceHtml(analysis: PdfAnalysis) {
  const profiles = analysis.profileIds
    .map((id) => STANDARD_PROFILES.find((profile) => profile.id === id))
    .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  const counts = analysis.findings.reduce(
    (summary, finding) => {
      summary[finding.status] = (summary[finding.status] ?? 0) + 1;
      return summary;
    },
    {} as Record<string, number>,
  );

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Remediation Evidence Pack — ${escapeHtml(analysis.fileName)}</title>
  <style>
    :root{color-scheme:light;--ink:#102421;--muted:#52635f;--line:#aab8b4;--paper:#fff;--wash:#f2f1ec;--teal:#0b554c;--amber:#71400c;--amber-bg:#fff1d9;--red:#852f28;--red-bg:#fbe9e6}
    *{box-sizing:border-box}html{font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:var(--ink);background:var(--wash)}body{margin:0}.skip{position:absolute;left:1rem;top:-5rem;background:var(--ink);color:#fff;padding:.75rem 1rem}.skip:focus{top:1rem}main{width:min(70rem,calc(100% - 2rem));margin:1rem auto 4rem;padding:clamp(1.25rem,4vw,3.5rem);background:var(--paper);border:1px solid var(--line)}h1,h2,h3{line-height:1.18}h1{font-family:Georgia,serif;font-size:clamp(2.1rem,6vw,4.4rem);font-weight:500;margin:.2rem 0 1rem}h2{margin-top:3rem;border-top:2px solid var(--ink);padding-top:1rem}h3{font-size:1.12rem}.eyebrow{font-size:.78rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--teal)}.warning{padding:1rem;border:1px solid #c6934e;background:var(--amber-bg);color:#55320e;font-weight:700}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem 2rem}.meta dt{font-size:.75rem;font-weight:800;text-transform:uppercase;color:var(--muted)}.meta dd{margin:0 0 1rem;overflow-wrap:anywhere}.hash{font-family:ui-monospace,monospace;font-size:.8rem}.summary{display:flex;flex-wrap:wrap;gap:.6rem}.summary span,.pill{display:inline-block;border:1px solid var(--line);padding:.35rem .55rem;border-radius:.25rem;background:#f7faf9;font-size:.78rem;font-weight:700}.profiles,.limits{padding-left:1.2rem}.profiles li,.limits li{margin:.65rem 0}.finding{margin:1rem 0;padding:1.1rem;border:1px solid var(--line);border-left:5px solid var(--teal)}.finding[data-outcome="failure"]{border-left-color:var(--red)}.finding[data-outcome="not-evaluated"]{border-left-color:var(--amber)}.finding-meta{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0 1rem}.finding dl{display:grid;grid-template-columns:minmax(9rem,.3fr) 1fr;gap:.4rem 1rem}.finding dt{font-weight:800}.finding dd{margin:0;overflow-wrap:anywhere}.finding ul{padding-left:1.25rem}.history{width:100%;border-collapse:collapse;margin-top:.75rem}.history caption{text-align:left;font-weight:800;margin-bottom:.4rem}.history th,.history td{padding:.5rem;border:1px solid var(--line);text-align:left;vertical-align:top}.history th{background:#edf3f1}.coverage{width:100%;border-collapse:collapse}.coverage th,.coverage td{padding:.65rem;border:1px solid var(--line);text-align:left;vertical-align:top}.coverage th{background:#edf3f1}.footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);font-size:.82rem;color:var(--muted)}a:focus-visible{outline:3px solid #1769aa;outline-offset:3px}@media(max-width:42rem){main{width:100%;margin:0;border:0}.meta{grid-template-columns:1fr}.finding dl{grid-template-columns:1fr}.history,.coverage{display:block;overflow-x:auto}}@media print{body{background:#fff}.skip{display:none}main{width:auto;margin:0;border:0}.finding{break-inside:avoid}a{color:#000}}
  </style>
</head>
<body>
  <a class="skip" href="#report">Skip to report</a>
  <main id="report">
    <header>
      <p class="eyebrow">ClearTag · versioned review record</p>
      <h1>Remediation Evidence Pack</h1>
      <p class="warning">Not a certificate of conformance. ${escapeHtml(DISCLAIMER)}</p>
    </header>

    <section aria-labelledby="scope-heading">
      <h2 id="scope-heading">File, scope, and method</h2>
      <dl class="meta">
        <div><dt>File name</dt><dd>${escapeHtml(analysis.fileName)}</dd></div>
        <div><dt>Pages and size</dt><dd>${analysis.pageCount} pages · ${formatBytes(analysis.fileSize)}</dd></div>
        <div><dt>SHA-256</dt><dd class="hash">${analysis.fingerprint}</dd></div>
        <div><dt>Analyzed</dt><dd>${escapeHtml(formatDate(analysis.analyzedAt))}</dd></div>
        <div><dt>Tool</dt><dd>${escapeHtml(analysis.tool)} ${escapeHtml(analysis.toolVersion)}</dd></div>
        <div><dt>Ruleset</dt><dd>${escapeHtml(analysis.rulesetVersion)}</dd></div>
      </dl>
      <div class="summary" aria-label="Finding status totals">
        ${Object.entries(counts).map(([status, count]) => `<span>${escapeHtml(statusLabel(status))}: ${count}</span>`).join("")}
      </div>
      <h3>Evidence mappings</h3>
      <ul class="profiles">
        ${profiles.map((profile) => `<li><strong>${escapeHtml(profile.name)}</strong><br>${escapeHtml(profile.description)} ${escapeHtml(profile.scopeNote)}</li>`).join("")}
      </ul>
      <h3>Declared limits</h3>
      <ul class="limits">${analysis.limits.map((limit) => `<li>${escapeHtml(limit)}</li>`).join("")}</ul>
    </section>

    <section aria-labelledby="coverage-heading">
      <h2 id="coverage-heading">Coverage register</h2>
      <table class="coverage">
        <caption>What the analyzer observed, and what still needs human work</caption>
        <thead><tr><th scope="col">Check</th><th scope="col">Recorded state</th><th scope="col">Evidence note</th></tr></thead>
        <tbody>
          ${analysis.coverage.map((item) => `<tr><th scope="row">${escapeHtml(item.label)}</th><td>${escapeHtml(coverageLabel(item.state))}</td><td>${escapeHtml(item.note)}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>

    <section aria-labelledby="findings-heading">
      <h2 id="findings-heading">Findings and reviewer decisions</h2>
      ${analysis.findings.map(renderFinding).join("")}
    </section>

    <section aria-labelledby="versions-heading">
      <h2 id="versions-heading">Version record</h2>
      ${analysis.versions.map((version) => `<article class="finding"><h3>Version ${version.version}: ${escapeHtml(version.label)}</h3><p class="hash">SHA-256 ${version.fingerprint}</p><p>${escapeHtml(formatDate(version.createdAt))}</p><ul>${version.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ul></article>`).join("")}
    </section>

    <p class="footer">Generated locally by ClearTag. The source PDF is not embedded in this report.</p>
  </main>
</body>
</html>`;
}

function renderFinding(finding: Finding) {
  return `<article class="finding" data-outcome="${escapeHtml(finding.outcome)}">
    <h3>${escapeHtml(finding.title)}</h3>
    <div class="finding-meta">
      <span class="pill">${escapeHtml(severityLabel(finding.severity))}</span>
      <span class="pill">${escapeHtml(detectionLabel(finding.detection))}</span>
      <span class="pill">${escapeHtml(statusLabel(finding.status))}</span>
      <span class="pill">${finding.page ? `Page ${finding.page}` : "Document-wide"}</span>
    </div>
    <dl>
      <dt>Rule</dt><dd>${escapeHtml(finding.ruleId)}</dd>
      <dt>Location</dt><dd>${escapeHtml(finding.location)}</dd>
      <dt>Evidence</dt><dd>${escapeHtml(finding.evidence)}</dd>
      <dt>Method</dt><dd>${escapeHtml(finding.method)}</dd>
      <dt>Standards mapping</dt><dd>${finding.standardReferences.length ? finding.standardReferences.map((reference) => escapeHtml(reference.label)).join(" · ") : "No normative result assigned"}</dd>
      ${finding.before ? `<dt>Before</dt><dd>${escapeHtml(finding.before)}</dd>` : ""}
      ${finding.after ? `<dt>After</dt><dd>${escapeHtml(finding.after)}</dd>` : ""}
    </dl>
    <h4>Guided next steps</h4>
    <ol>${finding.guidance.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    <table class="history">
      <caption>Status history</caption>
      <thead><tr><th scope="col">Date</th><th scope="col">Actor</th><th scope="col">Change</th><th scope="col">Note</th></tr></thead>
      <tbody>${finding.history.map((entry) => `<tr><td>${escapeHtml(formatDate(entry.at))}</td><td>${escapeHtml(entry.actor)}</td><td>${escapeHtml(`${entry.from ? statusLabel(entry.from) : "Created"} → ${statusLabel(entry.to)}`)}</td><td>${escapeHtml(entry.note)}</td></tr>`).join("")}</tbody>
    </table>
  </article>`;
}

function serializableAnalysis(analysis: PdfAnalysis) {
  return {
    schema: "https://cleartag.local/schemas/remediation-evidence-v1.json",
    reportType: "remediation-evidence-pack",
    certificateOfConformance: false,
    disclaimer: DISCLAIMER,
    ...analysis,
  };
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function severityLabel(value: Finding["severity"]) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)} severity`;
}

function detectionLabel(value: Finding["detection"]) {
  return {
    machine: "Machine-detected failure",
    heuristic: "Potential issue — review required",
    manual: "Manual verification required",
    "not-evaluated": "Not evaluated",
  }[value];
}

function statusLabel(value: string) {
  return {
    open: "Open",
    confirmed: "Confirmed by reviewer",
    dismissed: "Dismissed with reviewer rationale",
    escalated: "Escalated to specialist",
    fixed: "Resolved and rechecked",
  }[value] ?? value;
}

function coverageLabel(value: string) {
  return {
    "issue-found": "Issue or risk signal found",
    "signal-present": "No machine-detectable issue found",
    manual: "Manual verification required",
    "not-evaluated": "Not evaluated",
  }[value] ?? value;
}
