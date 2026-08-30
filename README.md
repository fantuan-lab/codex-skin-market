# ClearTag PDF accessibility MVP

ClearTag is an evidence-first, local-browser workflow for guided PDF accessibility remediation. It analyzes real PDF structure and metadata, separates machine-detected signals from human verification and unevaluated coverage, records reviewer decisions, permits only narrowly scoped metadata writeback, and exports an accessible remediation evidence pack.

This is an MVP—not a compliance certificate, automatic certification service, or legal opinion. The first release accepts PDFs from 1–100 pages (up to 50 MB), prioritizes text-based documents, and flags image-only pages for an external OCR workflow.

## Run and verify

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The default workflow processes the PDF in the browser; it has no upload API or server-side PDF store.

Run the complete local gate with:

```bash
npm run verify
```

The gate includes TypeScript, ESLint, deterministic PDF fixture tests, a production build and server-render test, and Chrome E2E/axe checks. The E2E suite uses port `43172` so it does not collide with the normal development server.

## What the analyzer records

- File SHA-256, version, date, selected evidence mappings, and declared method limits.
- OCR risk, Title and language metadata, usable structure exposure, headings, lists, links, Figure alternate-description signals, reading-order risk, basic table structure, form tooltip/name signals, and extractable-text encoding signals.
- Page/location, severity, evidence, method, guided next steps, standards mapping, reviewer status, and status history for each finding.
- Explicit manual-review and not-evaluated records for semantics the parser cannot establish.

The analyzer does not persist PDF body text, form values, or complete link targets. Selected metadata, aggregate signals, and reviewer notes live in the current tab and in an evidence pack only when the reviewer downloads it. Refreshing or closing the tab clears the working state.

## Restricted writeback

The only implemented automatic changes are a document Title, primary language tag, and revision modification date. ClearTag writes a separately serialized PDF, never overwrites the original, reopens the result, checks the exact input fingerprint, compares protected document objects and page geometry, reruns analysis, and records before/after evidence. This is a restricted metadata revision—not a claim that only metadata bytes changed, that every PDF feature was preserved, or that the output is undamaged.

Writeback authorization never relies on analyzer booleans. The real input bytes are loaded again with strict invalid-object handling and scanned fail-closed. Any inconclusive analyzer safety probe, malformed or unresolved object, encryption, tags or MarkInfo, annotations, actions, name trees, attachments, outlines, XMP, forms/XFA, signatures/permissions, images, Form XObjects, rich media, or other unsupported structure disables revision creation. Tag trees, figures, lists, complex tables, formulas, OCR, and interactive forms are never auto-repaired by this MVP.

## Evidence mappings and legal boundary

Profiles organize findings; they do not turn an automated scan into a conformance result.

- WCAG 2.1 A/AA with informative W3C PDF-technique references.
- Revised Section 508 electronic-document context using the applicable WCAG 2.0 A/AA baseline and procurement-specific evidence notes.
- PDF/UA-1 (ISO 14289-1:2014) preflight signals only—not full syntax or semantic validation.
- EN 301 549 v3.2.1 clause 10 and Web Accessibility Directive context.
- Optional European Accessibility Act context for selected covered products and services; it is not presented as applying to every PDF.

Authoritative context used for the product copy:

- [ADA Title II small-entity compliance guide](https://www.ada.gov/resources/small-entity-compliance-guide/)
- [Section 508 supplier document requirements](https://www.section508.gov/buy/requiring-business-partners-provide-accessible-documents/)
- [Section 508 accessibility test report elements](https://www.section508.gov/test/elements-of-an-accessibility-test-report/)
- [EU Web Accessibility Directive](https://eur-lex.europa.eu/eli/dir/2016/2102/oj/eng)
- [European Accessibility Act](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng)

## Real PDF fixtures

`public/fixtures/manifest.json` documents the expected signals for:

- `well-tagged-basic.pdf`: a small tagged, titled, language-declared PDF with headings, a list, a Figure alternate description, a table, and a link. It is an analyzer fixture, not a certified document.
- `known-accessibility-issues.pdf`: text content with missing metadata/tags, visual list/table patterns, and an AcroForm Widget without a tooltip.
- `image-only-scan.pdf`: a raster-only page that produces an OCR-risk signal without pretending OCR was performed.

Regenerate them with `npm run fixtures:generate` only when fixture expectations intentionally change.

## Architecture notes

- Next.js/React UI compiled by the repository's existing Vinext/Vite/Cloudflare Sites stack.
- PDF.js for parsing, page signals, annotations, and structure-tree exposure.
- pdf-lib for strictly preflighted, restricted metadata revision output.
- JSZip for accessible HTML, machine-readable JSON, and README evidence packs.
- Vitest for analyzer/remediation integration tests and Playwright + axe-core for browser acceptance.

The pre-existing theme-package directories remain in the repository but are outside this product branch's web runtime and delivery scope.
