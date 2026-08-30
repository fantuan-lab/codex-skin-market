import type { Metadata } from "next";
import { AuthenticatedWorkspace } from "@/app/components/AuthenticatedWorkspace";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { getUiCopy } from "@/lib/i18n";

const copy = getUiCopy("zh");

export const metadata: Metadata = {
  title: `${copy.account.title} · ClearTag`,
  description: copy.account.intro,
  robots: { index: false, follow: false },
};

export default async function ChineseWorkspacePage() {
  const user = await requireAuthenticatedUser("/zh/workspace");
  return <AuthenticatedWorkspace locale="zh" userEmail={user.email} />;
}
