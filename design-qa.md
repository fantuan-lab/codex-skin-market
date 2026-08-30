# ClearTag Landing Page — Design QA

## Reference and implementation evidence

- Selected reference: `/Users/fantuan/.codex/generated_images/01a04e26-4ae1-73b1-a510-6c327238c985/exec-27598757-d183-4b78-bfc1-9ba886c0dc40.png` (725 × 2167)
- Desktop implementation: `test-results/cleartag-landing.png` (1440 × 7937)
- Mobile implementation: `test-results/cleartag-mobile.png` (390 × 13787)
- Normalized hero reference: `/tmp/cleartag-reference-hero-ffmpeg.png` (1280 × 742)
- In-app browser acceptance capture: `/tmp/cleartag-final-zh-desktop.png` (1280 × 720)

The source and the updated desktop implementation were inspected together in the same visual comparison pass. The mobile capture was included in the final comparison pass to verify reflow rather than treating desktop fidelity as sufficient evidence.

## Fidelity review

- **Layout:** Passed. The implementation carries forward the selected long-scroll editorial structure: restrained navigation, two-column hero with evidence UI, proof strip, audience grid, three-step workflow, product evidence anatomy, capability lanes, standards illustration, privacy, pricing, dark closing CTA, and footer. The real analyzer follows the marketing narrative intentionally so the page remains a working product rather than a static mock.
- **Typography:** Passed. Large serif editorial headlines and compact sans-serif evidence copy reproduce the source hierarchy without reducing body copy below readable product sizes. English and Chinese use appropriate system fallbacks.
- **Spacing and surfaces:** Passed. Warm ivory canvas, charcoal type, terracotta actions, pine verification states, thin borders, quiet corners, and sparse shadows match the reference direction. Section rhythm remains coherent despite the additional real analyzer and expanded standards copy.
- **Imagery and icons:** Passed. The standards volumes and closing desk/lamp scene are real generated raster assets sized for their slots. Product icons use one consistent Phosphor family; no emoji, handcrafted SVG, CSS illustration, or placeholder box substitutes are present.
- **Copy and boundaries:** Passed. Product copy remains specific to accountable PDF delivery and clearly separates machine findings, human verification, specialist escalation, evidence mapping, privacy limits, and non-certification language.

## Responsive and interaction review

- Desktop and 390 px/320 px layouts were exercised. No horizontal overflow was detected.
- Navigation anchors, language switching, hero/analyzer CTAs, fixture loading, review status, safe revision, and evidence download are covered by the browser suite.
- The selected marketing flow reflows into one column without clipped cards, overlapping text, or broken imagery. The header keeps a 44 px text CTA available on mobile, and a sticky horizontal section navigator makes the long page skimmable without a hamburger dependency.
- In-app browser acceptance on `/zh` confirmed a 1280 × 720 viewport, no horizontal overflow, and a 520 px hero followed by the complete confidence strip within the first 699 px.

## Accessibility review

- Axe checks passed on English, Chinese, mobile landing, analyzed workspace, and fail-closed remediation states with WCAG 2.2 AA tags enabled.
- Semantic headings, regions, lists, labels, alt text, keyboard focus, skip link, language state, and visible focus treatment remain present.
- Footer navigation targets now have a minimum 28 px block size and spacing; this fixed the detected WCAG 2.2 target-size failure.
- Text scaling and long Chinese copy were validated through responsive reflow tests. Motion is not required for comprehension.

## Findings resolved

1. **P1 · Standards asset absent from the first automated full-page capture.** The capture now scrolls to and decodes below-fold imagery before recording the page, while the production page keeps those assets lazy so more than 500 KB of illustration data is not fetched on the initial landing view. Final desktop and mobile captures show the labeled WCAG 2.2, PDF/UA, and Section 508 volumes.
2. **P2 · Footer touch targets were too short.** Axe measured 15.5 px height and 23 px safe spacing. Links now use an inline-flex 28 px minimum height with vertical padding; the full E2E accessibility suite passes.
3. **P2 · Landing assertion matched repeated legal-boundary copy.** The test now scopes the intended statement to the hero boundary note, preserving the purposeful reminder beside the real analyzer.
4. **P1 · Static evidence UI could be mistaken for fixture output.** The reference-inspired preview originally reused a real fixture name beside invented page and hash values. Both hero and evidence-anatomy previews now state that they are illustrative and not scan output, use a non-fixture filename, and avoid a fake source hash. The real analyzer remains the only place that presents results derived from PDF bytes.
5. **P2 · Pilot placeholder opened an unusable address.** The pricing placeholder no longer exposes a fake `.invalid` mail link. It is presented as a non-interactive, clearly labeled coming-soon state.
6. **P1 · Desktop proof strip fell below the initial viewport.** The hero was reduced from a 650+ px presentation to a measured 520 px composition. At 1280 × 720 the hero spans y=72–592 and the full proof strip spans y=592–699, matching the selected reference's first-screen rhythm.
7. **P2 · Illustrative issue detail lacked an auditable evidence hierarchy.** The hero preview now includes explicit location and detection-method fields, keeps machine and human states visually distinct, and remains labeled as illustrative rather than scan output.
8. **P2 · Narrow-screen navigation and touch affordances were weak.** The 320 px header now retains a compact “Analyze” action, exposes 44 px language/action targets, and adds a sticky section navigator for workflow, standards, security, pricing, and analyzer anchors. Supporting text sizes were raised where the earlier mobile pass was too small.
9. **P2 · Below-fold visual assets competed with initial landing work.** Standards books and the closing desk scene now load lazily; the closing illustration is a real image element rather than a CSS background, preserving deferred loading and accessible rendering behavior.
10. **P1 · Closing-section label failed contrast after the palette refinement.** The label now uses a light warm neutral against the pine background; the English, Chinese, and mobile axe passes report no WCAG 2.2 AA violations.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit` — 55 tests
- `npm run build`
- `node --test tests/rendered-html.test.mjs` — 2 tests
- `npm run test:e2e` — 5 tests
- In-app browser acceptance at `http://localhost:3000/zh`

final result: passed
