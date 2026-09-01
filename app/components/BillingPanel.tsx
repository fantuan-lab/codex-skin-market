"use client";

import { CheckCircle, CreditCard, SpinnerGap } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  type BillingPlan,
  type BillingPlanKey,
  type BillingStatus,
  type BillingView,
  parseBillingView,
} from "@/lib/billing/public";
import { getUiCopy, type Locale } from "@/lib/i18n";

/** Serializable billing state passed from a Server Component. */
export type BillingSummary = BillingView;
export type { BillingPlan, BillingPlanKey, BillingStatus };

export function BillingPanel({
  locale,
  summary,
}: Readonly<{
  locale: Locale;
  summary: BillingSummary;
}>) {
  const copy = getUiCopy(locale).billing;
  const [currentSummary, setCurrentSummary] = useState(summary);
  const [planKey, setPlanKey] = useState<BillingPlanKey>("annual");
  const [pending, setPending] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestInFlightRef = useRef(false);
  const workspaceHref = locale === "zh" ? "/zh/workspace" : "/workspace";
  const billingUnavailable = currentSummary.status === "unavailable";
  const canStartCheckout =
    currentSummary.status === "free" || currentSummary.status === "inactive";
  const activePrice =
    currentSummary.planKey === "annual"
      ? copy.annualPrice
      : currentSummary.planKey === "monthly"
        ? copy.monthlyPrice
        : null;
  const renewalCopy = currentSummary.trialEligible
    ? planKey === "annual"
      ? copy.annualRenewal
      : copy.monthlyRenewal
    : planKey === "annual"
      ? copy.annualImmediateRenewal
      : copy.monthlyImmediateRenewal;

  useEffect(() => {
    const url = new URL(window.location.href);
    const billingResult = url.searchParams.get("billing");
    if (billingResult !== "success" && billingResult !== "cancelled") return;

    url.searchParams.delete("billing");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

    if (billingResult === "cancelled") {
      queueMicrotask(() => setNotice(copy.checkoutCancelled));
      return;
    }

    let stopped = false;
    let timeoutId: number | undefined;
    const refreshAfterCheckout = async (attempt: number) => {
      const refreshed = await fetchBillingSummary();
      if (stopped) return;
      if (refreshed?.hasProAccess) {
        setCurrentSummary(refreshed);
        setNotice(copy.checkoutSuccess);
        if ("BroadcastChannel" in window) {
          const channel = new BroadcastChannel("cleartag-billing");
          channel.postMessage({ type: "billing-updated" });
          channel.close();
        }
        return;
      }
      if (attempt < 5) {
        timeoutId = window.setTimeout(
          () => void refreshAfterCheckout(attempt + 1),
          900,
        );
      } else {
        setNotice(copy.checkoutSuccessPending);
      }
    };
    void refreshAfterCheckout(0);
    return () => {
      stopped = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [copy.checkoutCancelled, copy.checkoutSuccess, copy.checkoutSuccessPending]);

  const openBilling = async (kind: "checkout" | "portal") => {
    if (requestInFlightRef.current || billingUnavailable) return;
    requestInFlightRef.current = true;
    setPending(kind);
    setError(null);
    // This request token is stable for one attempt. The server separately uses
    // a stable purchase-intent key as the financial idempotency boundary.
    const idempotencyKey = kind === "checkout" ? crypto.randomUUID() : null;

    try {
      const response = await fetch(
        kind === "checkout" ? "/api/billing/checkout" : "/api/billing/portal",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
          },
          body:
            kind === "checkout"
              ? JSON.stringify({ planKey, locale })
              : JSON.stringify({ locale }),
        },
      );
      const payload = (await response.json().catch(() => null)) as { url?: string } | null;
      if (!response.ok || !payload?.url) {
        if (response.status === 401) setError(copy.sessionExpired);
        else if (response.status === 409) setError(copy.checkoutConflict);
        else setError(kind === "checkout" ? copy.checkoutError : copy.portalError);
        requestInFlightRef.current = false;
        setPending(null);
        return;
      }
      window.location.assign(payload.url);
    } catch {
      requestInFlightRef.current = false;
      setError(kind === "checkout" ? copy.checkoutError : copy.portalError);
      setPending(null);
    }
  };

  const showManage =
    currentSummary.status !== "free" && currentSummary.status !== "unavailable";

  return (
    <section className="billing-panel" aria-labelledby="billing-plan-title" aria-busy={pending !== null}>
      <div className="billing-current">
        <p className="section-label">{copy.planLabel}</p>
        <h2 id="billing-plan-title">
          {billingUnavailable
            ? copy.status.unavailable
            : currentSummary.plan === "pro"
              ? copy.pro
              : copy.free}
        </h2>
        <dl>
          <div>
            <dt>{copy.statusLabel}</dt>
            <dd>{copy.status[currentSummary.status]}</dd>
          </div>
          {currentSummary.currentPeriodEnd ? (
            <div>
              <dt>{copy.periodLabel}</dt>
              <dd>{formatBillingDate(currentSummary.currentPeriodEnd, locale)}</dd>
            </div>
          ) : null}
        </dl>
        {currentSummary.cancelAtPeriodEnd ? (
          <p className="billing-canceling">{copy.canceling}</p>
        ) : null}
      </div>

      {currentSummary.hasProAccess ? (
        <div className="billing-active-plan">
          <CheckCircle weight="fill" aria-hidden="true" />
          <div>
            <strong>
              {copy.pro}
              {activePrice ? ` · ${activePrice}` : ""}
            </strong>
            <p>
              {currentSummary.status === "trialing" ? copy.trial : copy.activeAccess}
            </p>
          </div>
        </div>
      ) : canStartCheckout ? (
        <div className="billing-options">
          <fieldset>
            <legend>{copy.pro}</legend>
            <div className="billing-cycle-options">
              <button
                type="button"
                className={planKey === "monthly" ? "is-selected" : undefined}
                aria-pressed={planKey === "monthly"}
                onClick={() => setPlanKey("monthly")}
                disabled={pending !== null || billingUnavailable}
              >
                <span>{copy.monthly}</span>
                <strong>{copy.monthlyPrice}</strong>
              </button>
              <button
                type="button"
                className={planKey === "annual" ? "is-selected" : undefined}
                aria-pressed={planKey === "annual"}
                onClick={() => setPlanKey("annual")}
                disabled={pending !== null || billingUnavailable}
              >
                <span>{copy.annual}</span>
                <strong>{copy.annualPrice}</strong>
                <small>{copy.annualNote}</small>
              </button>
            </div>
          </fieldset>
          <p className="billing-trial">
            {currentSummary.trialEligible ? copy.trial : copy.noTrial}
          </p>
          <p className="billing-purchase-boundary">
            {renewalCopy} {copy.softwareOnly}
          </p>
          <button
            className="billing-submit"
            type="button"
            disabled={pending !== null || billingUnavailable}
            onClick={() => void openBilling("checkout")}
          >
            {pending === "checkout" ? <SpinnerGap className="is-spinning" aria-hidden="true" /> : <CreditCard aria-hidden="true" />}
            {currentSummary.trialEligible
              ? copy.subscribe
              : copy.subscribeWithoutTrial}
          </button>
        </div>
      ) : (
        <div className="billing-active-plan" role="status">
          <CreditCard aria-hidden="true" />
          <div>
            <strong>{copy.billingActionTitle}</strong>
            <p>
              {billingUnavailable ? copy.unavailable : copy.billingActionCopy}
            </p>
          </div>
        </div>
      )}

      <div className="billing-footer">
        <p>{copy.privacy}</p>
        <div>
          <Link href={workspaceHref}>{copy.backWorkspace}</Link>
          {showManage ? (
            <button
              type="button"
              className="billing-manage"
              disabled={pending !== null}
              onClick={() => void openBilling("portal")}
            >
              {pending === "portal" ? <SpinnerGap className="is-spinning" aria-hidden="true" /> : <CreditCard aria-hidden="true" />}
              {copy.manage}
            </button>
          ) : null}
        </div>
      </div>
      <p
        className={`billing-live-message${error ? " is-error" : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {pending
          ? copy.processing
          : error ?? notice ?? (billingUnavailable ? copy.unavailable : null)}
      </p>
    </section>
  );
}

async function fetchBillingSummary(): Promise<BillingSummary | null> {
  try {
    const response = await fetch("/api/billing/summary", {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    return parseBillingView(await response.json());
  } catch {
    return null;
  }
}

function formatBillingDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
