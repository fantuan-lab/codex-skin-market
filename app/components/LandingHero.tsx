import {
  ArrowRight,
  CheckCircle,
  FilePdf,
  Fingerprint,
  ShieldCheck,
  UserFocus,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getUiCopy, type Locale } from "@/lib/i18n";

export function LandingHero({
  locale,
  workspaceHref,
}: Readonly<{
  locale: Locale;
  workspaceHref: "/workspace" | "/zh/workspace";
}>) {
  const copy = getUiCopy(locale);

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">
          <span aria-hidden="true" /> {copy.hero.eyebrow}
        </p>
        <h1 id="hero-title">{copy.hero.title}</h1>
        <p className="hero-lead">{copy.hero.lead}</p>
        <div className="hero-actions">
          <Link className="hero-primary-action" href={workspaceHref}>
            {copy.hero.primaryAction} <ArrowRight aria-hidden="true" />
          </Link>
          <a className="hero-secondary-action" href="#workflow">
            {copy.hero.secondaryAction} <ArrowRight aria-hidden="true" />
          </a>
        </div>
        <ul className="hero-points" aria-label={copy.hero.boundariesAria}>
          {copy.hero.boundaries.map((boundary) => (
            <li key={boundary}>
              <CheckCircle weight="fill" aria-hidden="true" /> {boundary}
            </li>
          ))}
        </ul>
        <p className="boundary-note">
          <ShieldCheck weight="duotone" aria-hidden="true" />{" "}
          {copy.hero.boundaryNote}
        </p>
      </div>

      <aside className="hero-preview" aria-label={copy.hero.preview.aria}>
        <div className="preview-topline">
          <span>{copy.hero.preview.label}</span>
          <span>{copy.hero.preview.pageCount}</span>
        </div>
        <div className="preview-document">
          <FilePdf weight="duotone" aria-hidden="true" />
          <strong>{copy.hero.preview.fileName}</strong>
        </div>
        <div className="preview-body">
          <div className="preview-queue" aria-label={copy.hero.preview.aria}>
            {copy.hero.preview.rows.map((row, index) => (
              <div
                className={index === 0 ? "is-selected" : undefined}
                key={row.label}
              >
                {index === 0 ? (
                  <CheckCircle weight="fill" aria-hidden="true" />
                ) : (
                  <UserFocus weight="duotone" aria-hidden="true" />
                )}
                <span>
                  <strong>{row.label}</strong>
                  <small>{row.status}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="preview-detail">
            <span>{copy.hero.preview.selectedFinding}</span>
            <h2>{copy.hero.preview.title}</h2>
            <p>{copy.hero.preview.copy}</p>
            <dl className="preview-evidence">
              <div>
                <dt>{copy.hero.preview.locationLabel}</dt>
                <dd>{copy.hero.preview.location}</dd>
              </div>
              <div>
                <dt>{copy.hero.preview.methodLabel}</dt>
                <dd>{copy.hero.preview.method}</dd>
              </div>
            </dl>
            <strong>
              <CheckCircle weight="fill" aria-hidden="true" />
              {copy.hero.preview.reviewer}
            </strong>
          </div>
        </div>
        <div className="preview-footer">
          <Fingerprint aria-hidden="true" />
          <span>{copy.hero.preview.fingerprint}</span>
        </div>
      </aside>
    </section>
  );
}
