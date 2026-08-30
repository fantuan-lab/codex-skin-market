import { ArrowRight, LockKey, Tag } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { getUiCopy, type Locale } from "@/lib/i18n";

export function AppShell({
  children,
  locale,
}: Readonly<{
  children: ReactNode;
  locale: Locale;
}>) {
  const copy = getUiCopy(locale);
  const landingHref = locale === "zh" ? "/zh" : "/";
  const workspaceHref = locale === "zh" ? "/zh/workspace" : "/workspace";

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        {copy.navigation.skip}
      </a>

      <header className="topbar">
        <Link
          className="brand"
          href={`${landingHref}#top`}
          aria-label={copy.navigation.brandAria}
        >
          <span className="brand-mark" aria-hidden="true">
            <Tag weight="fill" />
          </span>
          <span className="brand-copy">
            <strong>ClearTag</strong>
            <small>{copy.navigation.tagline}</small>
          </span>
        </Link>

        <nav aria-label={copy.navigation.primaryAria}>
          <a href="#workflow">{copy.navigation.workflow}</a>
          <a href="#standards">{copy.navigation.standards}</a>
          <a href="#security">{copy.navigation.security}</a>
          <a href="#pricing">{copy.navigation.pricing}</a>
        </nav>

        <div className="topbar-actions">
          <nav className="language-switcher" aria-label={copy.locale.switchLabel}>
            <Link
              href="/"
              hrefLang="en"
              lang="en"
              scroll={false}
              aria-current={locale === "en" ? "page" : undefined}
              title={copy.locale.changeToEnglish}
            >
              {copy.locale.english}
            </Link>
            <Link
              href="/zh"
              hrefLang="zh-CN"
              lang="zh-CN"
              scroll={false}
              aria-current={locale === "zh" ? "page" : undefined}
              title={copy.locale.changeToChinese}
            >
              {copy.locale.chinese}
            </Link>
          </nav>
          <Link
            className="header-cta"
            href={workspaceHref}
            aria-label={copy.navigation.openAnalyzer}
          >
            <span className="header-cta-label">{copy.navigation.openAnalyzer}</span>
            <span className="header-cta-short" aria-hidden="true">
              {copy.navigation.openAnalyzerShort}
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </header>

      <nav className="mobile-section-nav" aria-label={copy.navigation.mobileAria}>
        <a href="#workflow">{copy.navigation.workflow}</a>
        <a href="#standards">{copy.navigation.standards}</a>
        <a href="#security">{copy.navigation.security}</a>
        <a href="#pricing">{copy.navigation.pricing}</a>
        <Link href={workspaceHref}>{copy.navigation.openAnalyzerShort}</Link>
      </nav>

      <main id="main-content">
        {children}
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true">
            <Tag weight="fill" />
          </span>
          <div>
            <strong>ClearTag</strong>
            <p>{copy.footer.workingName}</p>
          </div>
        </div>
        <nav aria-label={copy.footer.navigationAria}>
          <a href="#workflow">{copy.navigation.workflow}</a>
          <a href="#standards">{copy.navigation.standards}</a>
          <a href="#security">{copy.navigation.security}</a>
          <a href="#pricing">{copy.navigation.pricing}</a>
        </nav>
        <p className="footer-retention">
          <LockKey aria-hidden="true" /> {copy.footer.retention}
        </p>
      </footer>
    </div>
  );
}
