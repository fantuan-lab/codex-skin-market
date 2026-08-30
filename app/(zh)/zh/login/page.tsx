import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPage } from "@/app/components/AuthPage";
import { safeReturnPath } from "@/lib/auth/paths";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { getUiCopy } from "@/lib/i18n";

type LoginSearchParams = {
  error?: string | string[];
  next?: string | string[];
  returnTo?: string | string[];
};

const copy = getUiCopy("zh");

export const metadata: Metadata = {
  title: `${copy.auth.title} · ClearTag`,
  description: copy.auth.intro,
  robots: { index: false, follow: false },
};

export default async function ChineseLoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<LoginSearchParams> }>) {
  const query = await searchParams;
  const next = safeReturnPath(
    firstQueryValue(query.returnTo) ?? firstQueryValue(query.next),
    "/zh/workspace",
  );
  const user = await getAuthenticatedUser();

  if (user) redirect(next);
  return (
    <AuthPage
      locale="zh"
      next={next}
      error={firstQueryValue(query.error)}
    />
  );
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
