"use client";

import {
  ArrowLeft,
  LockKey,
  SignOut,
  Tag,
} from "@phosphor-icons/react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { getUiCopy, type Locale } from "@/lib/i18n";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { type BillingSummary } from "./BillingPanel";

export function WorkspaceShell({
  children,
  locale,
  userEmail,
  billing,
}: Readonly<{
  children: ReactNode;
  locale: Locale;
  userEmail: string;
  billing: BillingSummary;
}>) {
  const copy = getUiCopy(locale);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const homeHref = locale === "zh" ? "/zh" : "/";
  const billingHref = locale === "zh" ? "/zh/billing" : "/billing";

  const handleSignOut = async () => {
    if (isSigningOut) return;
    const client = createBrowserSupabaseClient();
    if (!client) {
      setSignOutError(copy.account.signOutError);
      return;
    }

    setIsSigningOut(true);
    setSignOutError(null);
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      window.location.assign(homeHref);
    } catch {
      setSignOutError(copy.account.signOutError);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="account-workspace-shell">
      <a className="skip-link" href="#workspace-main">
        {copy.account.skip}
      </a>

      <header className="workspace-site-header">
        <Link className="brand" href={homeHref} aria-label={copy.account.brandAria}>
          <span className="brand-mark" aria-hidden="true">
            <Tag weight="fill" />
          </span>
          <span className="brand-copy">
            <strong>ClearTag</strong>
          </span>
        </Link>

        <div className="workspace-account-controls" aria-label={copy.account.accountMenuAria}>
          <div className="workspace-identity">
            <span>{copy.account.signedInAs}</span>
            <strong>{userEmail}</strong>
          </div>
          <Link
            className="workspace-billing-link"
            href={billingHref}
            target="_blank"
            rel="noopener"
            aria-label={`${copy.billing.manageShort}. ${copy.billing.preserveReview}`}
          >
            <span>{copy.billing.workspacePlan}</span>
            <strong>
              {billing.status === "unavailable"
                ? copy.billing.status.unavailable
                : billing.plan === "pro"
                  ? copy.billing.pro
                  : copy.billing.free}
            </strong>
            <small>{copy.billing.manageShort}</small>
          </Link>
          <nav className="auth-language-switcher" aria-label={copy.locale.switchLabel}>
            <Link
              href="/workspace"
              hrefLang="en"
              lang="en"
              aria-current={locale === "en" ? "page" : undefined}
              title={copy.locale.changeToEnglish}
            >
              {copy.locale.english}
            </Link>
            <Link
              href="/zh/workspace"
              hrefLang="zh-CN"
              lang="zh-CN"
              aria-current={locale === "zh" ? "page" : undefined}
              title={copy.locale.changeToChinese}
            >
              {copy.locale.chinese}
            </Link>
          </nav>
          <button
            className="workspace-sign-out"
            type="button"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            <SignOut aria-hidden="true" />
            {isSigningOut ? copy.account.signingOut : copy.account.signOut}
          </button>
        </div>
      </header>

      <main className="account-workspace-main" id="workspace-main">
        <section className="workspace-welcome" aria-labelledby="workspace-page-title">
          <div>
            <p className="section-label">{copy.account.eyebrow}</p>
            <h1 id="workspace-page-title">{copy.account.title}</h1>
            <p>{copy.account.intro}</p>
          </div>
          <div className="workspace-local-note">
            <span><LockKey weight="duotone" aria-hidden="true" /> {copy.account.localBadge}</span>
            <p>{copy.account.localNote}</p>
          </div>
        </section>

        {signOutError ? (
          <p className="workspace-auth-error" role="alert" aria-live="assertive">
            {signOutError}
          </p>
        ) : null}

        {children}

        <Link className="workspace-landing-link" href={homeHref}>
          <ArrowLeft aria-hidden="true" /> {copy.account.landing}
        </Link>
      </main>
    </div>
  );
}
