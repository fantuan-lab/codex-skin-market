import {
  ArrowLeft,
  CheckCircle,
  LockKey,
  ShieldCheck,
  Tag,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { safeReturnPath } from "@/lib/auth/paths";
import { getUiCopy, type Locale } from "@/lib/i18n";
import { AuthForm } from "./AuthForm";

type CallbackErrorCode =
  | "access_denied"
  | "exchange_failed"
  | "missing_code"
  | "not_configured";

function loginHref(
  locale: Locale,
  next: string,
  error?: CallbackErrorCode,
): string {
  const pathname = locale === "zh" ? "/zh/login" : "/login";
  const params = new URLSearchParams({ returnTo: next });
  if (error) params.set("error", error);
  return `${pathname}?${params.toString()}`;
}

function normalizeCallbackError(value: string | undefined): CallbackErrorCode | undefined {
  switch (value) {
    case "access_denied":
    case "exchange_failed":
    case "missing_code":
    case "not_configured":
      return value;
    default:
      return undefined;
  }
}

function localizedProtectedPath(next: string, targetLocale: Locale): string {
  const defaultRoot = targetLocale === "zh" ? "/zh/workspace" : "/workspace";
  const rootPairs =
    targetLocale === "zh"
      ? [
          ["/workspace", "/zh/workspace"],
          ["/billing", "/zh/billing"],
        ]
      : [
          ["/zh/workspace", "/workspace"],
          ["/zh/billing", "/billing"],
        ];

  for (const [sourceRoot, targetRoot] of rootPairs) {
    if (matchesProtectedRoot(next, sourceRoot)) {
      return safeReturnPath(
        `${targetRoot}${next.slice(sourceRoot.length)}`,
        defaultRoot,
      );
    }
    if (matchesProtectedRoot(next, targetRoot)) {
      return safeReturnPath(next, defaultRoot);
    }
  }
  return defaultRoot;
}

function matchesProtectedRoot(value: string, root: string): boolean {
  return (
    value === root ||
    value.startsWith(`${root}/`) ||
    value.startsWith(`${root}?`) ||
    value.startsWith(`${root}#`)
  );
}

function callbackErrorMessage(
  copy: ReturnType<typeof getUiCopy>["auth"],
  error: CallbackErrorCode | undefined,
): string | undefined {
  if (error === "access_denied") return copy.callbackErrors.accessDenied;
  if (error === "not_configured") return copy.callbackErrors.notConfigured;
  if (error === "missing_code" || error === "exchange_failed") {
    return copy.callbackErrors.incomplete;
  }
  return undefined;
}

export function AuthPage({
  locale,
  next,
  error,
}: Readonly<{
  locale: Locale;
  next?: string;
  error?: string;
}>) {
  const copy = getUiCopy(locale);
  const homeHref = locale === "zh" ? "/zh" : "/";
  const safeNext = safeReturnPath(
    next,
    locale === "zh" ? "/zh/workspace" : "/workspace",
  );
  const callbackError = normalizeCallbackError(error);
  const initialError = callbackErrorMessage(copy.auth, callbackError);
  const englishNext = localizedProtectedPath(safeNext, "en");
  const chineseNext = localizedProtectedPath(safeNext, "zh");

  return (
    <div className="auth-page-shell">
      <a className="skip-link" href="#auth-main">
        {copy.navigation.skip}
      </a>

      <header className="auth-page-header">
        <Link className="brand" href={homeHref} aria-label={copy.auth.backHome}>
          <span className="brand-mark" aria-hidden="true">
            <Tag weight="fill" />
          </span>
          <span className="brand-copy">
            <strong>ClearTag</strong>
          </span>
        </Link>

        <nav className="auth-language-switcher" aria-label={copy.auth.languageAria}>
          <Link
            href={loginHref("en", englishNext, callbackError)}
            hrefLang="en"
            lang="en"
            aria-current={locale === "en" ? "page" : undefined}
            title={copy.locale.changeToEnglish}
          >
            {copy.locale.english}
          </Link>
          <Link
            href={loginHref("zh", chineseNext, callbackError)}
            hrefLang="zh-CN"
            lang="zh-CN"
            aria-current={locale === "zh" ? "page" : undefined}
            title={copy.locale.changeToChinese}
          >
            {copy.locale.chinese}
          </Link>
        </nav>
      </header>

      <main className="auth-main" id="auth-main">
        <section className="auth-introduction" aria-labelledby="auth-title">
          <Link className="auth-back-link" href={homeHref}>
            <ArrowLeft aria-hidden="true" /> {copy.auth.backHome}
          </Link>
          <p className="section-label">{copy.auth.eyebrow}</p>
          <h1 id="auth-title">{copy.auth.title}</h1>
          <p className="auth-lead">{copy.auth.intro}</p>

          <div className="auth-privacy-panel" aria-labelledby="auth-privacy-title">
            <div className="auth-privacy-heading">
              <ShieldCheck weight="duotone" aria-hidden="true" />
              <h2 id="auth-privacy-title">{copy.auth.privacyTitle}</h2>
            </div>
            <ul>
              <li>
                <CheckCircle weight="fill" aria-hidden="true" />
                <span>{copy.auth.accountPrivacy}</span>
              </li>
              <li>
                <CheckCircle weight="fill" aria-hidden="true" />
                <span>{copy.auth.pdfPrivacy}</span>
              </li>
              <li>
                <CheckCircle weight="fill" aria-hidden="true" />
                <span>{copy.auth.googlePrivacy}</span>
              </li>
            </ul>
            <p>
              <LockKey aria-hidden="true" /> {copy.auth.securityNote}
            </p>
          </div>
        </section>

        <section className="auth-card" aria-label={copy.auth.formAria}>
          <div className="auth-card-brand" aria-hidden="true">
            <span><Tag weight="fill" /></span>
            <strong>ClearTag</strong>
          </div>
          <AuthForm initialError={initialError} locale={locale} next={safeNext} />
        </section>
      </main>
    </div>
  );
}
