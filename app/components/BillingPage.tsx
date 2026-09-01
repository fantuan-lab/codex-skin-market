import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getUiCopy, type Locale } from "@/lib/i18n";
import { BillingPanel, type BillingSummary } from "./BillingPanel";

export function BillingPage({
  locale,
  summary,
}: Readonly<{
  locale: Locale;
  summary: BillingSummary;
}>) {
  const copy = getUiCopy(locale).billing;
  const homeHref = locale === "zh" ? "/zh" : "/";

  return (
    <main className="billing-page-main" id="main-content">
      <div className="billing-page-toolbar">
        <Link className="billing-back-link" href={homeHref}>
          <ArrowLeft aria-hidden="true" /> ClearTag
        </Link>
        <nav className="auth-language-switcher" aria-label={copy.languageAria}>
          <Link
            href="/billing"
            hrefLang="en"
            lang="en"
            aria-current={locale === "en" ? "page" : undefined}
          >
            English
          </Link>
          <Link
            href="/zh/billing"
            hrefLang="zh-CN"
            lang="zh-CN"
            aria-current={locale === "zh" ? "page" : undefined}
          >
            中文
          </Link>
        </nav>
      </div>
      <div className="billing-page-heading">
        <p className="section-label">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </div>
      <BillingPanel locale={locale} summary={summary} />
    </main>
  );
}
