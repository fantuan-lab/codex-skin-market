"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseBillingView,
  UNAVAILABLE_BILLING_VIEW,
} from "@/lib/billing/public";
import { getUiCopy, type Locale } from "@/lib/i18n";
import { type BillingSummary } from "./BillingPanel";
import { PdfExperience } from "./PdfExperience";
import { WorkspaceShell } from "./WorkspaceShell";

const FREE_BILLING_SUMMARY: BillingSummary = {
  plan: "free",
  status: "free",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  hasProAccess: false,
  planKey: null,
  trialEligible: true,
};

export function AuthenticatedWorkspace({
  locale,
  userEmail,
  billing = FREE_BILLING_SUMMARY,
}: Readonly<{
  locale: Locale;
  userEmail: string;
  billing?: BillingSummary;
}>) {
  const copy = getUiCopy(locale).billing;
  const [currentBilling, setCurrentBilling] = useState(billing);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const currentBillingRef = useRef(billing);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const refreshBilling = useCallback(() => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const request = (async () => {
      const failClosed = () => {
        currentBillingRef.current = UNAVAILABLE_BILLING_VIEW;
        setCurrentBilling(UNAVAILABLE_BILLING_VIEW);
        setBillingNotice(null);
      };
      try {
        const response = await fetch("/api/billing/summary", {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        if (!response.ok) {
          failClosed();
          return;
        }
        const nextBilling = parseBillingView(await response.json());
        if (!nextBilling) {
          failClosed();
          return;
        }
        const previousBilling = currentBillingRef.current;
        currentBillingRef.current = nextBilling;
        setCurrentBilling(nextBilling);
        if (!previousBilling.hasProAccess && nextBilling.hasProAccess) {
          setBillingNotice(copy.entitlementRefreshed);
        }
      } catch {
        failClosed();
      } finally {
        refreshPromiseRef.current = null;
      }
    })();
    refreshPromiseRef.current = request;
    return request;
  }, [copy.entitlementRefreshed]);

  useEffect(() => {
    const handleFocus = () => void refreshBilling();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshBilling();
    };
    const channel =
      "BroadcastChannel" in window
        ? new BroadcastChannel("cleartag-billing")
        : null;
    channel?.addEventListener("message", handleFocus);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      channel?.close();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshBilling]);

  return (
    <WorkspaceShell locale={locale} userEmail={userEmail} billing={currentBilling}>
      {billingNotice ? (
        <p className="workspace-billing-notice" role="status" aria-live="polite">
          {billingNotice}
        </p>
      ) : null}
      <PdfExperience
        key="pdf-experience"
        locale={locale}
        hasProAccess={currentBilling.hasProAccess}
      />
    </WorkspaceShell>
  );
}
