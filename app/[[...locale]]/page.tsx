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
import { notFound } from "next/navigation";
import { getUiCopy, type Locale } from "@/lib/i18n";

type LocaleParams = { locale?: string[] };

const audienceIcons = [Handshake, GraduationCap, Buildings, Files];
const workflowIcons = [FilePdf, UserFocus, ArrowsClockwise];
const securityIcons = [LockKey, ShieldCheck, Files];
const standardLinks = [
  "https://www.ada.gov/resources/small-entity-compliance-guide/",
  "https://www.section508.gov/buy/requiring-business-partners-provide-accessible-documents/",
  "https://www.iso.org/standard/64599.html",
  "https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng",
];

export const dynamicParams = false;

export function generateStaticParams(): LocaleParams[] {
  return [{ locale: [] }, { locale: ["zh"] }];
}

function resolveLocale({ locale }: LocaleParams): Locale {
  if (!locale || locale.length === 0) return "en";
  if (locale.length === 1 && locale[0] === "zh") return "zh";
  notFound();
}

export default async function Home({
  params,
}: Readonly<{ params: Promise<LocaleParams> }>) {
  const locale = resolveLocale(await params);
  const copy = getUiCopy(locale);

  return (
    <>
      <section className="confidence-strip" aria-label={copy.confidence.aria}>
        {copy.confidence.items.map((item) => (
          <div key={item.value}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="audience-section" aria-labelledby="audience-title">
        <div className="section-heading split-heading">
          <div>
            <p className="section-label">{copy.audience.label}</p>
            <h2 id="audience-title">{copy.audience.title}</h2>
          </div>
          <p>{copy.audience.intro}</p>
        </div>
        <div className="audience-grid">
          {copy.audience.cards.map((card, index) => {
            const Icon = audienceIcons[index];
            return (
              <article key={card.title}>
                <Icon weight="duotone" aria-hidden="true" />
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            );
          })}
        </div>
        <p className="document-types">{copy.audience.documentTypes}</p>
      </section>

      <section
        id="workflow"
        className="workflow-section"
        aria-labelledby="workflow-title"
      >
        <div className="section-heading">
          <p className="section-label">{copy.workflow.label}</p>
          <h2 id="workflow-title">{copy.workflow.title}</h2>
          <p>{copy.workflow.intro}</p>
        </div>
        <ol className="workflow-steps">
          {copy.workflow.steps.map((step, index) => {
            const Icon = workflowIcons[index];
            return (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <Icon weight="duotone" aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="scope-section" aria-labelledby="scope-title">
        <div className="section-heading split-heading">
          <div>
            <p className="section-label">{copy.scope.label}</p>
            <h2 id="scope-title">{copy.scope.title}</h2>
          </div>
          <p>{copy.scope.intro}</p>
        </div>
        <div className="scope-grid">
          {copy.scope.lanes.map((lane, index) => (
            <article
              className={["scope-machine", "scope-human", "scope-excluded"][index]}
              key={lane.title}
            >
              <p>{lane.label}</p>
              <h3>{lane.title}</h3>
              <ul>
                {lane.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        id="standards"
        className="standards-section"
        aria-labelledby="standards-title"
      >
        <div className="standards-intro">
          <p className="section-label light-label">{copy.standards.label}</p>
          <h2 id="standards-title">{copy.standards.title}</h2>
          <p>{copy.standards.intro}</p>
        </div>
        <div className="standards-list">
          {copy.standards.cards.map((card, index) => (
            <article key={card.title}>
              <span>{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
              <a href={standardLinks[index]} target="_blank" rel="noreferrer">
                {card.link} <ArrowRight aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section
        id="security"
        className="security-section"
        aria-labelledby="security-title"
      >
        <div className="section-heading split-heading">
          <div>
            <p className="section-label">{copy.security.label}</p>
            <h2 id="security-title">{copy.security.title}</h2>
          </div>
          <p>{copy.security.intro}</p>
        </div>
        <div className="security-grid">
          {copy.security.cards.map((card, index) => {
            const Icon = securityIcons[index];
            return (
              <article key={card.title}>
                <Icon weight="duotone" aria-hidden="true" />
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            );
          })}
        </div>
        <p className="security-caveat">{copy.security.caveat}</p>
      </section>

      <section id="pricing" className="pricing-section" aria-labelledby="pricing-title">
        <div className="section-heading split-heading">
          <div>
            <p className="section-label">{copy.pricing.label}</p>
            <h2 id="pricing-title">{copy.pricing.title}</h2>
          </div>
          <p>{copy.pricing.intro}</p>
        </div>
        <div className="pricing-grid">
          {copy.pricing.cards.map((card, index) => (
            <article className={index === 1 ? "pricing-featured" : undefined} key={card.title}>
              <span>{card.label}</span>
              <h3>{card.title}</h3>
              <strong>{card.price}</strong>
              <p>{card.copy}</p>
              {index === 0 ? (
                <a href="#analyzer">{card.action}</a>
              ) : index === 1 ? (
                <a href="mailto:pilot@cleartag.invalid">{card.action}</a>
              ) : (
                <span className="disabled-link">{card.action}</span>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="final-boundary" aria-labelledby="final-boundary-title">
        <FilePdf weight="duotone" aria-hidden="true" />
        <p className="section-label light-label">{copy.finalBoundary.label}</p>
        <h2 id="final-boundary-title">{copy.finalBoundary.title}</h2>
        <p>{copy.finalBoundary.copy}</p>
        <a href="#analyzer">
          {copy.finalBoundary.action} <ArrowRight aria-hidden="true" />
        </a>
      </section>
    </>
  );
}
