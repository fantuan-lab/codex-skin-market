"use client";

import { ArrowRight, LockKey, Tag } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { getUiCopy, type Locale } from "@/lib/i18n";
import { PdfExperience } from "./PdfExperience";

function localeFromPathname(pathname: string, fallback: Locale): Locale {
  if (pathname === "/zh" || pathname.startsWith("/zh/")) return "zh";
  if (pathname === "/") return "en";
  return fallback;
}

export function AppShell({
  children,
  initialLocale,
}: Readonly<{
  children: ReactNode;
  initialLocale: Locale;
}>) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname, initialLocale);
  const copy = getUiCopy(locale);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        {copy.navigation.skip}
      </a>

      <header className="topbar">
        <a className="brand" href="#top" aria-label={copy.navigation.brandAria}>
          <span className="brand-mark" aria-hidden="true">
            <Tag weight="fill" />
          </span>
          <span className="brand-copy">
            <strong>ClearTag</strong>
            <small>{copy.navigation.tagline}</small>
          </span>
        </a>

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
          <a className="header-cta" href="#analyzer">
            {copy.navigation.openAnalyzer} <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="main-content">
        <PdfExperience locale={locale}>{children}</PdfExperience>
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
