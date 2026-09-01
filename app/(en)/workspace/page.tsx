import type { Metadata } from "next";
import { AuthenticatedWorkspace } from "@/app/components/AuthenticatedWorkspace";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { getBillingSummary } from "@/lib/billing/server";
import { getUiCopy } from "@/lib/i18n";

const copy = getUiCopy("en");

export const metadata: Metadata = {
  title: `${copy.account.title} · ClearTag`,
  description: copy.account.intro,
  robots: { index: false, follow: false },
};

export default async function EnglishWorkspacePage() {
  const user = await requireAuthenticatedUser("/workspace");
  const billing = await getBillingSummary(user);
  return (
    <AuthenticatedWorkspace
      locale="en"
      userEmail={user.email}
      billing={billing}
    />
  );
}
