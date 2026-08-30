import {
  ArrowRight,
  ArrowsClockwise,
  Buildings,
  FilePdf,
  Files,
  GraduationCap,
  Handshake,
  LockKey,
  ShieldCheck,
  UserFocus,
} from "@phosphor-icons/react/dist/ssr";
import { PdfExperience } from "./components/PdfExperience";

const audiences = [
  {
    icon: Handshake,
    title: "Accessibility consultancies",
    copy: "Triage high-volume client files, keep reviewer decisions, and deliver evidence with the remediated version.",
  },
  {
    icon: GraduationCap,
    title: "Public colleges and universities",
    copy: "Review syllabi, course packets, admissions and aid forms, training, and public notices before publication.",
  },
  {
    icon: Buildings,
    title: "Government document teams",
    copy: "Prepare council materials, permits, benefit applications, budgets, notices, and procurement deliverables.",
  },
  {
    icon: Files,
    title: "Federal delivery partners",
    copy: "Build the evidence required by the contract, agency method, acceptance criteria, and Section 508 review process.",
  },
];

export default function Home() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <header className="topbar">
        <a className="brand" href="#top" aria-label="ClearTag home">
          <span className="brand-mark" aria-hidden="true"><FilePdf weight="fill" /></span>
          <span className="brand-copy">
            <strong>ClearTag</strong>
            <small>PDF remediation workspace · working name</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workflow">Workflow</a>
          <a href="#standards">Standards</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <a className="header-cta" href="#analyzer">
          Open analyzer <ArrowRight aria-hidden="true" />
        </a>
      </header>

      <main id="main-content">
        <PdfExperience />

        <section className="confidence-strip" aria-label="MVP processing facts">
          <div><strong>1–100</strong><span>text-based pages per file</span></div>
          <div><strong>Local</strong><span>analysis in this browser tab</span></div>
          <div><strong>SHA-256</strong><span>file and version fingerprint</span></div>
          <div><strong>Human</strong><span>review stays explicit</span></div>
        </section>

        <section className="audience-section" aria-labelledby="audience-title">
          <div className="section-heading split-heading">
            <div>
              <p className="section-label">Built for accountable delivery</p>
              <h2 id="audience-title">A review queue, not a pass/fail badge.</h2>
            </div>
            <p>
              For teams accountable for public-facing and contract-delivered PDFs,
              where a finding needs an owner, a decision, and evidence—not a score
              that hides uncertainty.
            </p>
          </div>
          <div className="audience-grid">
            {audiences.map(({ icon: Icon, title, copy }) => (
              <article key={title}>
                <Icon weight="duotone" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <p className="document-types">
            Common files: course handouts · syllabi · admissions and aid forms ·
            council packets · permits · benefits applications · budgets · public
            notices · training · user guides · delivery reports
          </p>
        </section>

        <section id="workflow" className="workflow-section" aria-labelledby="workflow-title">
          <div className="section-heading">
            <p className="section-label">Evidence-led workflow</p>
            <h2 id="workflow-title">From file intake to a defensible handoff.</h2>
            <p>
              Automation narrows the queue. People remain responsible for meaning,
              usability, and the final delivery decision.
            </p>
          </div>
          <ol className="workflow-steps">
            <li>
              <span>01</span><FilePdf weight="duotone" aria-hidden="true" />
              <h3>Analyze locally</h3>
              <p>Validate the file, fingerprint the exact bytes, and inspect real PDF structure and annotation signals page by page.</p>
            </li>
            <li>
              <span>02</span><UserFocus weight="duotone" aria-hidden="true" />
              <h3>Review what machines cannot know</h3>
              <p>Confirm meaning, reading order, alternate-text quality, table relationships, form behavior, and exceptions.</p>
            </li>
            <li>
              <span>03</span><ArrowsClockwise weight="duotone" aria-hidden="true" />
              <h3>Version, recheck, and export</h3>
              <p>Create a strictly preflighted metadata revision, preserve the original, rerun checks, and export accessible HTML plus JSON evidence.</p>
            </li>
          </ol>
        </section>

        <section className="scope-section" aria-labelledby="scope-title">
          <div className="section-heading split-heading">
            <div>
              <p className="section-label">Honest coverage</p>
              <h2 id="scope-title">Three lanes. No hidden “pass.”</h2>
            </div>
            <p>
              A green signal means only that a specific machine-detectable issue was
              not found. It never means the document is compliant or certified.
            </p>
          </div>
          <div className="scope-grid">
            <article className="scope-machine">
              <p>Machine-detected</p>
              <h3>Objective PDF signals</h3>
              <ul>
                <li>Page count and searchable text</li>
                <li>Title, language, MarkInfo, and exposed tag roles</li>
                <li>Heading-level gaps and basic list/table relationships</li>
                <li>Link and form-widget annotation properties</li>
              </ul>
            </article>
            <article className="scope-human">
              <p>Human verification</p>
              <h3>Meaning and real usability</h3>
              <ul>
                <li>Logical reading order in the target reader</li>
                <li>Heading and link purpose</li>
                <li>Alternate-text accuracy and decorative intent</li>
                <li>Table headers, keyboard flow, and field instructions</li>
              </ul>
            </article>
            <article className="scope-excluded">
              <p>Escalated / not evaluated</p>
              <h3>Specialist remediation</h3>
              <ul>
                <li>Complex tag trees and complex tables</li>
                <li>Formula semantics and STEM notation</li>
                <li>XFA, scripts, signatures, and complex forms</li>
                <li>Complete PDF/UA validation and legal applicability</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="standards" className="standards-section" aria-labelledby="standards-title">
          <div className="standards-intro">
            <p className="section-label light-label">Standards and legal context</p>
            <h2 id="standards-title">Evidence mapping—not a compliance mode.</h2>
            <p>
              Applicable duties depend on the publisher, content, jurisdiction,
              contract, exceptions, and use. ClearTag maps evidence to review targets;
              it does not turn a partial scan into a conformity claim.
            </p>
          </div>
          <div className="standards-list">
            <article>
              <span>US state and local government</span>
              <h3>Title II · WCAG 2.1 A / AA</h3>
              <p>
                Current federal deadlines are April 26, 2027 for public entities of
                50,000 or more, and April 26, 2028 for smaller entities and special
                district governments. Limited exceptions require context.
              </p>
              <a href="https://www.ada.gov/resources/small-entity-compliance-guide/" target="_blank" rel="noreferrer">DOJ small entity guide <ArrowRight aria-hidden="true" /></a>
            </article>
            <article>
              <span>US federal electronic documents</span>
              <h3>Revised Section 508 · E205</h3>
              <p>
                Covered non-web documents map to applicable WCAG 2.0 A / AA criteria.
                Supplier duties flow from agency scope, contracts, statements of work,
                and acceptance methods—not from a universal contractor claim.
              </p>
              <a href="https://www.section508.gov/buy/requiring-business-partners-provide-accessible-documents/" target="_blank" rel="noreferrer">Supplier guidance <ArrowRight aria-hidden="true" /></a>
            </article>
            <article>
              <span>PDF interoperability</span>
              <h3>PDF/UA-1 preflight signals</h3>
              <p>
                This MVP inspects selected structure signals for PDF/UA-1 context.
                It is not a complete ISO 14289-1 validator, and PDF/UA is not a legal
                certification or a substitute for semantic review.
              </p>
              <a href="https://www.iso.org/standard/64599.html" target="_blank" rel="noreferrer">ISO 14289-1:2014 <ArrowRight aria-hidden="true" /></a>
            </article>
            <article>
              <span>European public sector and selected services</span>
              <h3>EN 301 549 / WAD · EAA context</h3>
              <p>
                WAD document requirements use EN 301 549 clause 10 context. The EAA
                covers selected consumer products and services—not every PDF—and
                national scope and current harmonised standards still matter.
              </p>
              <a href="https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng" target="_blank" rel="noreferrer">European Accessibility Act <ArrowRight aria-hidden="true" /></a>
            </article>
          </div>
        </section>

        <section id="security" className="security-section" aria-labelledby="security-title">
          <div className="section-heading split-heading">
            <div>
              <p className="section-label">Privacy by architecture</p>
              <h2 id="security-title">Your document stays in this tab.</h2>
            </div>
            <p>
              The MVP has no document upload API, database, analytics event, or
              retention job. Closing or refreshing the tab clears the active review
              state from memory.
            </p>
          </div>
          <div className="security-grid">
            <article><LockKey weight="duotone" aria-hidden="true" /><h3>Local processing</h3><p>PDF bytes are parsed in-browser. Extracted text, form values, and full link targets are not written to logs or browser storage.</p></article>
            <article><ShieldCheck weight="duotone" aria-hidden="true" /><h3>Explicit deletion</h3><p>“Review another file” releases the active in-memory reference. Generated download URLs are revoked after use.</p></article>
            <article><Files weight="duotone" aria-hidden="true" /><h3>User-controlled evidence</h3><p>The evidence pack is generated locally and omits the source PDF. Downloaded files follow your organization’s retention policy.</p></article>
          </div>
          <p className="security-caveat">
            Browser, device, endpoint-security, backup, and download-folder policies
            remain under your organization’s control. Do not process files on an
            unmanaged device.
          </p>
        </section>

        <section id="pricing" className="pricing-section" aria-labelledby="pricing-title">
          <div className="section-heading split-heading">
            <div>
              <p className="section-label">Pricing placeholder</p>
              <h2 id="pricing-title">Start with the review workflow, then price the saved work.</h2>
            </div>
            <p>
              This MVP does not take payment. Pilot pricing should be based on page
              complexity, reviewer time, evidence requirements, and deployment needs.
            </p>
          </div>
          <div className="pricing-grid">
            <article><span>MVP</span><h3>Local evaluator</h3><strong>Free during validation</strong><p>Single-file browser analysis, status decisions, restricted metadata revisions, and evidence-pack export.</p><a href="#analyzer">Open analyzer</a></article>
            <article className="pricing-featured"><span>Design partner</span><h3>Team pilot</h3><strong>Scoped with your workflow</strong><p>Representative document set, reviewer playbook, ruleset feedback, and measured manual time saved.</p><a href="mailto:pilot@cleartag.invalid">Pilot contact placeholder</a></article>
            <article><span>Future</span><h3>Organization</h3><strong>Not yet offered</strong><p>Policy-controlled deployment, review assignments, retention controls, integrations, and procurement evidence.</p><span className="disabled-link">Roadmap only</span></article>
          </div>
        </section>

        <section className="final-boundary" aria-labelledby="final-boundary-title">
          <FilePdf weight="duotone" aria-hidden="true" />
          <p className="section-label light-label">The product promise</p>
          <h2 id="final-boundary-title">Evidence you can review. Decisions you can defend.</h2>
          <p>
            Not one-click compliance. Not automatic certification. Not legal advice.
            A clearer path from verifiable PDF signals to accountable human remediation.
          </p>
          <a href="#analyzer">Analyze a PDF locally <ArrowRight aria-hidden="true" /></a>
        </section>
      </main>

      <footer className="site-footer">
        <p><strong>ClearTag</strong> is a temporary working name for this MVP.</p>
        <p><LockKey aria-hidden="true" /> No server-side PDF retention in this build.</p>
      </footer>
    </div>
  );
}
