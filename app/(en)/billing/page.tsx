import type { Metadata } from "next";
import { BillingPage } from "@/app/components/BillingPage";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { getBillingSummary } from "@/lib/billing/server";
import { getUiCopy } from "@/lib/i18n";

const copy = getUiCopy("en");

export const metadata: Metadata = {
  title: `${copy.billing.title} · ClearTag`,
  description: copy.billing.intro,
  robots: { index: false, follow: false },
};

export default async function EnglishBillingPage() {
  const user = await requireAuthenticatedUser("/billing");
  const summary = await getBillingSummary(user);
  return <BillingPage locale="en" summary={summary} />;
}
